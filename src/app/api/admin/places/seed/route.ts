import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/reviews";
import { seedPlacesFromFallback } from "@/lib/places";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const count = await seedPlacesFromFallback();
  return NextResponse.json({ success: true, count });
}
