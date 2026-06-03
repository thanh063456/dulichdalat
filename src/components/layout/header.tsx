"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";

const navigation = [
  { href: "/", label: "Trang Chủ" },
  { href: "/places", label: "Khám Phá" },
  { href: "/blog", label: "Blog" },
];

type HeaderUser = {
  name: string;
  role: string;
  avatar_url?: string;
};

function readStoredUserSnapshot(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem("dalat_user") ?? "";
}

function subscribeToUserChanges(callback: () => void) {
  const handler = () => callback();

  window.addEventListener("storage", handler);
  window.addEventListener("dalat-user-changed", handler as EventListener);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("dalat-user-changed", handler as EventListener);
  };
}

export function Header() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const userSnapshot = useSyncExternalStore(subscribeToUserChanges, readStoredUserSnapshot, () => "");
  const user = useMemo<HeaderUser | null>(() => {
    if (!userSnapshot) {
      return null;
    }

    try {
      const parsed = JSON.parse(userSnapshot) as { name?: string; role?: string; avatar_url?: string } | null;
      if (!parsed?.name) {
        return null;
      }

      return {
        name: parsed.name,
        role: parsed.role || "user",
        avatar_url: parsed.avatar_url || "",
      };
    } catch {
      return null;
    }
  }, [userSnapshot]);
  const navigationItems = [
    ...navigation,
    ...(user?.role === "admin"
      ? [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/admin/bookings", label: "Quản Lý" },
        ]
      : []),
    ...(user
      ? [
          { href: "/yeu-thich", label: "Yêu Thích" },
          { href: "/profile", label: "Hồ Sơ" },
        ]
      : []),
  ];

  function handleLogout() {
    window.localStorage.removeItem("dalat_user");
    window.dispatchEvent(new Event("dalat-user-changed"));
    setIsOpen(false);
    router.push("/login");
  }

  function handleLogoutConfirm() {
    const shouldLogout = window.confirm("Bạn có chắc muốn đăng xuất không?");
    if (!shouldLogout) {
      return;
    }

    handleLogout();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-pine-500/10 bg-cream/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-6 sm:px-10 lg:px-12">
        <Link href="/" className="group flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pine-900 text-lg font-bold text-cream shadow-lg shadow-pine-900/20">
            DL
          </div>
          <div>
            <p className="font-display text-3xl tracking-[0.3em] text-pine-900">ĐÀ LẠT</p>
            <p className="text-xs uppercase tracking-[0.28em] text-smoke">
              1500m · Ngàn Hoa · Sương Mù
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-charcoal transition hover:text-pine-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <div className="flex items-center gap-3 rounded-full border border-pine-500/20 bg-white px-4 py-1.5 text-left shadow-sm">
              <Link href="/profile" className="flex items-center gap-3 transition hover:opacity-80">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="h-9 w-9 rounded-full object-cover border border-pine-500/10 bg-cream"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pine-900 text-sm font-bold text-cream">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-pine-900 leading-tight">{user.name}</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-smoke mt-0.5">{user.role}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={handleLogoutConfirm}
                className="rounded-full border border-pine-500/20 px-3 py-1 text-xs font-semibold text-pine-700 transition hover:bg-pine-500/5"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-pine-500/20 px-5 py-2.5 text-sm font-semibold text-pine-900 transition hover:border-pine-500/40 hover:bg-pine-500/5"
            >
              Đăng nhập
            </Link>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-pine-500/20 text-pine-900 lg:hidden"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
          aria-label="Mở menu điều hướng"
        >
          <span className="sr-only">Menu</span>
          <span className="flex flex-col gap-1.5">
            <span className="h-0.5 w-5 rounded-full bg-current" />
            <span className="h-0.5 w-5 rounded-full bg-current" />
            <span className="h-0.5 w-5 rounded-full bg-current" />
          </span>
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-pine-500/10 bg-cream px-6 py-5 lg:hidden sm:px-10">
          <nav className="mx-auto flex max-w-7xl flex-col gap-4">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl px-4 py-3 text-base font-medium text-charcoal transition hover:bg-pine-500/5 hover:text-pine-700"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-3">
              {user ? (
                <div className="flex flex-1 items-center justify-between rounded-full border border-pine-500/20 bg-white px-4 py-2 text-sm font-semibold text-pine-900">
                  <Link href="/profile" className="flex items-center gap-3" onClick={() => setIsOpen(false)}>
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="h-8 w-8 rounded-full object-cover border border-pine-500/10 bg-cream"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pine-900 text-xs font-bold text-cream">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="leading-none">
                      {user.name} · {user.role}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogoutConfirm}
                    className="rounded-full border border-pine-500/20 px-3 py-1 text-xs font-semibold text-pine-700"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex-1 rounded-full border border-pine-500/20 px-5 py-3 text-center text-sm font-semibold text-pine-900"
                  onClick={() => setIsOpen(false)}
                >
                  Đăng nhập
                </Link>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}