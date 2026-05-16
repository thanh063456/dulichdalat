import { NextResponse } from "next/server";
import { getPlaces } from "@/lib/places";

export const dynamic = "force-dynamic";

export async function GET() {
  const places = await getPlaces();
  return NextResponse.json({ places });
}
