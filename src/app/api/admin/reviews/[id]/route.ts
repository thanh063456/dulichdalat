import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/reviews";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return Response.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { id } = await params;
  const body = (await request.json()) as { approved?: boolean };

  const { error } = await supabaseAdmin
    .from("place_reviews")
    .update({ approved: Boolean(body.approved), updated_at: new Date().toISOString() })
    .eq("id", Number(id));

  if (error) {
    return Response.json({ error: "Failed to update review" }, { status: 500 });
  }

  return Response.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return Response.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { id } = await params;

  const { error } = await supabaseAdmin.from("place_reviews").delete().eq("id", Number(id));

  if (error) {
    return Response.json({ error: "Failed to delete review" }, { status: 500 });
  }

  return Response.json({ success: true });
}
