import assert from "node:assert/strict";
import test from "node:test";

import {
  detectScannableCodeKind,
  extractResolvableCodesFromOcrText,
  normalizeScannableCode,
} from "../lib/fnsku";
import { fetchFnskuAsinFromApi } from "../lib/fnsku-service";

test("detects direct ASIN and FNSKU code kinds", () => {
  assert.equal(detectScannableCodeKind("b0abc12345"), "asin");
  assert.equal(detectScannableCodeKind("X00ABC123XYZ"), "fnsku");
  assert.equal(detectScannableCodeKind("sku-123"), "unknown");
});

test("normalizes and extracts resolvable OCR codes in first-seen order", () => {
  const text = `
    slip line BOABC12345
    repeated b0abc12345
    fnsku X00TESTCODE9
    fnsku x00testcode9
    second asin B0ZZZZ9999
  `;

  assert.deepEqual(extractResolvableCodesFromOcrText(text), [
    "B0ABC12345",
    "X00TESTCODE9",
    "B0ZZZZ9999",
  ]);
  assert.equal(normalizeScannableCode(" x00abc123 "), "X00ABC123");
});

test("returns resolved ASIN even when cache persistence fails", async () => {
  const originalWarn = console.warn;
  const warnings: unknown[] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    const result = await fetchFnskuAsinFromApi("X00TESTCODE9", {
      apiKey: "test-key",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: {
              asin: "B0CACHE999",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      persistCache: async () => {
        throw new Error("sqlite is locked");
      },
    });

    assert.equal(result.asin, "B0CACHE999");
    assert.equal(result.source, "api");
    assert.equal(result.message, "ASIN found");
    assert.equal(warnings.length, 1);
  } finally {
    console.warn = originalWarn;
  }
});
