import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export type AuthPayload = {
  sub: string;
  [key: string]: unknown;
};

export type ReviewUser = {
  id: string;
  name: string;
  role?: string;
};

export async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
  });
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getCurrentUser(request: Request): Promise<ReviewUser | null> {
  const user = await getAuthUser();
  const userId = user?.id;

  if (!userId) {
    return null;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() {}
    }
  });
  const { data } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", userId)
    .single();

  if (!data) {
    return null;
  }

  return data as ReviewUser;
}

export async function isAdminUser(request: Request) {
  const user = await getCurrentUser(request);
  return user?.role === "admin";
}
