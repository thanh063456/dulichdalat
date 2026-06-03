import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/chatbot/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  place_name: z.string().min(2),
  type: z.enum(["room", "table"]),
  customer_name: z.string().min(2),
  phone: z.string().min(8),
  date_in: z.string().min(1),
  date_out: z.string().optional().nullable(),
  time: z.string().optional().nullable(),
  guests: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Dữ liệu đặt chỗ không hợp lệ." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ success: true, message: "Đặt chỗ thành công!" });
  }

  let userId: string | null = null;
  try {
    const supabaseServer = await createSupabaseServerClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (user) {
      userId = user.id;
    }
  } catch (err) {
    console.error("Error fetching user in booking route:", err);
  }

  const bookingInsert = await supabase
    .from("bookings")
    .insert({
      ...parsed.data,
      user_id: userId,
    })
    .select()
    .single();

  if (bookingInsert.error) {
    return NextResponse.json({ success: false, message: bookingInsert.error.message }, { status: 400 });
  }

  await supabase.from("admin_notifications").insert({
    type: "new_booking",
    title: "Đặt chỗ mới",
    message: `${parsed.data.customer_name} vừa đặt ${parsed.data.place_name}`,
    booking_id: bookingInsert.data.id,
  });

  return NextResponse.json({ success: true, message: "Đặt chỗ thành công!" });
}