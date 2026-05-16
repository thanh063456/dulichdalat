"use client";

import { useState } from "react";
import { BookingModal } from "@/components/chat/booking-modal";

export default function PlaceBookingButton({ placeName, category }: { placeName: string, category: string }) {
  const [open, setOpen] = useState(false);
  const type = category === "Khách Sạn" || category === "Homestay" ? "room" : "table";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-semibold text-pine-900 shadow-sm transition hover:scale-105 hover:bg-[#e6a500]"
      >
        Đặt {type === "room" ? "phòng" : "chỗ"} ngay
      </button>
      <BookingModal
        open={open}
        onOpenChange={setOpen}
        placeName={placeName}
        bookingType={type}
      />
    </>
  );
}
