import { handleScanFormData } from "@/lib/scan-api";
import { preprocessImageForOcr, resolveTesseractNodeWorkerPath, type OcrScanResult } from "@/lib/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function runOcrWithNodeWorker(sourceImage: Buffer): Promise<OcrScanResult> {
  const image = await preprocessImageForOcr(sourceImage);
  const workerPath = resolveTesseractNodeWorkerPath();

  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, { workerPath });

  try {
    const { data } = await worker.recognize(image);
    return {
      text: data.text ?? "",
      confidence: typeof data.confidence === "number" ? data.confidence : null,
    };
  } finally {
    await worker.terminate();
  }
}

export async function POST(request: Request) {
  console.info("[api/scan] request received");
  const formData = await request.formData();
  return handleScanFormData(formData, async (image) => {
    console.info("[api/scan] OCR start");
    const result = await runOcrWithNodeWorker(image);
    console.info("[api/scan] OCR finish");
    return result;
  });
}
