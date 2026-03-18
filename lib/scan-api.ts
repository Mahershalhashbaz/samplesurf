import { NextResponse } from "next/server";

import { buildScanPayload, runOcrOnImage, type OcrScanResult } from "./scan";
import { detectScannableCodeKind, extractResolvableCodesFromOcrText } from "./fnsku";
import { resolveScannableCode, type FnskuResolutionResult } from "./fnsku-service";

const MAX_SCAN_BYTES = 12 * 1024 * 1024;

type OcrRunner = (image: Buffer) => Promise<OcrScanResult>;
type CodeResolver = (code: string) => Promise<FnskuResolutionResult>;

function isImageUpload(value: FormDataEntryValue | null): value is File {
  return value instanceof File;
}

export async function handleScanFormData(
  formData: FormData,
  runOcr: OcrRunner = runOcrOnImage,
  resolveCode: CodeResolver = resolveScannableCode,
) {
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
    const scannedCodes = extractResolvableCodesFromOcrText(text);
    const resolvedAsins = new Set<string>();
    let detectedCode: string | null = scannedCodes[0] ?? null;
    let codeType: "ASIN" | "FNSKU" | null = null;
    let resolutionSource: "direct" | "cache" | "api" | "unresolved" | "error" | null = null;
    let resolutionMessage: string | null = null;
    let fnskuLookups = 0;

    for (const code of scannedCodes) {
      const kind = detectScannableCodeKind(code);
      if (kind === "fnsku" && fnskuLookups >= 3) {
        continue;
      }

      const result = await resolveCode(code);
      if (detectedCode === code) {
        codeType = result.codeKind === "asin" ? "ASIN" : result.codeKind === "fnsku" ? "FNSKU" : null;
        resolutionSource = result.source;
        resolutionMessage = result.message;
      }

      if (result.codeKind === "fnsku") {
        fnskuLookups += 1;
      }

      if (result.asin) {
        resolvedAsins.add(result.asin);
      }
    }

    return NextResponse.json(
      buildScanPayload(text, confidence, {
        asins: Array.from(resolvedAsins),
        detectedCode,
        codeType,
        resolutionSource,
        resolutionMessage,
      }),
    );
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
