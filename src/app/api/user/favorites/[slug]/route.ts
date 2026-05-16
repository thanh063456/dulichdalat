import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/chatbot/db";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const authUser = await getAuthUser();
  const userId = authUser?.id;
  const supabase = getSupabaseAdminClient();

  if (!userId || !supabase) {
    return NextResponse.json({ success: false, message: "Bạn cần đăng nhập để xóa yêu thích." }, { status: 401 });
  }

  const del = await supabase.from("place_favorites").delete().eq("place_slug", slug).eq("user_id", userId);

  if (del.error) {
    return NextResponse.json({ success: false, message: del.error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
