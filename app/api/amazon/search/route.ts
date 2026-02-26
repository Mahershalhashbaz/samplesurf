import { NextRequest, NextResponse } from "next/server";

import { searchAmazonByQuery } from "@/lib/amazonSearch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters." }, { status: 400 });
  }

  const result = await searchAmazonByQuery(query);
  return NextResponse.json(result);
}
