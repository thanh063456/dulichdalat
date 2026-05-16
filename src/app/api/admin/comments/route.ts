import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/chatbot/db";
import { getCurrentUser } from "@/lib/reviews";

export const dynamic = "force-dynamic";

type CommentRow = {
  id: number;
  post_id: number;
  author_id: string;
  content: string;
  approved: boolean;
  created_at: string;
};

async function requireAdmin(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "admin") {
    return null;
  }
  return user;
}

export async function GET(request: NextRequest) {
  const user = await requireAdmin(request);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ comments: [] });
  }

  const [commentsRes, postsRes, profilesRes] = await Promise.all([
    supabase.from("blog_comments").select("id, post_id, author_id, content, approved, created_at").order("created_at", { ascending: false }),
    supabase.from("blog_posts").select("id, title, slug"),
    supabase.from("profiles").select("id, name"),
  ]);

  if (commentsRes.error || postsRes.error || profilesRes.error) {
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }

  const comments = (commentsRes.data ?? []) as CommentRow[];
  const postMap = new Map<number, { title: string; slug: string }>();
  const profileMap = new Map<string, string>();

  (postsRes.data ?? []).forEach((post) => postMap.set(post.id, { title: post.title, slug: post.slug }));
  (profilesRes.data ?? []).forEach((profile) => profileMap.set(profile.id, profile.name));

  return NextResponse.json({
    comments: comments.map((comment) => ({
      ...comment,
      post_title: postMap.get(comment.post_id)?.title ?? `Bài viết #${comment.post_id}`,
      post_slug: postMap.get(comment.post_id)?.slug ?? "",
      author_name: profileMap.get(comment.author_id) ?? "Ẩn danh",
    })),
  });
}
