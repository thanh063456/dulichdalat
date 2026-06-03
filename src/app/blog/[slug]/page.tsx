"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

type BlogPost = {
  id: number;
  title: string;
  content: string;
  cover_image: string;
  author?: { name: string; id: string } | null;
  created_at: string;
  updated_at: string;
  tags: string[];
  view_count: number;
  slug: string;
};

type BlogComment = {
  id: number;
  content: string;
  author?: { name: string } | null;
  created_at: string;
};

type RelatedPost = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
};

type UserData = { id: string; name: string };

function subscribeToUserStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getUserSnapshot() {
  return window.localStorage.getItem("dalat_user");
}

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const userSnapshot = useSyncExternalStore(subscribeToUserStorage, getUserSnapshot, () => null);
  const user = useMemo<UserData | null>(() => {
    if (!userSnapshot) return null;

    try {
      return JSON.parse(userSnapshot) as UserData;
    } catch {
      return null;
    }
  }, [userSnapshot]);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;

    async function loadPost() {
      try {
        const [postRes, commentsRes, relatedRes] = await Promise.all([
          fetch(`/api/blog/posts/${slug}`),
          fetch(`/api/blog/posts/${slug}/comments`),
          fetch(`/api/blog/posts/${slug}/related`),
        ]);

        if (!postRes.ok) {
          router.push("/blog");
          return;
        }

        const postData = (await postRes.json()) as { post?: BlogPost };
        setPost(postData.post || null);

        if (commentsRes.ok) {
          const commentsData = (await commentsRes.json()) as {
            comments?: BlogComment[];
          };
          setComments(commentsData.comments || []);
        }

        if (relatedRes.ok) {
          const relatedData = (await relatedRes.json()) as {
            related?: RelatedPost[];
          };
          setRelatedPosts(relatedData.related || []);
        }
      } catch (error) {
        console.error("Error loading post:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadPost();
  }, [slug, router]);

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !post) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/blog/posts/${post.slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: comment }),
      });

      if (response.ok) {
        setComment("");
        const data = (await response.json()) as { comments?: BlogComment[] };
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10 text-center">
        <p className="text-smoke">Đang tải bài viết...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10 text-center">
        <p className="text-smoke">Không tìm thấy bài viết.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-12">
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <article className="lg:col-span-2">
          {/* Cover Image */}
          <div className="relative h-96 w-full overflow-hidden rounded-3xl border border-pine-500/10 bg-stone-100">
            <img
              src={post.cover_image}
              alt={post.title}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Header */}
          <div className="mt-8">
            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-pine-500/10 px-3 py-1 text-sm font-semibold text-pine-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <h1 className="font-display text-4xl text-pine-900">{post.title}</h1>

            {/* Meta */}
            <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-b border-pine-500/10 py-4 text-sm text-smoke">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{post.author?.name || "Ẩn danh"}</span>
              </div>
              <time>{new Date(post.created_at).toLocaleDateString("vi-VN")}</time>
              <span>👁️ {post.view_count} lượt xem</span>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-sm mt-8 max-w-none prose-headings:font-display prose-headings:text-pine-900 prose-a:text-pine-700 hover:prose-a:text-pine-900 prose-strong:text-charcoal prose-img:rounded-lg">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>

          {/* Comments Section */}
          <section className="mt-12 border-t border-pine-500/10 pt-8">
            <h2 className="font-heading text-2xl text-pine-900">Bình Luận</h2>

            {/* Comments List */}
            <div className="mt-6 space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-smoke italic">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
              ) : (
                comments.map((cmt) => (
                  <div key={cmt.id} className="rounded-lg border border-pine-500/10 bg-stone-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-charcoal">{cmt.author?.name || "Ẩn danh"}</p>
                      <time className="text-xs text-smoke">
                        {new Date(cmt.created_at).toLocaleDateString("vi-VN")}
                      </time>
                    </div>
                    <p className="mt-2 text-sm text-charcoal">{cmt.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <div className="mt-8 rounded-lg border border-pine-500/10 bg-white p-6">
              {user ? (
                <form onSubmit={handleSubmitComment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal">Bình luận của bạn</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Chia sẻ suy nghĩ của bạn..."
                      rows={4}
                      className="mt-2 w-full rounded-lg border-2 border-pine-500/20 px-4 py-2 outline-none transition focus:border-pine-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-full bg-pine-700 px-6 py-2 text-sm font-semibold text-cream transition hover:bg-pine-900 disabled:opacity-50"
                  >
                    {submitting ? "Đang gửi..." : "Gửi bình luận"}
                  </button>
                </form>
              ) : (
                <p className="text-sm text-smoke">
                  <Link href="/login" className="font-semibold text-pine-700 hover:text-pine-900">
                    Đăng nhập
                  </Link>{" "}
                  để bình luận
                </p>
              )}
            </div>
          </section>
        </article>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="rounded-3xl border border-pine-500/10 bg-white/80 p-6 shadow-[0_16px_42px_rgba(26,47,15,0.06)]">
              <h3 className="font-heading text-xl text-pine-900">Bài Liên Quan</h3>
              <div className="mt-4 space-y-4">
                {relatedPosts.map((relPost) => (
                  <Link
                    key={relPost.id}
                    href={`/blog/${relPost.slug}`}
                    className="group block rounded-lg border border-pine-500/10 p-3 transition hover:bg-pine-500/5"
                  >
                    <p className="text-sm font-semibold text-charcoal group-hover:text-pine-700 line-clamp-2">
                      {relPost.title}
                    </p>
                    <p className="mt-1 text-xs text-smoke line-clamp-1">{relPost.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back to Blog */}
          <Link
            href="/blog"
            className="inline-flex items-center rounded-full border-2 border-pine-500/20 px-6 py-3 text-sm font-semibold text-charcoal transition hover:bg-pine-500/5"
          >
            ← Quay lại Blog
          </Link>
        </aside>
      </div>
    </div>
  );
}

