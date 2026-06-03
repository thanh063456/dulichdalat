import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/chatbot/db";
import { getCurrentUser } from "@/lib/reviews";
import { normalizePlace } from "@/lib/places";

export const dynamic = "force-dynamic";

async function requireAdmin(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "admin") {
    return null;
  }
  return user;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await requireAdmin(request);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
  }

  const { slug } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const place = normalizePlace({ ...body, slug });

  if (!place.name || !place.address) {
    return NextResponse.json({ error: "Name and address are required" }, { status: 400 });
  }

  const payload = {
    slug,
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
  };

  const { data, error } = await supabase
    .from("places")
    .upsert(payload, { onConflict: "slug" })
    .select()
    .single();

  if (error) {
    console.error("[Admin Places PUT] Supabase error:", error);
    return NextResponse.json(
      { error: "Failed to save place", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ place: normalizePlace(data as any) });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await requireAdmin(request);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
  }

  const { slug } = await params;
  const { error } = await supabase
    .from("places")
    .update({ is_hidden: true })
    .eq("slug", slug);

  if (error) {
    console.error("[Admin Places DELETE] Supabase error:", error);
    return NextResponse.json(
      { error: "Failed to delete place", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
