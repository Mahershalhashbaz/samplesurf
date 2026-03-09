import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { parseItemPatchInput, toItemDbPatchInput } from "@/lib/item-service";

function revalidateCommonPaths(id: string) {
  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath(`/items/${id}`);
  revalidatePath("/needs-attention");
  revalidatePath("/tax-year");
  revalidatePath("/video-tracker");
}

type Params = {
  params: { id: string };
};

export async function GET(_request: NextRequest, { params }: Params) {
  const item = await db.item.findUnique({ where: { id: params.id } });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ item });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const existing = await db.item.findUnique({
    where: { id: params.id },
    select: { id: true, videoDone: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  const { data, error } = parseItemPatchInput(body);

  if (!data) {
    return NextResponse.json({ error: error ?? "Invalid payload" }, { status: 400 });
  }

  let dbInput: ReturnType<typeof toItemDbPatchInput>;
  try {
    dbInput = toItemDbPatchInput(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid payload" },
      { status: 400 },
    );
  }

  if (data.videoDone !== undefined && data.videoDone !== existing.videoDone) {
    dbInput.videoDoneAt = data.videoDone ? new Date() : null;
  }

  const item = await db.item.update({
    where: { id: params.id },
    data: dbInput,
  });

  revalidateCommonPaths(params.id);

  return NextResponse.json({ item });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const existing = await db.item.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.item.delete({ where: { id: params.id } });
  revalidateCommonPaths(params.id);

  return NextResponse.json({ ok: true });
}
