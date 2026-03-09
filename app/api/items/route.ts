import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { toDateInputValue } from "@/lib/dates";
import { normalizeAsin } from "@/lib/normalization";
import { getInventoryItems } from "@/lib/queries";
import { parseItemApiInput, toItemDbInput } from "@/lib/item-service";

function parseQueryInt(raw: string | null): number | undefined {
  if (!raw) {
    return undefined;
  }
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : undefined;
}

function revalidateCommonPaths() {
  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath("/needs-attention");
  revalidatePath("/tax-year");
  revalidatePath("/video-tracker");
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const asin = searchParams.get("asin");
  if (asin) {
    const normalizedAsin = normalizeAsin(asin);
    const existingItem = await db.item.findFirst({
      where: { asin: normalizedAsin },
      select: {
        id: true,
        asin: true,
        title: true,
        receivedDate: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      existingItem: existingItem
        ? {
            ...existingItem,
            receivedDate: toDateInputValue(existingItem.receivedDate),
          }
        : null,
    });
  }

  const receivedYear = parseQueryInt(searchParams.get("receivedYear"));
  const soldStatus = (searchParams.get("soldStatus") ?? "all") as
    | "all"
    | "sold"
    | "unsold";
  const acquisitionType = (searchParams.get("acquisitionType") ?? undefined) as
    | "SAMPLE"
    | "PURCHASED"
    | undefined;

  const items = await getInventoryItems({
    receivedYear,
    soldStatus,
    acquisitionType,
    needsAttentionOnly: searchParams.get("needsAttention") === "1",
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  const { data, error } = parseItemApiInput(body);

  if (!data) {
    return NextResponse.json({ error: error ?? "Invalid payload" }, { status: 400 });
  }

  let dbInput: ReturnType<typeof toItemDbInput>;
  try {
    dbInput = toItemDbInput(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid payload" },
      { status: 400 },
    );
  }

  const duplicate = await db.item.findFirst({
    where: {
      asin: dbInput.asin,
    },
    select: {
      id: true,
      asin: true,
      title: true,
      receivedDate: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (duplicate && !data.allowDuplicate) {
    return NextResponse.json(
      {
        error: "DUPLICATE_ASIN",
        message: "Oops - looks like you already added this item.",
        existingItemId: duplicate.id,
        existingTitle: duplicate.title,
        existingReceived: toDateInputValue(duplicate.receivedDate),
      },
      { status: 409 },
    );
  }

  const item = await db.item.create({ data: dbInput });
  revalidateCommonPaths();

  return NextResponse.json({ item }, { status: 201 });
}
