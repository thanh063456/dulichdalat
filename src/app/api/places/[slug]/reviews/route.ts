import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );
  const { data } = await supabase.auth.getUser();
  return data.user;
}

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

type ReviewResponseRow = ReviewRow & {
  user_name: string;
  avatar_url: string;
};

function buildAvatarUrl(name: string) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const user = await getAuthUser();
    const currentUserId = user?.id ?? "";

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return Response.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    // Use admin client to bypass RLS policies which might have infinite recursion bugs
    const { data: approvedReviews, error: approvedError } = await supabaseAdmin
      .from("place_reviews")
      .select("id, place_slug, user_id, user_name, rating, content, image_url, approved, created_at")
      .eq("place_slug", slug)
      .eq("approved", true)
      .order("created_at", { ascending: false });

    if (approvedError) {
      console.error("Error loading approved reviews:", approvedError);
      return Response.json({
        stats: {
          average: 0,
          total: 0,
          distribution: [5, 4, 3, 2, 1].map((rating) => ({ rating, count: 0 })),
        },
        reviews: [],
        currentUserReview: null,
        canReview: Boolean(currentUserId),
        isAuthenticated: Boolean(currentUserId),
      });
    }

    const { data: ownReview } = currentUserId
      ? await supabaseAdmin
          .from("place_reviews")
          .select("id, place_slug, user_id, user_name, rating, content, image_url, approved, created_at")
          .eq("place_slug", slug)
          .eq("user_id", currentUserId)
          .maybeSingle()
      : { data: null };

    const reviews = [...(approvedReviews ?? []), ...(ownReview && !approvedReviews?.some((item) => item.id === ownReview.id) ? [ownReview] : [])].map(
      (review) => ({
        ...review,
        avatar_url: buildAvatarUrl(review.user_name),
      })
    ) as Array<ReviewResponseRow>;

    const distribution = [5, 4, 3, 2, 1].map((rating) => {
      const count = (approvedReviews ?? []).filter((review) => review.rating === rating).length;
      return { rating, count };
    });

    const totalApproved = approvedReviews?.length ?? 0;
    const average = totalApproved > 0
      ? (approvedReviews ?? []).reduce((sum, review) => sum + review.rating, 0) / totalApproved
      : 0;

    return Response.json({
      stats: {
        average,
        total: totalApproved,
        distribution,
      },
      reviews,
      currentUserReview: ownReview
        ? {
            ...ownReview,
            avatar_url: buildAvatarUrl(ownReview.user_name),
          }
        : null,
      canReview: Boolean(currentUserId) && !ownReview,
      isAuthenticated: Boolean(currentUserId),
    });
  } catch (error) {
    console.error("Error loading place reviews:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const user = await getAuthUser();

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return Response.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    if (!user) {
      return Response.json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" }, { status: 401 });
    }

    const userId = user.id;

    const body = (await request.json()) as {
      rating?: number;
      content?: string;
      imageUrl?: string;
      image_url?: string;
    };

    const rating = Number(body.rating);
    const content = (body.content ?? "").trim();
    const imageUrl = body.imageUrl ?? body.image_url ?? null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return Response.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    if (!content) {
      return Response.json({ error: "Review content is required" }, { status: 400 });
    }

    // Use admin client to bypass RLS policies which might have infinite recursion bugs
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .single();
      
    const userName = profile?.name ?? user.user_metadata?.name ?? "Khách";

    const { data: existingReview, error: existingError } = await supabaseAdmin
      .from("place_reviews")
      .select("id")
      .eq("place_slug", slug)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      console.error("[POST] Error checking existing review:", existingError);
      return Response.json({ error: "Lỗi hệ thống khi kiểm tra đánh giá cũ" }, { status: 500 });
    }

    if (existingReview) {
      return Response.json({ error: "Bạn chỉ được đánh giá mỗi địa điểm một lần" }, { status: 409 });
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("place_reviews")
      .insert({
        place_slug: slug,
        user_id: userId,
        user_name: userName,
        rating,
        content,
        image_url: imageUrl,
        approved: false,
      })
      .select("id, place_slug, user_id, rating, content, image_url, approved, created_at")
      .single();

    if (insertError || !inserted) {
      console.error("Error creating review:", insertError);
      return Response.json({ error: insertError?.message || "Failed to create review" }, { status: 500 });
    }

    return Response.json({
      review: {
        ...inserted,
        user_name: userName,
        avatar_url: buildAvatarUrl(userName),
      },
      message: "Đánh giá đã được gửi và đang chờ duyệt",
    });
  } catch (error) {
    console.error("Error creating place review:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
