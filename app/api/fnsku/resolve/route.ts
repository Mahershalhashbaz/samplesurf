import { NextRequest, NextResponse } from "next/server";

import { resolveScannableCode } from "@/lib/fnsku-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code query parameter" }, { status: 400 });
  }

  const result = await resolveScannableCode(code);

  return NextResponse.json({
    code: result.inputCode,
    codeKind: result.codeKind,
    asin: result.asin,
    source: result.source,
    message: result.message,
  });
}
