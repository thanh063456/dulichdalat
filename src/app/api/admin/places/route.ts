import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/chatbot/db";
import { getCurrentUser } from "@/lib/reviews";
import { getFallbackPlaces, getPlaces, normalizePlace } from "@/lib/places";

export const dynamic = "force-dynamic";

async function requireAdmin(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "admin") {
    return null;
  }
  return user;
}

export async function GET(request: NextRequest) {
  const user = await requireAdmin(request);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const places = await getPlaces(true);

  return NextResponse.json({ places, fallbackPlaces: getFallbackPlaces() });
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin(request);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const place = normalizePlace(body as any);

  if (!place.slug || !place.name || !place.address) {
    return NextResponse.json({ error: "Slug, name and address are required" }, { status: 400 });
  }

  const payload = {
    slug: place.slug,
    name: place.name,
    category: place.category,
    rating: place.rating,
    review_count: place.reviewCount,
    address: place.address,
    hours: place.hours,
    description: place.description,
    summary: place.summary,
    tags: place.tags,
    image: place.image,
    verified: place.verified,
    is_hidden: false,
    phone: place.phone,
    gmaps_link: place.gmapsLink,
    geo: place.geo,
  };

  const { data, error } = await supabase.from("places").upsert(payload, { onConflict: "slug" }).select().single();

  if (error) {
    return NextResponse.json({ error: "Failed to save place" }, { status: 500 });
  }

  return NextResponse.json({ place: normalizePlace(data as any) }, { status: 201 });
}
