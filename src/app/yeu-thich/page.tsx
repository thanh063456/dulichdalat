"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PlaceRecord } from "@/lib/places";
import FavoriteButton from "@/components/favorites/favorite-button";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<string[] | null>(null);
  const [places, setPlaces] = useState<PlaceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch("/api/user/favorites", { cache: "no-store", credentials: "include" });
        const data = (await resp.json()) as { favorites?: { place_slug: string }[] };
        if (!mounted) return;
        setFavorites((data.favorites ?? []).map((f) => f.place_slug));
      } catch {
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadPlaces() {
      try {
        const resp = await fetch("/api/places", { cache: "no-store" });
        const data = (await resp.json()) as { places?: PlaceRecord[] };
        if (mounted) {
          setPlaces(data.places ?? []);
        }
      } catch {
        if (mounted) setPlaces([]);
      }
    }

    void loadPlaces();
    return () => {
      mounted = false;
    };
  }, []);

  const placesList = useMemo<PlaceRecord[]>(() => {
    if (!favorites) return [];
    return favorites.map((slug) => places.find((p) => p.slug === slug)).filter(Boolean) as PlaceRecord[];
  }, [favorites, places]);

  const isAuthenticated = typeof window !== "undefined" && !!window.localStorage.getItem("dalat_user");

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
      <section className="rounded-4xl border border-pine-500/10 bg-white p-8 shadow-[0_20px_60px_rgba(26,47,15,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pine-700">Yêu Thích</p>
        <h1 className="mt-4 font-display text-5xl text-pine-900">Địa điểm bạn đã lưu</h1>
        <p className="mt-3 text-sm leading-7 text-smoke">Danh sách những nơi bạn đã đánh dấu yêu thích.</p>
      </section>

      <section className="mt-8">
        {!isAuthenticated ? (
          <div className="rounded-3xl border border-pine-500/10 bg-white p-6 text-smoke">
            Bạn cần <Link href="/login" className="font-semibold text-pine-700">đăng nhập</Link> để xem danh sách yêu thích.
          </div>
        ) : loading ? (
          <div className="rounded-3xl border border-pine-500/10 bg-white p-6 text-smoke">Đang tải...</div>
        ) : placesList.length === 0 ? (
          <div className="rounded-3xl border border-pine-500/10 bg-white p-6 text-smoke">Bạn chưa lưu địa điểm nào.</div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {placesList.map((place) => (
              <article key={place.slug} className="overflow-hidden rounded-4xl border border-pine-500/10 bg-white shadow-[0_18px_45px_rgba(26,47,15,0.08)] transition hover:-translate-y-1">
                <div className="relative aspect-4/3 bg-cover bg-center" style={{ backgroundImage: `url(${place.image ?? '/images/dalat3.png'})` }}>
                  <span className="absolute left-4 top-4 rounded-full bg-cream/95 px-3 py-1 text-xs font-semibold text-pine-900 backdrop-blur">{place.category ?? 'Điểm đến'}</span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-heading text-3xl text-pine-900">{place.name}</h2>
                      <p className="mt-1 text-sm text-smoke">{place.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-pine-900">⭐ {(place.rating ?? 0).toFixed(1)}</p>
                      <p className="text-xs text-smoke">{(place.reviewCount ?? 0)} đánh giá</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-smoke">{place.description ?? place.summary}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Link href={`/places/${place.slug}`} className="rounded-full bg-pine-700 px-4 py-2.5 text-sm font-semibold text-cream">Xem chi tiết</Link>
                    <FavoriteButton slug={place.slug} size="sm" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
