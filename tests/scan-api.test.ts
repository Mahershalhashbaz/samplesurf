import assert from "node:assert/strict";
import test from "node:test";

import { handleScanFormData } from "../lib/scan-api";

test("scan API handler returns unique ASIN list from OCR text", async () => {
  const formData = new FormData();
  formData.set("image", new File([Buffer.from("fake-image")], "scan.jpg", { type: "image/jpeg" }));

  const response = await handleScanFormData(formData, async () => ({
    text: "Found B0TEST1234 and b0test1234 and B0NEXT5678 in the capture.",
    confidence: 87.6,
  }));

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    ok: boolean;
    asins: string[];
    ocrTextSnippet: string;
    titleCandidate: string | null;
    confidence: number | null;
    codeType: "ASIN" | "FNSKU" | null;
  };

  assert.equal(payload.ok, true);
  assert.deepEqual(payload.asins, ["B0TEST1234", "B0NEXT5678"]);
  assert.equal(typeof payload.ocrTextSnippet, "string");
  assert.equal(payload.titleCandidate, null);
  assert.equal(payload.codeType, "ASIN");
});

test("scan API resolves X00 FNSKU codes through resolver before returning ASINs", async () => {
  const formData = new FormData();
  formData.set("image", new File([Buffer.from("fake-image")], "scan.jpg", { type: "image/jpeg" }));

  const response = await handleScanFormData(
    formData,
    async () => ({
      text: "Label text X00TESTCODE9 near item details",
      confidence: 90.1,
    }),
    async (code) => ({
      inputCode: code,
      codeKind: "fnsku",
      asin: "B0RESOLVE9",
      source: "api",
      message: "ASIN found",
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    asins: string[];
    detectedCode: string | null;
    codeType: "ASIN" | "FNSKU" | null;
    resolutionSource: string | null;
    resolutionMessage: string | null;
  };

  assert.deepEqual(payload.asins, ["B0RESOLVE9"]);
  assert.equal(payload.detectedCode, "X00TESTCODE9");
  assert.equal(payload.codeType, "FNSKU");
  assert.equal(payload.resolutionSource, "api");
  assert.equal(payload.resolutionMessage, "ASIN found");
});
