import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";

type Params = {
  params: { id: string };
};

function todayUtcDateOnly() {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
}

export async function POST(_request: Request, { params }: Params) {
  const original = await db.item.findUnique({ where: { id: params.id } });
  if (!original) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const duplicate = await db.item.create({
    data: {
      asin: original.asin,
      title: original.title,
      acquisitionType: original.acquisitionType,
      dispositionType: "KEPT",
      videoDone: false,
      videoDoneAt: null,
      videoSlaDays: original.videoSlaDays,
      videoNotes: null,
      receivedDate: todayUtcDateOnly(),
      receiptValueCents: original.receiptValueCents,
      currency: original.currency,
      soldDate: null,
      saleProceedsCents: null,
      notes: original.notes,
    },
  });

  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath("/needs-attention");
  revalidatePath("/tax-year");
  revalidatePath("/video-tracker");

  return NextResponse.json({ item: duplicate }, { status: 201 });
}
