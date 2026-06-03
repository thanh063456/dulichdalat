import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/chatbot/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabaseServer = await createSupabaseServerClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as { status?: string };
    if (body.status !== "cancelled") {
      return NextResponse.json({ success: false, message: "Yêu cầu thay đổi trạng thái không hợp lệ." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, message: "Không thể kết nối cơ sở dữ liệu." }, { status: 500 });
    }

    // Update status to 'cancelled' only if it belongs to this user and is 'pending' or 'confirmed'
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error(`Error cancelling booking ID ${id}:`, error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    // Insert an admin notification for the cancellation
    try {
      await supabase.from("admin_notifications").insert({
        type: "booking_cancelled",
        title: "Hủy đặt chỗ",
        message: `${data.customer_name} vừa hủy yêu cầu đặt ${data.place_name}`,
        booking_id: data.id,
      });
    } catch (notifErr) {
      console.error("Failed to insert admin notification for cancellation:", notifErr);
    }

    return NextResponse.json({ success: true, booking: data });
  } catch (err) {
    console.error("PATCH booking route error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
