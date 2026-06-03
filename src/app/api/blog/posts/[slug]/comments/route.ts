import { jwtDecode } from "jwt-decode";
import { getSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type UserPayload = {
  sub: string;
  [key: string]: unknown;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = getSupabasePublicClient();
    if (!supabase) {
      return Response.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    // Get the post to get its ID
    const { data: post, error: postError } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .single();

    if (postError || !post) {
      return Response.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Get comments (only approved ones for non-auth users)
    const { data: comments, error: commentError } = await supabase
      .from("blog_comments")
      .select("id, content, created_at, author:author_id(name)")
      .eq("post_id", post.id)
      .eq("approved", true)
      .order("created_at", { ascending: false });

    if (commentError) {
      console.error("Error loading comments:", commentError);
      return Response.json(
        { error: "Failed to load comments" },
        { status: 500 }
      );
    }

    return Response.json({ comments: comments || [] });
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { content } = (await request.json()) as { content?: string };

    if (!content || !content.trim()) {
      return Response.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    const supabaseServer = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Get the post to get its ID
    const { data: post, error: postError } = await supabaseServer
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .single();

    if (postError || !post) {
      return Response.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Create comment
    const { error: insertError } = await supabaseServer
      .from("blog_comments")
      .insert({
        post_id: post.id,
        author_id: userId,
        content: content.trim(),
        approved: true, // Auto-approve for now (can add moderation later)
      });

    if (insertError) {
      console.error("Error creating comment:", insertError);
      return Response.json(
        { error: "Failed to post comment" },
        { status: 500 }
      );
    }

    // Return updated comments list
    const { data: comments } = await supabaseServer
      .from("blog_comments")
      .select("id, content, created_at, author:author_id(name)")
      .eq("post_id", post.id)
      .eq("approved", true)
      .order("created_at", { ascending: false });

    return Response.json(
      { comments: comments || [], success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
