import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/chatbot/db";
import { getCurrentUser } from "@/lib/reviews";

export const dynamic = "force-dynamic";

async function requireAdmin(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "admin") {
    return null;
  }
  return user;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(request);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
  }

  const { id } = await params;
  const body = (await request.json()) as { approved?: boolean };

  const { error } = await supabase.from("blog_comments").update({ approved: Boolean(body.approved) }).eq("id", Number(id));

  if (error) {
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(request);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
  }

  const { id } = await params;
  const { error } = await supabase.from("blog_comments").delete().eq("id", Number(id));

  if (error) {
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
