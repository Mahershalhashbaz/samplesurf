import { NextRequest, NextResponse } from "next/server";

import { lookupAmazonByUrl } from "@/lib/amazon";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url query parameter" }, { status: 400 });
  }

  const result = await lookupAmazonByUrl(url);

  return NextResponse.json({
    asin: result.asin ?? "",
    ...(result.title ? { title: result.title } : {}),
    ...(result.rawTitle ? { rawTitle: result.rawTitle } : {}),
    ...(typeof result.price === "number" ? { price: result.price } : {}),
    source: result.source,
  });
}
