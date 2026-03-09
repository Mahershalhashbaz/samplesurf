import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { toDateInputValue } from "@/lib/dates";

type Params = {
  params: { id: string };
};

function revalidateCommonPaths(id: string) {
  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath(`/items/${id}`);
  revalidatePath("/needs-attention");
  revalidatePath("/tax-year");
  revalidatePath("/video-tracker");
}

export async function POST(request: Request, { params }: Params) {
  const existing = await db.item.findUnique({
    where: { id: params.id },
    select: { id: true },
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

  const videoDone = (body as { videoDone?: unknown })?.videoDone;
  if (typeof videoDone !== "boolean") {
    return NextResponse.json({ error: "videoDone must be a boolean" }, { status: 400 });
  }

  const item = await db.item.update({
    where: { id: params.id },
    data: {
      videoDone,
      videoDoneAt: videoDone ? new Date() : null,
    },
    select: {
      id: true,
      videoDone: true,
      videoDoneAt: true,
      videoSlaDays: true,
      videoNotes: true,
    },
  });

  revalidateCommonPaths(params.id);

  return NextResponse.json({
    item: {
      ...item,
      videoDoneAt: toDateInputValue(item.videoDoneAt),
    },
  });
}
