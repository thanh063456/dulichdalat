"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import FavoriteButton from "@/components/favorites/favorite-button";
import type { PlaceRecord } from "@/lib/places";

const getCategory = (place: PlaceRecord) => place.category ?? "Điểm đến";
const getRating = (place: PlaceRecord) => place.rating ?? 0;
const getReviewCount = (place: PlaceRecord) => place.reviewCount ?? 0;
const getDescription = (place: PlaceRecord) => place.description ?? place.summary ?? "Đang cập nhật thông tin chi tiết cho địa điểm này.";
const getImage = (place: PlaceRecord) => place.image || "/images/dalat3.png";

const categories = ["Tất cả", "Tham Quan", "Ẩm Thực"];

export default function PlacesPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [places, setPlaces] = useState<PlaceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadPlaces() {
      try {
        const response = await fetch("/api/places", { cache: "no-store" });
        const data = (await response.json()) as { places?: PlaceRecord[] };
        if (!mounted) return;
        setPlaces(data.places ?? []);
      } catch {
        if (mounted) setPlaces([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadPlaces();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return places.filter((place) => {
      const category = getCategory(place);
      const matchesCategory = activeCategory === "Tất cả" || category === activeCategory;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [place.name, getDescription(place), place.address, ...place.tags].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, places, query]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-12">
      <section className="grid gap-8 rounded-4xl border border-pine-500/10 bg-white/80 p-6 shadow-[0_20px_60px_rgba(26,47,15,0.08)] lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pine-700">Khám phá Đà Lạt · 150+ địa điểm</p>
          <h1 className="mt-4 font-display text-5xl text-pine-900 sm:text-6xl">Thành phố ngàn hoa chờ bạn khám phá</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-smoke">
            Tìm điểm tham quan, cà phê, ẩm thực và lưu trú theo nhu cầu thực tế của bạn. Bộ dữ liệu này kết hợp từ danh sách địa điểm và trải nghiệm địa phương.
          </p>
        </div>
        <div className="overflow-hidden rounded-4xl bg-[url('/images/dalat3.png')] bg-cover bg-center min-h-64" />
      </section>

      <section className="sticky top-20 z-20 mt-8 rounded-[1.75rem] border border-pine-500/10 bg-cream/90 p-4 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeCategory === category
                    ? "bg-pine-700 text-cream"
                    : "border border-pine-500/15 bg-white text-charcoal hover:bg-pine-500/5"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, địa chỉ, từ khóa..."
            className="h-12 min-w-0 rounded-full border border-pine-500/15 bg-white px-5 text-sm outline-none focus:border-pine-500 lg:w-96"
          />
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="rounded-3xl border border-pine-500/10 bg-white p-6 text-smoke md:col-span-2 xl:col-span-3">Đang tải địa điểm...</div>
        ) : filteredPlaces.length === 0 ? (
          <div className="rounded-3xl border border-pine-500/10 bg-white p-6 text-smoke md:col-span-2 xl:col-span-3">Không tìm thấy địa điểm phù hợp.</div>
        ) : (
          filteredPlaces.map((place) => (
          <article
            key={place.slug}
            className="overflow-hidden rounded-4xl border border-pine-500/10 bg-white shadow-[0_18px_45px_rgba(26,47,15,0.08)] transition hover:-translate-y-1 hover:border-pine-500/25 hover:shadow-[0_30px_70px_rgba(26,47,15,0.12)]"
          >
            <div className="relative aspect-4/3 bg-cover bg-center" style={{ backgroundImage: `url(${getImage(place)})` }}>
              <span className="absolute left-4 top-4 rounded-full bg-cream/95 px-3 py-1 text-xs font-semibold text-pine-900 backdrop-blur">
                {getCategory(place)}
              </span>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-3xl text-pine-900">{place.name}</h2>
                  <p className="mt-1 text-sm text-smoke">{place.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-pine-900">⭐ {getRating(place).toFixed(1)}</p>
                  <p className="text-xs text-smoke">{getReviewCount(place)} đánh giá</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-smoke">{getDescription(place)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {place.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full bg-pine-500/5 px-3 py-1 text-xs font-semibold text-pine-700">
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/places/${place.slug}`}
                  className="rounded-full bg-pine-700 px-4 py-2.5 text-sm font-semibold text-cream transition hover:bg-pine-900"
                >
                  Xem chi tiết
                </Link>
                <Link
                  href={`/chat?prompt=${encodeURIComponent(`Hỏi AI về ${place.name}`)}`}
                  className="rounded-full border border-pine-500/20 px-4 py-2.5 text-sm font-semibold text-pine-700 transition hover:bg-pine-500/5"
                >
                  Hỏi AI 🌿
                </Link>
                <FavoriteButton slug={place.slug} size="sm" />
              </div>
            </div>
          </article>
          ))
        )}
      </section>
    </div>
  );
}