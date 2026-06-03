import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/chatbot/db";

export async function POST(request: NextRequest) {
  try {
    const { password } = (await request.json()) as { password?: string };

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Mật khẩu phải có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        success: true,
        message: "Đặt lại mật khẩu mô phỏng thành công (chưa cấu hình Supabase).",
      });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    // Get the current logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    let profile = null;

    if (user) {
      profile = await getUserProfile(
        user.id,
        user.user_metadata?.name || "Khách",
        user.email || ""
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đặt lại mật khẩu thành công.",
      profile,
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi xử lý yêu cầu." },
      { status: 500 }
    );
  }
}

async function getUserProfile(userId: string, fallbackName: string, email: string) {
  const supabase = getSupabaseAdminClient();
  const fallbackProfile = {
    id: userId,
    name: fallbackName,
    email,
    phone: "",
    address: "",
    role: "user",
  };

  if (!supabase) {
    return fallbackProfile;
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, name, email, phone, address, role")
    .eq("id", userId)
    .maybeSingle();

  if (!data) {
    return fallbackProfile;
  }

  return {
    id: data.id,
    name: data.name || fallbackName,
    email: data.email || email,
    phone: data.phone || "",
    address: data.address || "",
    role: data.role || "user",
  };
}
