"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ProfileState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  avatar_url: string;
};

type BookingStatus = "pending" | "confirmed" | "cancelled";

type BookingRow = {
  id: number;
  place_name: string;
  type: "room" | "table";
  customer_name: string;
  phone: string;
  date_in: string;
  date_out: string | null;
  time: string | null;
  guests: number;
  status: BookingStatus;
  created_at: string;
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileState>({
    name: "",
    email: "",
    phone: "",
    address: "",
    role: "",
    avatar_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tabs and bookings state
  const [activeTab, setActiveTab] = useState<"profile" | "bookings">("profile");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const nameForSeed = profile.name || "user";
  const presets = [
    { name: "Phiêu lưu", url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(nameForSeed)}` },
    { name: "Hoạt hình", url: `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(nameForSeed)}` },
    { name: "Nét vẽ", url: `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(nameForSeed)}` },
    { name: "Emoji", url: `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(nameForSeed)}` },
  ];

  useEffect(() => {
    // Check if user is logged in locally first
    const localUser = window.localStorage.getItem("dalat_user");
    if (!localUser) {
      router.push("/login");
      return;
    }

    async function fetchProfile() {
      try {
        const response = await fetch("/api/user/profile", {
          credentials: "include",
        });

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        const data = (await response.json()) as {
          success: boolean;
          profile?: ProfileState;
          message?: string;
        };

        if (response.ok && data.success && data.profile) {
          setProfile(data.profile);
        } else {
          setError(data.message || "Không thể tải thông tin hồ sơ.");
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
        setError("Lỗi kết nối máy chủ.");
      } finally {
        setLoading(false);
      }
    }

    void fetchProfile();
  }, [router]);

  async function fetchBookings() {
    setBookingsLoading(true);
    setBookingsError(null);
    try {
      const response = await fetch("/api/user/bookings", { credentials: "include" });
      const data = (await response.json()) as {
        success: boolean;
        bookings?: BookingRow[];
        message?: string;
      };
      if (response.ok && data.success) {
        setBookings(data.bookings ?? []);
      } else {
        setBookingsError(data.message || "Không thể tải danh sách đặt chỗ.");
      }
    } catch (err) {
      console.error("Fetch bookings error:", err);
      setBookingsError("Lỗi kết nối máy chủ khi tải lịch sử đặt chỗ.");
    } finally {
      setBookingsLoading(false);
    }
  }

  async function handleCancelBooking(id: number) {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đặt chỗ này? Yêu cầu hủy sẽ không thể hoàn tác.")) {
      return;
    }

    setCancellingId(id);
    setBookingsError(null);
    try {
      const response = await fetch(`/api/user/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "cancelled" }),
      });

      const data = (await response.json()) as { success: boolean; message?: string };
      if (response.ok && data.success) {
        setBookings((current) =>
          current.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b))
        );
      } else {
        setBookingsError(data.message || "Không thể hủy đặt chỗ.");
      }
    } catch (err) {
      console.error("Cancel booking error:", err);
      setBookingsError("Lỗi kết nối máy chủ khi hủy booking.");
    } finally {
      setCancellingId(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          address: profile.address,
          avatar_url: profile.avatar_url,
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        message: string;
        profile?: ProfileState;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Cập nhật hồ sơ thất bại.");
      }

      setSuccess("Cập nhật hồ sơ thành công!");
      if (data.profile) {
        setProfile(data.profile);
        // Sync local storage cache
        window.localStorage.setItem("dalat_user", JSON.stringify(data.profile));
        window.dispatchEvent(new Event("dalat-user-changed"));
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Có lỗi xảy ra khi lưu.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-20 text-center">
        <p className="text-smoke">Đang tải thông tin hồ sơ...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl gap-8 px-6 py-10 sm:px-10 lg:grid lg:grid-cols-3 lg:px-12">
      {/* Sidebar Info card */}
      <div className="rounded-[2rem] border border-pine-500/10 bg-white p-8 shadow-[0_20px_60px_rgba(26,47,15,0.04)] mb-8 lg:mb-0 flex flex-col items-center text-center h-fit">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.name}
            className="h-24 w-24 rounded-full object-cover border-2 border-pine-500/20 shadow-lg bg-stone-50"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-pine-900 font-display text-4xl text-cream shadow-lg shadow-pine-900/10">
            {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}
          </div>
        )}
        <h2 className="mt-6 font-display text-3xl text-pine-900">{profile.name}</h2>
        <p className="mt-2 text-sm text-smoke font-medium">{profile.email}</p>
        <span className="mt-4 inline-flex items-center rounded-full bg-pine-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-pine-700">
          Vai trò: {profile.role}
        </span>

        {/* Tab switch buttons */}
        <div className="mt-8 w-full border-t border-pine-500/10 pt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`w-full rounded-full px-5 py-3 text-sm font-semibold transition text-left flex items-center gap-3 ${
              activeTab === "profile"
                ? "bg-pine-700 text-cream shadow-md shadow-pine-900/10"
                : "text-charcoal hover:bg-pine-500/5"
            }`}
          >
            👤 Thông tin cá nhân
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("bookings");
              void fetchBookings();
            }}
            className={`w-full rounded-full px-5 py-3 text-sm font-semibold transition text-left flex items-center gap-3 ${
              activeTab === "bookings"
                ? "bg-pine-700 text-cream shadow-md shadow-pine-900/10"
                : "text-charcoal hover:bg-pine-500/5"
            }`}
          >
            📅 Lịch sử đặt chỗ
          </button>
        </div>
      </div>

      {/* Main Container */}
      {activeTab === "profile" ? (
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 rounded-[2rem] border border-pine-500/10 bg-white p-8 shadow-[0_20px_60px_rgba(26,47,15,0.06)]"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pine-700">Cài đặt tài khoản</p>
          <h1 className="mt-4 font-display text-4xl text-pine-900">Hồ sơ cá nhân</h1>
          <p className="mt-3 text-sm text-smoke">Quản lý và cập nhật thông tin cá nhân của bạn tại đây.</p>

          <div className="mt-8 space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-charcoal">Họ tên</span>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile((curr) => ({ ...curr, name: e.target.value }))}
                required
                className="h-12 w-full rounded-full border border-pine-500/15 px-5 text-sm outline-none focus:border-pine-500"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-charcoal">Email (không thể thay đổi)</span>
              <input
                type="email"
                value={profile.email}
                disabled
                className="h-12 w-full rounded-full border border-pine-500/15 bg-stone-50 px-5 text-sm text-smoke outline-none cursor-not-allowed"
              />
            </label>

            {/* Avatar URL Selection */}
            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-charcoal">Đường dẫn ảnh đại diện (Avatar URL)</span>
                <input
                  type="url"
                  value={profile.avatar_url}
                  onChange={(e) => setProfile((curr) => ({ ...curr, avatar_url: e.target.value }))}
                  className="h-12 w-full rounded-full border border-pine-500/15 px-5 text-sm outline-none focus:border-pine-500"
                  placeholder="https://example.com/avatar.png"
                />
              </label>

              <div className="mt-2">
                <span className="text-xs font-semibold text-pine-700 uppercase tracking-wider block mb-2">
                  Hoặc chọn mẫu ảnh đại diện nhanh:
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {presets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProfile((curr) => ({ ...curr, avatar_url: p.url }))}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                        profile.avatar_url === p.url
                          ? "border-pine-700 bg-pine-500/10 text-pine-900"
                          : "border-pine-500/15 bg-white text-charcoal hover:bg-pine-500/5"
                      }`}
                    >
                      <img
                        src={p.url}
                        alt={p.name}
                        className="h-6 w-6 rounded-full border border-pine-500/10 bg-cream"
                      />
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-charcoal">Số điện thoại</span>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile((curr) => ({ ...curr, phone: e.target.value }))}
                className="h-12 w-full rounded-full border border-pine-500/15 px-5 text-sm outline-none focus:border-pine-500"
                placeholder="Nhập số điện thoại"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-charcoal">Địa chỉ</span>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile((curr) => ({ ...curr, address: e.target.value }))}
                className="h-12 w-full rounded-full border border-pine-500/15 px-5 text-sm outline-none focus:border-pine-500"
                placeholder="Nhập địa chỉ của bạn"
              />
            </label>
          </div>

          {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800">{success}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="mt-8 w-full sm:w-auto rounded-full bg-pine-700 px-8 py-3 text-sm font-semibold text-cream transition hover:bg-pine-900 disabled:opacity-60"
          >
            {saving ? "Đang lưu thay đổi..." : "Lưu hồ sơ"}
          </button>
        </form>
      ) : (
        <div className="lg:col-span-2 rounded-[2rem] border border-pine-500/10 bg-white p-8 shadow-[0_20px_60px_rgba(26,47,15,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pine-700">Giao dịch của bạn</p>
          <h1 className="mt-4 font-display text-4xl text-pine-900">Lịch sử đặt chỗ</h1>
          <p className="mt-3 text-sm text-smoke">Quản lý các homestay, nhà hàng/cà phê, và xe máy bạn đã đặt.</p>

          {bookingsError ? (
            <p className="mt-6 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{bookingsError}</p>
          ) : null}

          {bookingsLoading ? (
            <p className="mt-8 text-center text-sm text-smoke">Đang tải lịch sử đặt chỗ...</p>
          ) : bookings.length === 0 ? (
            <div className="mt-8 text-center py-12 border-2 border-dashed border-pine-500/10 rounded-[2rem] bg-stone-50/50">
              <span className="text-5xl block mb-4">📭</span>
              <p className="text-sm text-smoke font-medium">Bạn chưa thực hiện yêu cầu đặt chỗ nào.</p>
            </div>
          ) : (
            <div className="mt-8 space-y-6">
              {bookings.map((booking) => {
                const isBike =
                  booking.place_name.toLowerCase().includes("thuê xe") ||
                  booking.place_name.toLowerCase().includes("xe máy");
                const bookingTypeLabel = isBike ? "Thuê xe máy" : booking.type === "room" ? "Lưu trú" : "Đặt bàn";
                const isPending = booking.status === "pending";
                const isConfirmed = booking.status === "confirmed";
                const isCancelled = booking.status === "cancelled";

                return (
                  <div
                    key={booking.id}
                    className="rounded-3xl border border-pine-500/10 bg-stone-50/30 p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between transition-all hover:bg-stone-50"
                  >
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-pine-700 bg-pine-500/10 px-3 py-1 rounded-full">
                          {bookingTypeLabel}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                            isConfirmed
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                              : isCancelled
                              ? "bg-rose-500/10 text-rose-700 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                          }`}
                        >
                          {isConfirmed ? "Đã xác nhận" : isCancelled ? "Đã hủy" : "Chờ duyệt"}
                        </span>
                        <span className="text-xs text-smoke font-mono font-medium">Mã: #{booking.id}</span>
                      </div>

                      <h2 className="font-heading text-2xl text-pine-900 truncate">{booking.place_name}</h2>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-smoke mt-2">
                        <p>
                          <span className="font-semibold text-charcoal">Khách hàng:</span> {booking.customer_name}
                        </p>
                        <p>
                          <span className="font-semibold text-charcoal">Số điện thoại:</span> {booking.phone}
                        </p>
                        {isBike ? (
                          <>
                            <p>
                              <span className="font-semibold text-charcoal">Ngày thuê:</span> {formatDate(booking.date_in)}
                            </p>
                            <p>
                              <span className="font-semibold text-charcoal">Ngày trả:</span>{" "}
                              {booking.date_out ? formatDate(booking.date_out) : "Chưa trả"}
                            </p>
                            <p className="sm:col-span-2">
                              <span className="font-semibold text-charcoal">Số lượng:</span> {booking.guests} xe
                            </p>
                          </>
                        ) : (
                          <>
                            <p>
                              <span className="font-semibold text-charcoal">Ngày check-in:</span> {formatDate(booking.date_in)}
                            </p>
                            {booking.type === "room" && (
                              <p>
                                <span className="font-semibold text-charcoal">Ngày trả phòng:</span>{" "}
                                {booking.date_out ? formatDate(booking.date_out) : "Chưa trả"}
                              </p>
                            )}
                            {booking.time && (
                              <p>
                                <span className="font-semibold text-charcoal">Giờ hẹn:</span> {booking.time}
                              </p>
                            )}
                            <p className="sm:col-span-2">
                              <span className="font-semibold text-charcoal">Số lượng:</span> {booking.guests} khách
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:items-end justify-center">
                      {!isCancelled && (
                        <button
                          type="button"
                          disabled={cancellingId === booking.id}
                          onClick={() => void handleCancelBooking(booking.id)}
                          className="w-full sm:w-auto rounded-full border border-rose-500/20 bg-rose-50 px-5 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                        >
                          {cancellingId === booking.id ? "Đang hủy..." : "Hủy đặt chỗ"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
