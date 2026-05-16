import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/chatbot/db";

const requestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Dữ liệu đăng nhập không hợp lệ." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ success: true, message: "Đăng nhập mô phỏng thành công (chưa cấu hình Supabase)." });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {}
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (isDevAuthAutoConfirmEnabled() && error.message.toLowerCase().includes("email not confirmed")) {
      const confirmed = await confirmUserEmail(parsed.data.email);

      if (confirmed) {
        const retry = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });

        if (!retry.error && retry.data.user) {
          return NextResponse.json({
            success: true,
            message: "Đăng nhập thành công.",
            user: retry.data.user,
            profile: await getUserProfile(retry.data.user.id, retry.data.user.user_metadata?.name || "Khách", retry.data.user.email || parsed.data.email),
            session: retry.data.session,
          });
        }

        return NextResponse.json({ success: false, message: retry.error?.message || "Không thể đăng nhập." });
      }
    }

    // Return application-level error (200) so frontend can display message
    // without producing a network-level 4xx in the browser console.
    return NextResponse.json({ success: false, message: error.message });
  }

  return NextResponse.json({
    success: true,
    message: "Đăng nhập thành công.",
    user: data.user,
    profile: await getUserProfile(data.user.id, data.user.user_metadata?.name || "Khách", data.user.email || parsed.data.email),
    session: data.session,
  });
}

function isDevAuthAutoConfirmEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.SUPABASE_DISABLE_EMAIL_CONFIRMATION === "true";
}

async function confirmUserEmail(email: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error) {
    return false;
  }

  const matchedUser = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (!matchedUser) {
    return false;
  }

  const updateResult = await supabase.auth.admin.updateUserById(matchedUser.id, {
    email_confirm: true,
  });

  return !updateResult.error;
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