"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

type UserData = { role?: string };

type CommentRow = {
  id: number;
  post_id: number;
  post_title: string;
  post_slug: string;
  author_name: string;
  content: string;
  approved: boolean;
  created_at: string;
};

function subscribeToUserStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getUserSnapshot() {
  return window.localStorage.getItem("dalat_user");
}

export default function AdminCommentsPage() {
  const router = useRouter();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
    if (!user) {
      void router.push("/login");
      return;
    }
    if (user.role !== "admin") {
      void router.push("/");
    }
  }, [router, user]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;

    async function loadComments() {
      try {
        const response = await fetch("/api/admin/comments", { cache: "no-store", credentials: "include" });
        if (!response.ok) throw new Error("Failed to load comments");
        const data = (await response.json()) as { comments?: CommentRow[] };
        setComments(data.comments ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Không thể tải bình luận");
      } finally {
        setLoading(false);
      }
    }

    void loadComments();
  }, [user]);

  async function toggleComment(id: number, approved: boolean) {
    try {
      const response = await fetch(`/api/admin/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ approved }),
      });
      if (!response.ok) throw new Error("Failed to update comment");
      setComments((current) => current.map((comment) => (comment.id === id ? { ...comment, approved } : comment)));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Không thể cập nhật bình luận");
    }
  }

  async function deleteComment(id: number) {
    if (!window.confirm("Bạn chắc chắn muốn xóa bình luận này?")) return;

    try {
      const response = await fetch(`/api/admin/comments/${id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error("Failed to delete comment");
      setComments((current) => current.filter((comment) => comment.id !== id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không thể xóa bình luận");
    }
  }

  if (!user || user.role !== "admin") {
    return <div className="flex min-h-screen items-center justify-center text-smoke">Không có quyền truy cập.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
      <section className="rounded-4xl border border-pine-500/10 bg-white p-8 shadow-[0_20px_60px_rgba(26,47,15,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pine-700">Admin · Bình luận</p>
        <h1 className="mt-4 font-display text-5xl text-pine-900">Quản lý bình luận blog</h1>
        <p className="mt-3 text-sm leading-7 text-smoke">Duyệt, ẩn hoặc xóa bình luận của người đọc trên blog.</p>
      </section>

      {error ? <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="mt-8 space-y-4">
        {loading ? (
          <div className="rounded-3xl border border-pine-500/10 bg-white p-6 text-smoke">Đang tải bình luận...</div>
        ) : comments.length === 0 ? (
          <div className="rounded-3xl border border-pine-500/10 bg-white p-6 text-smoke">Chưa có bình luận nào.</div>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-3xl border border-pine-500/10 bg-white p-5 shadow-[0_12px_30px_rgba(26,47,15,0.05)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-2xl text-pine-900">{comment.post_title}</h2>
                    <Link href={`/blog/${comment.post_slug}`} className="text-sm font-semibold text-pine-700 hover:text-pine-900">Xem bài viết</Link>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${comment.approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {comment.approved ? "Đã duyệt" : "Chờ duyệt"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-smoke">{comment.author_name} · {new Date(comment.created_at).toLocaleDateString("vi-VN")}</p>
                  <p className="mt-3 max-w-4xl text-sm leading-7 text-charcoal">{comment.content}</p>
                </div>

                <div className="flex flex-wrap gap-3 lg:flex-col lg:items-end">
                  <button type="button" onClick={() => toggleComment(comment.id, !comment.approved)} className="rounded-full border border-pine-500/20 px-4 py-2 text-sm font-semibold text-pine-700 transition hover:bg-pine-500/5">
                    {comment.approved ? "Bỏ duyệt" : "Duyệt"}
                  </button>
                  <button type="button" onClick={() => deleteComment(comment.id)} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700">
                    Xóa
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
