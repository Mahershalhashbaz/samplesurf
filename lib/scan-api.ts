import { NextResponse } from "next/server";

import { buildScanPayload, runOcrOnImage, type OcrScanResult } from "./scan";

const MAX_SCAN_BYTES = 12 * 1024 * 1024;

type OcrRunner = (image: Buffer) => Promise<OcrScanResult>;

function isImageUpload(value: FormDataEntryValue | null): value is File {
  return value instanceof File;
}

export async function handleScanFormData(formData: FormData, runOcr: OcrRunner = runOcrOnImage) {
  const imageEntry = formData.get("image");
  if (!isImageUpload(imageEntry)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  if (!imageEntry.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are supported" }, { status: 400 });
  }

  const imageBytes = await imageEntry.arrayBuffer();
  if (imageBytes.byteLength === 0) {
    return NextResponse.json({ error: "Image is empty" }, { status: 400 });
  }

  if (imageBytes.byteLength > MAX_SCAN_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 12MB)" }, { status: 400 });
  }

  try {
    const { text, confidence } = await runOcr(Buffer.from(imageBytes));
    return NextResponse.json(buildScanPayload(text, confidence));
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "SCAN_FAILED",
        message: "Could not read this photo. Retake with the slip centered and well-lit.",
      },
      { status: 500 },
    );
  }
}
