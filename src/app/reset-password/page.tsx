"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      const data = (await response.json()) as {
        success: boolean;
        message: string;
        profile?: { id: string; name: string; email: string; role: string };
      };

      if (!response.ok || !data.success) {
        throw new Error(data.message);
      }

      setSuccess("Đặt lại mật khẩu thành công! Đang chuyển hướng...");

      // Update localStorage to remain logged in if profile returned
      if (typeof window !== "undefined" && data.profile) {
        window.localStorage.setItem("dalat_user", JSON.stringify(data.profile));
        window.dispatchEvent(new Event("dalat-user-changed"));
      }

      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Đặt lại mật khẩu thất bại.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl gap-8 px-6 py-10 sm:px-10 lg:grid-cols-2 lg:px-12">
      <div className="hidden overflow-hidden rounded-[2rem] bg-[url('/images/dalat1.png')] bg-cover bg-center lg:block" />
      <form onSubmit={handleSubmit} className="rounded-[2rem] border border-pine-500/10 bg-white p-8 shadow-[0_20px_60px_rgba(26,47,15,0.08)] flex flex-col justify-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pine-700">Tài khoản</p>
          <h1 className="mt-4 font-display text-5xl text-pine-900">Đặt lại mật khẩu</h1>
          <p className="mt-3 text-sm text-smoke">
            Nhập mật khẩu mới của bạn bên dưới để hoàn tất việc cập nhật bảo mật tài khoản.
          </p>

          <div className="mt-8 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-charcoal">Mật khẩu mới</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 w-full rounded-full border border-pine-500/15 px-5 text-sm outline-none focus:border-pine-500"
                placeholder="Tối thiểu 6 ký tự"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-charcoal">Xác nhận mật khẩu mới</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 w-full rounded-full border border-pine-500/15 px-5 text-sm outline-none focus:border-pine-500"
                placeholder="Nhập lại mật khẩu mới"
              />
            </label>
          </div>

          {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800">{success}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 w-full sm:w-auto rounded-full bg-pine-700 px-6 py-3 text-sm font-semibold text-cream transition hover:bg-pine-900 disabled:opacity-60"
          >
            {isLoading ? "Đang đặt lại mật khẩu..." : "Đặt lại mật khẩu"}
          </button>
        </div>
      </form>
    </div>
  );
}
