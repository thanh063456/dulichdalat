"use client";

import { useState } from "react";

type BookingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeName: string;
  bookingType: "room" | "table" | "bike";
  onBooked?: (message: string) => void;
};

export function BookingModal({ open, onOpenChange, placeName, bookingType, onBooked }: BookingModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateIn, setDateIn] = useState("");
  const [dateOut, setDateOut] = useState("");
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState(2);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  if (!open) {
    return null;
  }

  async function submitBooking() {
    setStatus("idle");
    setMessage("");

    if (!customerName.trim() || !phone.trim() || !dateIn) {
      setStatus("error");
      setMessage("Vui lòng nhập đầy đủ thông tin Họ tên, Số điện thoại và Ngày bắt đầu.");
      return;
    }

    if ((bookingType === "bike" || bookingType === "room") && !dateOut) {
      setStatus("error");
      setMessage(bookingType === "bike" ? "Vui lòng chọn Ngày trả xe." : "Vui lòng chọn Ngày trả phòng.");
      return;
    }

    if (bookingType === "table" && !time) {
      setStatus("error");
      setMessage("Vui lòng chọn Giờ đặt bàn.");
      return;
    }

    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          place_name: placeName,
          type: bookingType === "bike" ? "room" : bookingType, // map bike to room to respect DB check constraint
          customer_name: customerName,
          phone,
          date_in: dateIn,
          date_out: dateOut || null,
          time: time || null,
          guests,
        }),
      });

      const data = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Không thể tạo đặt chỗ");
      }

      setStatus("success");
      const successMessage = data.message || `Đã gửi yêu cầu đặt chỗ thành công.`;
      setMessage(successMessage);
      onBooked?.(successMessage);
      
      // Reset form on success after brief delay or keep it visible
      setTimeout(() => {
        onOpenChange(false);
        setCustomerName("");
        setPhone("");
        setDateIn("");
        setDateOut("");
        setTime("");
        setGuests(2);
        setStatus("idle");
        setMessage("");
      }, 2000);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Có lỗi khi gửi yêu cầu đặt chỗ.");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[2rem] bg-cream p-6 shadow-2xl border border-pine-500/10">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-3xl text-pine-900">
            {bookingType === "bike" ? "Đăng ký thuê xe" : "Đặt lịch hẹn"}
          </h3>
          <button type="button" onClick={() => onOpenChange(false)} className="text-sm text-smoke hover:text-pine-900 transition font-medium">
            Đóng
          </button>
        </div>
        <p className="mb-4 text-sm text-smoke leading-relaxed">
          {bookingType === "bike"
            ? "Đăng ký thuê xe máy tại"
            : bookingType === "room"
              ? "Đặt phòng tại"
              : "Đặt bàn tại"}{" "}
          <strong>{placeName}</strong>.
        </p>

        <div className="grid gap-4">
          <label className="block text-xs font-semibold text-pine-700">
            Họ và tên
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Nhập họ và tên của bạn"
              className="mt-1.5 h-12 w-full rounded-2xl border border-pine-500/15 bg-white px-4 text-sm outline-none focus:border-pine-500"
            />
          </label>

          <label className="block text-xs font-semibold text-pine-700">
            Số điện thoại
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Nhập số điện thoại liên lạc"
              className="mt-1.5 h-12 w-full rounded-2xl border border-pine-500/15 bg-white px-4 text-sm outline-none focus:border-pine-500"
            />
          </label>

          {/* Date range selection for bike rental or room booking */}
          {(bookingType === "bike" || bookingType === "room") && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-pine-700">
                {bookingType === "bike" ? "Từ ngày" : "Ngày nhận phòng"}
                <input
                  value={dateIn}
                  onChange={(event) => setDateIn(event.target.value)}
                  type="date"
                  className="mt-1.5 h-12 w-full rounded-2xl border border-pine-500/15 bg-white px-4 text-sm outline-none focus:border-pine-500"
                />
              </label>
              <label className="block text-xs font-semibold text-pine-700">
                {bookingType === "bike" ? "Đến ngày" : "Ngày trả xe"}
                <input
                  value={dateOut}
                  onChange={(event) => setDateOut(event.target.value)}
                  type="date"
                  className="mt-1.5 h-12 w-full rounded-2xl border border-pine-500/15 bg-white px-4 text-sm outline-none focus:border-pine-500"
                />
              </label>
            </div>
          )}

          {/* Date and time selection for cafe/restaurants */}
          {bookingType === "table" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-pine-700">
                Ngày đặt bàn
                <input
                  value={dateIn}
                  onChange={(event) => setDateIn(event.target.value)}
                  type="date"
                  className="mt-1.5 h-12 w-full rounded-2xl border border-pine-500/15 bg-white px-4 text-sm outline-none focus:border-pine-500"
                />
              </label>
              <label className="block text-xs font-semibold text-pine-700">
                Giờ đặt bàn
                <input
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  type="time"
                  className="mt-1.5 h-12 w-full rounded-2xl border border-pine-500/15 bg-white px-4 text-sm outline-none focus:border-pine-500"
                />
              </label>
            </div>
          )}

          <label className="block text-xs font-semibold text-pine-700">
            {bookingType === "bike" ? "Số lượng xe thuê" : "Số lượng khách"}
            <input
              value={String(guests)}
              onChange={(event) => setGuests(Number(event.target.value) || 1)}
              type="number"
              min={1}
              className="mt-1.5 h-12 w-full rounded-2xl border border-pine-500/15 bg-white px-4 text-sm outline-none focus:border-pine-500"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => void submitBooking()}
          className="mt-6 w-full rounded-full bg-pine-700 py-3.5 text-sm font-semibold text-cream hover:bg-pine-900 transition active:scale-98"
        >
          Gửi yêu cầu
        </button>

        {message ? (
          <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${status === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}