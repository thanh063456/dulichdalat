import Image from "next/image";
import Link from "next/link";
import FavoriteButton from "@/components/favorites/favorite-button";
import PlaceBookingButton from "@/components/booking/place-booking-button";
import { notFound } from "next/navigation";
import PlaceReviewSection from "@/components/reviews/place-review-section";
import { getPlaceBySlug, getPlaces, type PlaceRecord } from "@/lib/places";

function getDescription(place: PlaceRecord) {
  return place.description ?? place.summary ?? "Địa điểm nổi bật tại Đà Lạt.";
}

function getImage(place: PlaceRecord) {
  return place.image || "/images/dalat1.png";
}

function getCategory(place: PlaceRecord) {
  return place.category ?? "Địa điểm";
}

function getRating(place: PlaceRecord) {
  return place.rating ?? 4.5;
}

function getReviewCount(place: PlaceRecord) {
  return place.reviewCount ?? 0;
}

function getPlaceStyle(place: PlaceRecord) {
  const lowerTags = place.tags.join(" ").toLowerCase();
  const category = getCategory(place);

  return {
    bestTime: lowerTags.includes("săn mây")
      ? "Sáng sớm 5:00 - 8:00"
      : place.slug === "cho-dem-da-lat"
        ? "Buổi tối sau 17:00"
        : category === "Ẩm Thực"
          ? "Từ 17:00 - 22:00"
          : "Buổi sáng hoặc xế chiều",
    duration:
      category === "Ẩm Thực"
        ? "1 - 2 giờ"
        : lowerTags.includes("trekking") || lowerTags.includes("mạo hiểm")
          ? "4 - 6 giờ"
          : lowerTags.includes("check-in")
            ? "2 - 3 giờ"
            : "2 - 4 giờ",
    companion:
      lowerTags.includes("cặp đôi") || lowerTags.includes("lãng mạn")
        ? "Cặp đôi"
        : lowerTags.includes("trekking") || lowerTags.includes("mạo hiểm")
          ? "Bạn bè thích vận động"
          : category === "Ẩm Thực"
            ? "Gia đình / nhóm bạn"
            : "Mọi đối tượng",
    tips:
      place.slug === "doi-che-cau-dat"
        ? ["Đi trước 8:00 để săn mây đẹp nhất", "Mang áo khoác và giày bám tốt"]
        : place.slug === "ga-da-lat"
          ? ["Chụp ảnh từ góc mái tam giác để nổi bật kiến trúc", "Kết hợp cùng khu vực ga cổ và toa tàu"]
          : place.slug === "cho-dem-da-lat"
            ? ["Đi từ 18:00 để có đủ hàng quán mở", "Giữ tiền mặt nhỏ để mua đồ ăn nhanh"]
            : place.slug === "nui-langbiang"
              ? ["Nên đi xe jeep nếu không muốn trek toàn bộ", "Kiểm tra thời tiết trước khi leo"]
              : ["Đi sớm để tránh đông", "Chuẩn bị pin dự phòng cho điện thoại"],
  };
}

function getRelatedPlaces(current: PlaceRecord, allPlaces: PlaceRecord[]) {
  const related = allPlaces
    .filter((item) => item.slug !== current.slug)
    .sort((left, right) => {
      const leftScore = left.category === current.category ? 2 : 0;
      const rightScore = right.category === current.category ? 2 : 0;
      return rightScore - leftScore || getReviewCount(right) - getReviewCount(left);
    });

  return related.slice(0, 3);
}

export async function generateStaticParams() {
  const places = await getPlaces();
  return places.map((place) => ({ slug: place.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) {
    return {
      title: "Địa điểm không tìm thấy | Đà Lạt",
    };
  }

  return {
    title: `${place.name} | Đà Lạt`,
    description: place.description,
  };
}

export default async function PlaceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  const allPlaces = await getPlaces();

  if (!place) {
    notFound();
  }

  const style = getPlaceStyle(place);
  const relatedPlaces = getRelatedPlaces(place, allPlaces);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-4xl border border-pine-500/10 bg-white shadow-[0_20px_60px_rgba(26,47,15,0.08)]">
          <div className="relative aspect-4/3">
            <Image
              src={getImage(place)}
              alt={place.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,28,10,0.05),rgba(16,28,10,0.7))]" />
            <div className="absolute left-5 top-5 rounded-full bg-cream/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-pine-900 backdrop-blur">
              {getCategory(place)}
            </div>
            <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center gap-3 text-sm text-cream">
              <span className="rounded-full bg-pine-900/70 px-4 py-2 backdrop-blur">⭐ {getRating(place).toFixed(1)}</span>
              <span className="rounded-full bg-pine-900/70 px-4 py-2 backdrop-blur">{getReviewCount(place).toLocaleString("vi-VN")} đánh giá</span>
              <span className="rounded-full bg-pine-900/70 px-4 py-2 backdrop-blur">{place.hours}</span>
            </div>
          </div>
        </div>

        <aside className="rounded-4xl border border-pine-500/10 bg-white p-8 shadow-[0_20px_60px_rgba(26,47,15,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pine-700">Chi tiết địa điểm</p>
          <h1 className="mt-3 font-display text-5xl text-pine-900">{place.name}</h1>
          <p className="mt-3 text-sm text-smoke">{place.address}</p>
          <p className="mt-6 text-base leading-8 text-smoke">{getDescription(place)}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Giờ mở cửa", value: place.hours },
              { label: "Đánh giá", value: `${getRating(place).toFixed(1)} / 5` },
              { label: "Thời lượng", value: style.duration },
              { label: "Phù hợp", value: style.companion },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-pine-500/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine-700">{item.label}</p>
                <p className="mt-2 font-heading text-xl text-pine-900">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {place.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-pine-500/5 px-3 py-1 text-xs font-semibold text-pine-700">
                #{tag}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PlaceBookingButton placeName={place.name} category={getCategory(place)} />
            <Link
              href={`/chat?prompt=${encodeURIComponent(`Hỏi AI về ${place.name}`)}`}
              className="inline-flex items-center justify-center rounded-full bg-pine-700 px-5 py-3 text-sm font-semibold text-cream transition hover:bg-pine-900"
            >
              Hỏi AI
            </Link>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} Đà Lạt`)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-pine-500/20 px-5 py-3 text-sm font-semibold text-pine-700 transition hover:bg-pine-500/5"
            >
              Mở bản đồ
            </a>
            <div className="flex items-center">
              <FavoriteButton slug={place.slug} />
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr_0.9fr]">
        <article className="rounded-4xl border border-pine-500/10 bg-white p-6 shadow-[0_16px_42px_rgba(26,47,15,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-pine-700">Thời điểm đẹp nhất</p>
          <p className="mt-3 font-heading text-2xl text-pine-900">{style.bestTime}</p>
          <p className="mt-3 text-sm leading-7 text-smoke">
            Đây là khung giờ phù hợp nhất để tận hưởng không gian, chụp ảnh và tránh đông khách.
          </p>
        </article>
        <article className="rounded-4xl border border-pine-500/10 bg-white p-6 shadow-[0_16px_42px_rgba(26,47,15,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-pine-700">Gợi ý trải nghiệm</p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-smoke">
            {style.tips.map((tip) => (
              <li key={tip} className="flex gap-3">
                <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-gold" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-4xl border border-pine-500/10 bg-linear-to-br from-pine-900 to-pine-700 p-6 text-cream shadow-[0_16px_42px_rgba(26,47,15,0.14)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold">Nhịp tham quan</p>
          <p className="mt-3 font-display text-3xl">{style.duration}</p>
          <p className="mt-3 text-sm leading-7 text-cream/80">
            Thời lượng này đủ để đi chậm, chụp ảnh và kết hợp thêm một điểm gần đó trong cùng nửa ngày.
          </p>
        </article>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pine-700">Đề xuất thêm</p>
            <h2 className="mt-3 font-display text-4xl text-pine-900">Địa điểm cùng chủ đề</h2>
          </div>
          <Link href="/places" className="text-sm font-semibold text-pine-700 hover:text-pine-900">
            Xem tất cả →
          </Link>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {relatedPlaces.map((related) => (
            <Link
              key={related.slug}
              href={`/places/${related.slug}`}
              className="group overflow-hidden rounded-4xl border border-pine-500/10 bg-white shadow-[0_18px_45px_rgba(26,47,15,0.08)] transition hover:-translate-y-1 hover:border-pine-500/25 hover:shadow-[0_30px_70px_rgba(26,47,15,0.12)]"
            >
              <div className="relative aspect-4/3">
                <Image src={getImage(related)} alt={related.name} fill sizes="(max-width: 768px) 100vw, 30vw" className="object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(16,28,10,0.65))]" />
                <div className="absolute left-4 top-4 rounded-full bg-cream/95 px-3 py-1 text-xs font-semibold text-pine-900 backdrop-blur">
                  {getCategory(related)}
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-heading text-2xl text-pine-900">{related.name}</h3>
                  <span className="text-sm font-semibold text-pine-900">⭐ {getRating(related).toFixed(1)}</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-smoke">{getDescription(related)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <PlaceReviewSection slug={place.slug} placeName={place.name} />

      <section className="mt-12 rounded-4xl border border-pine-500/10 bg-white p-8 shadow-[0_20px_60px_rgba(26,47,15,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pine-700">Mẹo nhanh</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            "Kiểm tra thời tiết trước khi đi để chọn khung giờ chụp hình đẹp.",
            "Kết hợp thêm 1 địa điểm gần đó để tối ưu lịch trình trong ngày.",
            `Nếu cần lên lịch trình riêng cho ${place.name}, hãy dùng chatbot AI ở trang chat.`,
          ].map((item) => (
            <div key={item} className="rounded-2xl bg-pine-500/5 p-4 text-sm leading-7 text-smoke">
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}