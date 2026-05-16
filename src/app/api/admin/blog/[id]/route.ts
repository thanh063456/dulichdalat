import { jwtDecode } from "jwt-decode";
import { getSupabasePublicClient } from "@/lib/supabase/public";

type UserPayload = {
  sub: string;
  [key: string]: unknown;
};

async function getAuthUser(request: Request): Promise<string | null> {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((c) => c.split("=").slice(0, 2) as [string, string])
    );

    const sbAuthToken = cookies["sb-auth-token"];
    if (!sbAuthToken) {
      return null;
    }

    const decoded = jwtDecode<UserPayload>(sbAuthToken);
    return decoded.sub;
  } catch {
    return null;
  }
}

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = getSupabasePublicClient();
  if (!supabase) {
    return false;
  }

  try {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    return data?.role === "admin";
  } catch {
    return false;
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getAuthUser(request);

    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = await isAdmin(userId);
    if (!admin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getSupabasePublicClient();
    if (!supabase) {
      return Response.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    const body = (await request.json()) as {
      title?: string;
      content?: string;
      excerpt?: string;
      cover_image?: string;
      tags?: string[];
      published?: boolean;
    };

    const { error } = await supabase
      .from("blog_posts")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
        published_at: body.published ? new Date().toISOString() : null,
      })
      .eq("id", parseInt(id));

    if (error) {
      console.error("Supabase error:", error);
      return Response.json(
        { error: "Failed to update post" },
        { status: 500 }
      );
    }

    const { data } = await supabase
      .from("blog_posts")
      .select()
      .eq("id", parseInt(id))
      .single();

    return Response.json({ post: data });
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getAuthUser(request);

    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = await isAdmin(userId);
    if (!admin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getSupabasePublicClient();
    if (!supabase) {
      return Response.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    const { error } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      console.error("Supabase error:", error);
      return Response.json(
        { error: "Failed to delete post" },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
