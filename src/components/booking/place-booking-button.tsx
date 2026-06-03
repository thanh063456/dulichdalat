"use client";

import { useState } from "react";
import { BookingModal } from "@/components/chat/booking-modal";

type PlaceBookingButtonProps = {
  placeName: string;
  category: string;
  tags?: string[];
};

export default function PlaceBookingButton({ placeName, category, tags = [] }: PlaceBookingButtonProps) {
  const [open, setOpen] = useState(false);
  const lowerTags = tags.map((t) => t.toLowerCase());

  let bookingType: "room" | "table" | "bike" | "none" = "table";

  if (
    lowerTags.includes("bike_rental") ||
    lowerTags.includes("transport") ||
    placeName.toLowerCase().includes("thuê xe")
  ) {
    bookingType = "bike";
  } else if (
    lowerTags.includes("sight") ||
    lowerTags.includes("landmark") ||
    lowerTags.includes("historic") ||
    category === "Tham Quan"
  ) {
    bookingType = "none";
  } else if (
    lowerTags.includes("stay") ||
    lowerTags.includes("homestay") ||
    lowerTags.includes("hotel") ||
    category === "Homestay" ||
    category === "Khách Sạn"
  ) {
    bookingType = "room";
  }

  if (bookingType === "none") {
    return (
      <div className="inline-flex items-center justify-center rounded-full border border-pine-500/15 bg-stone-50/50 px-6 py-3 text-sm font-semibold text-smoke">
        Tham quan tự do (Không cần đặt trước)
      </div>
    );
  }

  const buttonLabel =
    bookingType === "bike"
      ? "Thuê xe ngay"
      : bookingType === "room"
        ? "Đặt phòng ngay"
        : "Đặt bàn ngay";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-semibold text-pine-900 shadow-sm transition hover:scale-105 hover:bg-[#e6a500] active:scale-98"
      >
        {buttonLabel}
      </button>
      <BookingModal
        open={open}
        onOpenChange={setOpen}
        placeName={placeName}
        bookingType={bookingType}
      />
    </>
  );
}
