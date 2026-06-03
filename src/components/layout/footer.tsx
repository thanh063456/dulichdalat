import Link from "next/link";

const exploreLinks = [
  { href: "/places", label: "Địa điểm tham quan" },
  { href: "/places?cat=cafe", label: "Quán cà phê đẹp" },
  { href: "/places?cat=food", label: "Nhà hàng ngon" },
  { href: "/places?cat=stay", label: "Homestay & lưu trú" },
];

export function Footer() {
  return (
    <footer className="bg-pine-900 text-cream">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:px-10 lg:grid-cols-4 lg:px-12">
        <div>
          <p className="font-display text-4xl tracking-[0.28em]">ĐÀ LẠT</p>
          <p className="mt-4 max-w-sm text-sm leading-7 text-cream/75">
            Khám phá vẻ đẹp của thành phố ngàn hoa qua góc nhìn của người địa phương.
            Trợ lý AI giúp bạn lên kế hoạch hoàn hảo.
          </p>
          <div className="mt-6 flex gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-cream/70">
            <span>Facebook</span>
            <span>Instagram</span>
            <span>YouTube</span>
            <span>TikTok</span>
          </div>
        </div>

        <div>
          <p className="font-heading text-2xl">Khám phá</p>
          <ul className="mt-5 space-y-3 text-sm text-cream/75">
            {exploreLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-cream">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-heading text-2xl">Hỗ trợ</p>
          <ul className="mt-5 space-y-3 text-sm text-cream/75">
            <li>Lên lịch trình</li>
            <li>Đặt bàn / phòng</li>
            <li>Câu hỏi thường gặp</li>
          </ul>
        </div>

        <div>
          <p className="font-heading text-2xl">Thông tin</p>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-cream/75">
            <li>📍 Đà Lạt, Lâm Đồng, Việt Nam</li>
            <li>🌡️ Nhiệt độ: 15–25°C quanh năm</li>
            <li>✈️ Sân bay Liên Khương (30 phút)</li>
            <li>🚌 Xe khách từ TP.HCM (7–8 tiếng)</li>
            <li>🚂 Ga Đà Lạt — kiến trúc Pháp 1938</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10 px-6 py-6 text-center text-sm text-cream/70 sm:px-10 lg:px-12">
        © 2025 Dalat Travel · Made with 🌿 by Ngô Công Thành
      </div>
    </footer>
  );
}