import { jwtDecode } from "jwt-decode";
import { getSupabasePublicClient } from "@/lib/supabase/public";

type UserPayload = {
  sub: string;
  [key: string]: unknown;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

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

export async function POST(request: Request) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = await isAdmin(userId);
    if (!admin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      title?: string;
      content?: string;
      excerpt?: string;
      cover_image?: string;
      tags?: string[];
      published?: boolean;
    };

    const { title, content, excerpt, cover_image, tags, published } = body;

    if (!title || !content || !excerpt) {
      return Response.json(
        { error: "Title, content, and excerpt are required" },
        { status: 400 }
      );
    }

    const slug = slugify(title);

    const supabase = getSupabasePublicClient();
    if (!supabase) {
      return Response.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    // Check if slug already exists
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return Response.json(
        { error: "A post with this title already exists" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        author_id: userId,
        slug,
        title,
        content,
        excerpt,
        cover_image: cover_image || "",
        tags: tags || [],
        published: published || false,
        published_at: published ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return Response.json(
        { error: "Failed to create post" },
        { status: 500 }
      );
    }

    return Response.json({ post: data }, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
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

    // Return all posts for admin
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, title, slug, excerpt, content, cover_image, tags, published, created_at, author:author_id(name)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return Response.json(
        { error: "Failed to load posts" },
        { status: 500 }
      );
    }

    return Response.json({ posts: data || [] });
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
