"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

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

type ApiResponse = {
  bookings: BookingRow[];
  message?: string;
};

type StatusFilter = BookingStatus | "all";

const statusFilters: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "cancelled", label: "Đã hủy" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusTone(status: BookingStatus) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    case "cancelled":
      return "bg-rose-500/10 text-rose-700 border-rose-500/20";
    default:
      return "bg-amber-500/10 text-amber-700 border-amber-500/20";
  }
}

function getStatusLabel(status: BookingStatus) {
  switch (status) {
    case "confirmed":
      return "Đã xác nhận";
    case "cancelled":
      return "Đã hủy";
    default:
      return "Chờ duyệt";
  }
}

function getBookingTypeLabel(type: BookingRow["type"], placeName: string = "") {
  if (placeName.toLowerCase().includes("thuê xe") || placeName.toLowerCase().includes("xe máy")) {
    return "Thuê xe máy";
  }
  return type === "room" ? "Lưu trú" : "Đặt bàn";
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadBookings = useCallback(async () => {
    setError(null);
    setRefreshing(true);

    try {
      const response = await fetch("/api/admin/bookings", { cache: "no-store", credentials: "include" });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Không thể tải danh sách booking.");
      }

      setBookings(data.bookings ?? []);
      setSelectedId((currentSelectedId) => {
        if (currentSelectedId && (data.bookings ?? []).some((booking) => booking.id === currentSelectedId)) {
          return currentSelectedId;
        }

        return data.bookings?.[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách booking.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBookings();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadBookings]);

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesFilter = activeFilter === "all" || booking.status === activeFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          booking.place_name,
          booking.customer_name,
          booking.phone,
          booking.status,
          booking.type,
          String(booking.id),
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, bookings, query]);

  const selectedBooking = useMemo(() => {
    if (filteredBookings.length === 0) {
      return null;
    }

    const matchedSelected = filteredBookings.find((booking) => booking.id === selectedId);
    return matchedSelected ?? filteredBookings[0] ?? null;
  }, [filteredBookings, selectedId]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((booking) => booking.status === "pending").length;
    const confirmed = bookings.filter((booking) => booking.status === "confirmed").length;
    const cancelled = bookings.filter((booking) => booking.status === "cancelled").length;

    return { total, pending, confirmed, cancelled };
  }, [bookings]);

  async function updateBookingStatus(id: number, status: BookingStatus) {
    setSavingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/bookings/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as { success?: boolean; message?: string };

      if (!response.ok || data.success === false) {
        throw new Error(data.message ?? "Không thể cập nhật trạng thái.");
      }

      setBookings((currentBookings) =>
        currentBookings.map((booking) => (booking.id === id ? { ...booking, status } : booking)),
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Không thể cập nhật trạng thái.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
      <section className="rounded-[2rem] border border-pine-500/10 bg-white p-8 shadow-[0_20px_60px_rgba(26,47,15,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pine-700">Admin Bookings</p>
            <h1 className="mt-4 font-display text-5xl text-pine-900">Drill-down booking thật</h1>
            <p className="mt-3 text-sm leading-7 text-smoke">
              Xem toàn bộ booking, lọc theo trạng thái, tìm nhanh theo tên hoặc số điện thoại, rồi đổi trạng thái ngay tại đây.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-pine-500/20 px-5 py-3 text-sm font-semibold text-pine-700 transition hover:bg-pine-500/5"
            >
              Về dashboard
            </Link>
            <button
              type="button"
              onClick={() => void loadBookings()}
              className="inline-flex items-center justify-center rounded-full bg-pine-700 px-5 py-3 text-sm font-semibold text-cream transition hover:bg-pine-900"
            >
              {refreshing ? "Đang tải..." : "Tải lại"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tổng booking", value: stats.total },
          { label: "Chờ duyệt", value: stats.pending },
          { label: "Đã xác nhận", value: stats.confirmed },
          { label: "Đã hủy", value: stats.cancelled },
        ].map((item) => (
          <article key={item.label} className="rounded-[2rem] border border-pine-500/10 bg-white p-6 shadow-[0_16px_42px_rgba(26,47,15,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-smoke">{item.label}</p>
            <p className="mt-4 font-heading text-5xl text-pine-900">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-[2rem] border border-pine-500/10 bg-white p-6 shadow-[0_16px_42px_rgba(26,47,15,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === filter.value
                    ? "bg-pine-700 text-cream"
                    : "border border-pine-500/15 bg-white text-charcoal hover:bg-pine-500/5"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-3 rounded-full border border-pine-500/15 bg-white px-4 py-2.5 text-sm text-smoke shadow-sm">
            <span>Tìm kiếm</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tên khách, số điện thoại, địa điểm..."
              className="w-72 max-w-full border-0 bg-transparent p-0 text-sm text-charcoal outline-none placeholder:text-smoke/70"
            />
          </label>
        </div>

        {error ? <p className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="overflow-hidden rounded-[2rem] border border-pine-500/10 bg-white shadow-[0_16px_42px_rgba(26,47,15,0.06)]">
          <div className="border-b border-pine-500/10 px-6 py-5">
            <h2 className="font-display text-3xl text-pine-900">Danh sách booking</h2>
            <p className="mt-1 text-sm text-smoke">{filteredBookings.length} booking đang hiển thị theo bộ lọc hiện tại.</p>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-sm text-smoke">Đang tải dữ liệu booking...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="px-6 py-10 text-sm text-smoke">Không có booking nào khớp bộ lọc hiện tại.</div>
          ) : (
            <div className="divide-y divide-pine-500/10">
              {filteredBookings.map((booking) => (
                <button
                  key={booking.id}
                  type="button"
                  onClick={() => setSelectedId(booking.id)}
                  className={`grid w-full gap-4 px-6 py-5 text-left transition hover:bg-pine-500/5 md:grid-cols-[1.1fr_0.7fr_0.6fr_0.6fr] md:items-center ${
                    selectedBooking?.id === booking.id ? "bg-pine-500/5" : ""
                  }`}
                >
                  <div>
                    <p className="font-semibold text-pine-900">{booking.customer_name}</p>
                    <p className="mt-1 text-sm text-smoke">{booking.place_name}</p>
                  </div>
                  <div className="text-sm text-smoke">
                    <p>{getBookingTypeLabel(booking.type, booking.place_name)}</p>
                    <p className="mt-1">{booking.phone}</p>
                  </div>
                  <div className="text-sm text-smoke">
                    <p>{formatDate(booking.date_in)}</p>
                    <p className="mt-1">{booking.time ?? "Không đặt giờ"}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 md:justify-end">
                    <span className="text-sm text-smoke">{booking.guests} khách</span>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </article>

        <aside className="rounded-[2rem] border border-pine-500/10 bg-white p-6 shadow-[0_16px_42px_rgba(26,47,15,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pine-700">Chi tiết</p>
          {selectedBooking ? (
            <div className="mt-4 space-y-5">
              <div>
                <h3 className="font-display text-3xl text-pine-900">{selectedBooking.customer_name}</h3>
                <p className="mt-2 text-sm text-smoke">{selectedBooking.place_name}</p>
              </div>

              <div className="rounded-2xl bg-pine-500/5 p-4">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(selectedBooking.status)}`}>
                  {getStatusLabel(selectedBooking.status)}
                </span>
                <div className="mt-4 grid gap-3 text-sm text-smoke">
                  <p><span className="font-semibold text-pine-900">Loại:</span> {getBookingTypeLabel(selectedBooking.type, selectedBooking.place_name)}</p>
                  <p><span className="font-semibold text-pine-900">Số điện thoại:</span> {selectedBooking.phone}</p>
                  {selectedBooking.place_name.toLowerCase().includes("thuê xe") ? (
                    <>
                      <p><span className="font-semibold text-pine-900">Ngày thuê:</span> {formatDate(selectedBooking.date_in)}</p>
                      <p><span className="font-semibold text-pine-900">Ngày trả:</span> {selectedBooking.date_out ? formatDate(selectedBooking.date_out) : "Chưa có"}</p>
                      <p><span className="font-semibold text-pine-900">Số lượng:</span> {selectedBooking.guests} xe</p>
                    </>
                  ) : (
                    <>
                      <p><span className="font-semibold text-pine-900">Ngày check-in:</span> {formatDate(selectedBooking.date_in)}</p>
                      {selectedBooking.type === "room" && (
                        <p><span className="font-semibold text-pine-900">Check-out:</span> {selectedBooking.date_out ? formatDate(selectedBooking.date_out) : "Chưa có"}</p>
                      )}
                      {selectedBooking.time && (
                        <p><span className="font-semibold text-pine-900">Giờ:</span> {selectedBooking.time}</p>
                      )}
                      <p><span className="font-semibold text-pine-900">Khách:</span> {selectedBooking.guests} người</p>
                    </>
                  )}
                  <p><span className="font-semibold text-pine-900">Tạo lúc:</span> {formatDateTime(selectedBooking.created_at)}</p>
                  <p><span className="font-semibold text-pine-900">Mã booking:</span> #{selectedBooking.id}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pine-700">Đổi trạng thái</p>
                <div className="mt-3 grid gap-3">
                  {(["pending", "confirmed", "cancelled"] as BookingStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={savingId === selectedBooking.id && selectedBooking.status === status}
                      onClick={() => void updateBookingStatus(selectedBooking.id, status)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                        selectedBooking.status === status
                          ? "border-pine-700 bg-pine-700 text-cream"
                          : "border-pine-500/15 bg-white text-pine-700 hover:bg-pine-500/5"
                      }`}
                    >
                      {getStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/api/admin/bookings"
                  className="inline-flex items-center justify-center rounded-full border border-pine-500/20 px-5 py-3 text-sm font-semibold text-pine-700 transition hover:bg-pine-500/5"
                >
                  Mở API thô
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full bg-pine-700 px-5 py-3 text-sm font-semibold text-cream transition hover:bg-pine-900"
                >
                  Về dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-pine-500/5 p-4 text-sm text-smoke">
              Chọn một booking trong danh sách để xem chi tiết và đổi trạng thái.
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}