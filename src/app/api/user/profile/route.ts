import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập để truy cập." },
        { status: 401 }
      );
    }

    const { data: profile, error: dbError } = await supabase
      .from("profiles")
      .select("id, name, email, phone, address, role")
      .eq("id", user.id)
      .maybeSingle();

    if (dbError) {
      return NextResponse.json(
        { success: false, message: "Không thể lấy thông tin hồ sơ." },
        { status: 500 }
      );
    }

    const avatarUrl = user.user_metadata?.avatar_url || "";

    const mergedProfile = profile
      ? { ...profile, avatar_url: avatarUrl }
      : {
          id: user.id,
          name: user.user_metadata?.name || "Khách",
          email: user.email || "",
          phone: "",
          address: "",
          role: "user",
          avatar_url: avatarUrl,
        };

    return NextResponse.json({ success: true, profile: mergedProfile });
  } catch (err) {
    console.error("GET user profile error:", err);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }

    const { name, phone, address, avatar_url } = (await request.json()) as {
      name?: string;
      phone?: string;
      address?: string;
      avatar_url?: string;
    };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Họ tên không được để trống." },
        { status: 400 }
      );
    }

    // Update user metadata in Auth
    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: {
        name: name.trim(),
        avatar_url: (avatar_url || "").trim(),
      },
    });

    if (authUpdateError) {
      console.error("Auth metadata update error:", authUpdateError);
    }

    // Update profile in DB
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        name: name.trim(),
        email: user.email || "",
        phone: (phone || "").trim(),
        address: (address || "").trim(),
        updated_at: new Date().toISOString(),
      })
      .select("id, name, email, phone, address, role")
      .single();

    if (updateError) {
      console.error("Update profile error:", updateError);
      return NextResponse.json(
        { success: false, message: "Không thể cập nhật hồ sơ trong cơ sở dữ liệu." },
        { status: 500 }
      );
    }

    // Fetch updated user to get the latest metadata
    const { data: { user: updatedUser } } = await supabase.auth.getUser();

    const mergedProfile = {
      ...updatedProfile,
      avatar_url: updatedUser?.user_metadata?.avatar_url || "",
    };

    return NextResponse.json({
      success: true,
      message: "Cập nhật hồ sơ thành công.",
      profile: mergedProfile,
    });
  } catch (err) {
    console.error("PUT user profile error:", err);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ nội bộ." },
      { status: 500 }
    );
  }
}
