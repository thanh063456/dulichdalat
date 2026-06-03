"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FormState = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as { success: boolean; message: string };
      if (!response.ok || !data.success) {
        throw new Error(data.message);
      }

      if (typeof window !== "undefined") {
        const profileData = (data as { profile?: { id: string; name: string; email: string; phone: string; address: string; role: string } }).profile;
        if (profileData) {
          window.localStorage.setItem("dalat_user", JSON.stringify(profileData));
          console.log("[Login] Saved user to localStorage:", profileData);
          window.dispatchEvent(new Event("dalat-user-changed"));
        }
      }

      router.push("/");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Đăng nhập thất bại.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl gap-8 px-6 py-10 sm:px-10 lg:grid-cols-2 lg:px-12">
      <div className="hidden overflow-hidden rounded-[2rem] bg-[url('/images/dalat4.png')] bg-cover bg-center lg:block" />
      <form onSubmit={handleSubmit} className="rounded-[2rem] border border-pine-500/10 bg-white p-8 shadow-[0_20px_60px_rgba(26,47,15,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pine-700">Đăng nhập</p>
        <h1 className="mt-4 font-display text-5xl text-pine-900">Chào mừng quay lại</h1>
        <p className="mt-3 text-sm text-smoke">Sử dụng tài khoản của bạn để lưu lịch trình, chat và đặt chỗ.</p>

        <div className="mt-8 space-y-4">
          <Field label="Email" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
          <div>
            <Field label="Mật khẩu" type="password" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} />
            <div className="mt-2 text-right">
              <Link href="/forgot-password" className="text-xs font-semibold text-pine-700 hover:text-pine-900 transition">
                Quên mật khẩu?
              </Link>
            </div>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-6 rounded-full bg-pine-700 px-6 py-3 text-sm font-semibold text-cream transition hover:bg-pine-900 disabled:opacity-60"
        >
          {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <p className="mt-6 text-sm text-smoke">
          Chưa có tài khoản? <Link href="/register" className="font-semibold text-pine-700">Đăng ký ngay</Link>
        </p>
      </form>
    </div>
  );
}

function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-charcoal">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-full border border-pine-500/15 px-5 text-sm outline-none focus:border-pine-500"
      />
    </label>
  );
}