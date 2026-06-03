"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as { success: boolean; message: string };
      if (!response.ok || !data.success) {
        throw new Error(data.message);
      }

      setMessage(data.message);
      setEmail("");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Gửi yêu cầu thất bại.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl gap-8 px-6 py-10 sm:px-10 lg:grid-cols-2 lg:px-12">
      <div className="hidden overflow-hidden rounded-[2rem] bg-[url('/images/dalat3.png')] bg-cover bg-center lg:block" />
      <form onSubmit={handleSubmit} className="rounded-[2rem] border border-pine-500/10 bg-white p-8 shadow-[0_20px_60px_rgba(26,47,15,0.08)] flex flex-col justify-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pine-700">Khôi phục mật khẩu</p>
          <h1 className="mt-4 font-display text-5xl text-pine-900">Quên mật khẩu?</h1>
          <p className="mt-3 text-sm text-smoke">
            Nhập email tài khoản của bạn. Chúng tôi sẽ gửi cho bạn một liên kết để tạo mật khẩu mới.
          </p>

          <div className="mt-8 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-charcoal">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 w-full rounded-full border border-pine-500/15 px-5 text-sm outline-none focus:border-pine-500"
                placeholder="email@example.com"
              />
            </label>
          </div>

          {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          {message ? <p className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800">{message}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 w-full sm:w-auto rounded-full bg-pine-700 px-6 py-3 text-sm font-semibold text-cream transition hover:bg-pine-900 disabled:opacity-60"
          >
            {isLoading ? "Đang gửi yêu cầu..." : "Gửi liên kết khôi phục"}
          </button>

          <p className="mt-6 text-sm text-smoke">
            Quay lại trang <Link href="/login" className="font-semibold text-pine-700">Đăng nhập</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
