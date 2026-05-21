import { NextResponse } from "next/server";

import { getRecommendationSnapshot } from "@/lib/dashboard";

export async function GET() {
  const recommendation = await getRecommendationSnapshot();
  return NextResponse.json(recommendation);
}