import { getBlogPostBySlug } from "@/lib/blog";
import { getSupabasePublicClient } from "@/lib/supabase/public";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const data = await getBlogPostBySlug(slug);

    if (!data) {
      return Response.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    if (data.id < 1000) {
      const supabase = getSupabasePublicClient();
      if (!supabase) {
        return Response.json({ error: "Supabase is not configured" }, { status: 500 });
      }
      await supabase
        .from("blog_posts")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", data.id);
    }

    return Response.json({ post: data });
  } catch (error) {
    console.error("Error loading post:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
