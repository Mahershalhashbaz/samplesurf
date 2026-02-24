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
  const existing = await db.item.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const item = await db.item.update({
    where: { id: params.id },
    data: {
      dispositionType: "SOLD",
      soldDate: existing.soldDate ?? todayUtcDateOnly(),
    },
  });

  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath(`/items/${params.id}`);
  revalidatePath("/needs-attention");
  revalidatePath("/tax-year");

  return NextResponse.json({ item });
}
