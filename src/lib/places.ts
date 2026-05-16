import { createClient } from "@supabase/supabase-js";
import basePlaces from "@/data/dalat.json";
import { getSupabaseAdminClient } from "@/lib/chatbot/db";

export type PlaceGeo = {
  lat: number;
  lng: number;
};

export type PlaceRecord = {
  slug: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  hidden: boolean;
  address: string;
  hours: string;
  description: string;
  summary: string;
  tags: string[];
  image: string;
  verified: boolean;
  phone: string;
  gmapsLink: string;
  geo: PlaceGeo | null;
};

export type PlaceInput = Omit<PlaceRecord, "reviewCount"> & {
  reviewCount?: number;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function getAnonClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.map((tag) => String(tag).trim()).filter(Boolean);
}

function normalizeGeo(geo: unknown): PlaceGeo | null {
  if (!geo || typeof geo !== "object") return null;
  const candidate = geo as { lat?: unknown; lng?: unknown };
  const lat = Number(candidate.lat);
  const lng = Number(candidate.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function normalizePlace(place: Partial<PlaceRecord> & { geo?: unknown; review_count?: number; is_hidden?: boolean; hidden?: boolean }): PlaceRecord {
  return {
    slug: place.slug ?? "",
    name: place.name ?? "",
    category: place.category ?? "Điểm đến",
    rating: Number(place.rating ?? 0),
    reviewCount: Number(place.reviewCount ?? place.review_count ?? 0),
    hidden: Boolean(place.hidden ?? place.is_hidden ?? false),
    address: place.address ?? "",
    hours: place.hours ?? "",
    description: place.description ?? place.summary ?? "",
    summary: place.summary ?? place.description ?? "",
    tags: normalizeTags(place.tags),
    image: place.image ?? "",
    verified: Boolean(place.verified),
    phone: place.phone ?? "",
    gmapsLink: place.gmapsLink ?? "",
    geo: normalizeGeo(place.geo),
  };
}

export function getFallbackPlaces(): PlaceRecord[] {
  return (basePlaces as Partial<PlaceRecord>[]).map((place) => normalizePlace(place));
}

export async function getDatabasePlaces(): Promise<PlaceRecord[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("places")
    .select("slug, name, category, rating, review_count, is_hidden, address, hours, description, summary, tags, image, verified, phone, gmaps_link, geo")
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) {
    return [];
  }

  return data.map((place) =>
    normalizePlace({
      slug: place.slug,
      name: place.name,
      category: place.category,
      rating: Number(place.rating ?? 0),
      reviewCount: Number(place.review_count ?? 0),
      hidden: Boolean(place.is_hidden),
      address: place.address,
      hours: place.hours,
      description: place.description,
      summary: place.summary,
      tags: place.tags ?? [],
      image: place.image,
      verified: Boolean(place.verified),
      phone: place.phone,
      gmapsLink: place.gmaps_link,
      geo: place.geo,
    }),
  );
}

function mergePlaces(basePlaces: PlaceRecord[], dbPlaces: PlaceRecord[]) {
  const overrides = new Map(dbPlaces.map((place) => [place.slug, place]));
  const merged = basePlaces.map((place) => overrides.get(place.slug) ?? place).filter((place) => !place.hidden);

  for (const place of dbPlaces) {
    if (!basePlaces.some((basePlace) => basePlace.slug === place.slug) && !place.hidden) {
      merged.push(place);
    }
  }

  return merged;
}

export async function getPlaces(includeHidden = false): Promise<PlaceRecord[]> {
  const dbPlaces = await getDatabasePlaces();
  const merged = mergePlaces(getFallbackPlaces(), dbPlaces);

  if (includeHidden) {
    return [...merged, ...dbPlaces.filter((place) => place.hidden)];
  }

  return merged;
}

export async function getPlaceBySlug(slug: string): Promise<PlaceRecord | null> {
  const places = await getPlaces();
  return places.find((place) => place.slug === slug) ?? null;
}

export async function seedPlacesFromFallback(): Promise<number> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return 0;

  const fallbackPlaces = getFallbackPlaces();
  const rows = fallbackPlaces.map((place) => ({
    slug: place.slug,
    name: place.name,
    category: place.category,
    rating: place.rating,
    review_count: place.reviewCount,
    is_hidden: false,
    address: place.address,
    hours: place.hours,
    description: place.description,
    summary: place.summary,
    tags: place.tags,
    image: place.image,
    verified: place.verified,
    phone: place.phone,
    gmaps_link: place.gmapsLink,
    geo: place.geo,
  }));

  const { error } = await supabase.from("places").upsert(rows, { onConflict: "slug" });
  if (error) {
    throw error;
  }

  return rows.length;
}
