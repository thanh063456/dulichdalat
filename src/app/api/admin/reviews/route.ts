import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/reviews";
import { getPlaces } from "@/lib/places";

type ReviewRow = {
  id: number;
  place_slug: string;
  user_id: string;
  user_name: string;
  rating: number;
  content: string;
  image_url: string | null;
  approved: boolean;
  created_at: string;
};

function buildAvatarUrl(name: string) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return Response.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const places = await getPlaces();
  const placeMap = new Map(places.map((place) => [place.slug, place.name]));

  const { data, error } = await supabaseAdmin
    .from("place_reviews")
    .select("id, place_slug, user_id, user_name, rating, content, image_url, approved, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: "Failed to load reviews" }, { status: 500 });
  }

  const reviews = (data ?? []) as ReviewRow[];

  return Response.json({
    reviews: reviews.map((review) => ({
      ...review,
      place_name: placeMap.get(review.place_slug) ?? review.place_slug,
      user_name: review.user_name,
      avatar_url: buildAvatarUrl(review.user_name),
    })),
  });
}
