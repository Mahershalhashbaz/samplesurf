import { existsSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

// OCR often confuses zero and O, so accept B0/BO and normalize to B0.
const ASIN_FROM_OCR_PATTERN = /\bB[0O][A-Z0-9]{8}\b/gi;

export type OcrScanResult = {
  text: string;
  confidence: number | null;
};

export type ScanPayload = {
  ok: true;
  asins: string[];
  ocrTextSnippet: string;
  titleCandidate: string | null;
  suggestedTitle: string | null;
  confidence: number | null;
};

function normalizeOcrSnippet(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 200);
}

function cleanOcrLine(input: string): string {
  return input
    .replace(/\bamazon\.com\s*[:|\-]?\s*/gi, "")
    .replace(/[•|]+/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/^[\s\-:.,;#]+|[\s\-:.,;#]+$/g, "")
    .trim();
}

function normalizeTitleCandidate(input: string): string {
  return cleanOcrLine(input)
    .replace(/^[1Il|]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeCodeLine(value: string): boolean {
  if (/\b(?:B|X)0[A-Z0-9]{7,}\b/i.test(value)) {
    return true;
  }
  if (/\b(?:1Z|TBA|USPS|UPS|FEDEX)\b/i.test(value)) {
    return true;
  }

  const denseCodeTokens = value.match(/\b[A-Z0-9-]{10,}\b/g) ?? [];
  return denseCodeTokens.length > 0;
}

function containsBlacklistedKeyword(value: string): boolean {
  return /\b(order|shipment|tracking|carrier|qty|deliver(?:ed|y)?|date|time|total|totals|subtotal)\b/i.test(
    value,
  );
}

function isLogisticsLine(value: string): boolean {
  return /\b(order\s*(id|no\.?|number)?|shipment|tracking|carrier|deliver(?:ed|y)?|estimated|arrival|date|time|subtotal|total|tax)\b/i.test(
    value,
  );
}

function isCodeishLine(value: string): boolean {
  const cleaned = value.trim();
  if (!cleaned) {
    return false;
  }

  if (isLogisticsLine(cleaned)) {
    return true;
  }

  if (/\b[A-Z0-9-]{10,}\b/.test(cleaned)) {
    return true;
  }

  const letters = (cleaned.match(/[A-Za-z]/g) ?? []).length;
  const uppercase = (cleaned.match(/[A-Z]/g) ?? []).length;
  const digits = (cleaned.match(/[0-9]/g) ?? []).length;
  const hyphens = (cleaned.match(/-/g) ?? []).length;
  const compact = cleaned.replace(/\s+/g, "");
  const symbolRatio = compact.length > 0 ? (digits + hyphens) / compact.length : 0;

  if (compact.length <= 26 && digits >= 4) {
    return true;
  }

  if (compact.length <= 30 && uppercase >= 6 && symbolRatio > 0.25 && letters > 0 && uppercase / letters > 0.8) {
    return true;
  }

  if (letters > 0 && uppercase / letters > 0.8 && digits / Math.max(cleaned.length, 1) > 0.2) {
    return true;
  }

  return false;
}

function isNaturalLanguageLine(value: string): boolean {
  const cleaned = value.trim();
  if (!cleaned || isCodeishLine(cleaned)) {
    return false;
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    return false;
  }

  const letters = (cleaned.match(/[A-Za-z]/g) ?? []).length;
  const digits = (cleaned.match(/[0-9]/g) ?? []).length;
  const alnum = (cleaned.match(/[A-Za-z0-9]/g) ?? []).length;
  if (letters < 8) {
    return false;
  }

  if (alnum > 0 && letters / alnum < 0.55) {
    return false;
  }

  if (digits > letters) {
    return false;
  }

  return true;
}

function extractTitleFromQtyItemSection(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => cleanOcrLine(line))
    .filter(Boolean);
  if (lines.length === 0) {
    return null;
  }

  const qtyItemHeaderPattern = /\b(?:qty|qly|oty|qtv|quantity)\b.*\bitem\b|\bitem\b.*\b(?:qty|qly|oty|qtv|quantity)\b/i;
  const headerIndex = lines.findIndex((line) => qtyItemHeaderPattern.test(line));
  if (headerIndex < 0) {
    return null;
  }

  const searchEnd = Math.min(lines.length, headerIndex + 12);
  let rowStartIndex = -1;
  for (let index = headerIndex + 1; index < searchEnd; index += 1) {
    const line = lines[index] ?? "";
    if (/^[1Il|](?:\s|$)/.test(line.trim())) {
      rowStartIndex = index;
      break;
    }
  }

  if (rowStartIndex < 0) {
    return null;
  }

  const firstLine = (lines[rowStartIndex] ?? "").replace(/^[1Il|](?:\s+|$)/, "").trim();
  const titleParts: string[] = [];
  if (isNaturalLanguageLine(firstLine)) {
    titleParts.push(firstLine);
  }

  for (let index = rowStartIndex + 1; index < Math.min(lines.length, rowStartIndex + 4); index += 1) {
    const line = lines[index] ?? "";
    if (!line) {
      continue;
    }

    if (isCodeishLine(line)) {
      break;
    }

    if (isNaturalLanguageLine(line)) {
      titleParts.push(line);
    } else if (titleParts.length > 0) {
      break;
    }
  }

  if (titleParts.length === 0) {
    return null;
  }

  return titleParts.join(" ").replace(/\s+/g, " ").trim().slice(0, 140) || null;
}

type TitleCandidate = {
  text: string;
  markerBoost: boolean;
};

function buildTitleCandidates(text: string): TitleCandidate[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => cleanOcrLine(line))
    .filter(Boolean);

  const candidates: TitleCandidate[] = [];
  const markerPattern = /\b(item|description|product)\b/i;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!line) {
      continue;
    }

    const markerMatch = line.match(/(?:item|description|product)\s*[:\-]\s*(.+)$/i);
    if (markerMatch?.[1]) {
      candidates.push({ text: cleanOcrLine(markerMatch[1]), markerBoost: true });
      continue;
    }

    if (markerPattern.test(line)) {
      const nextLine = lines[index + 1];
      if (nextLine) {
        candidates.push({ text: nextLine, markerBoost: true });
      }
    }

    candidates.push({ text: line, markerBoost: false });
  }

  return candidates.filter((candidate) => candidate.text.length > 0);
}

function scoreTitleCandidate(candidate: TitleCandidate): number {
  const value = candidate.text;
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    return -10;
  }

  if (looksLikeCodeLine(value)) {
    return -10;
  }

  const alnumChars = value.replace(/[^A-Za-z0-9]/g, "");
  const letterChars = value.replace(/[^A-Za-z]/g, "");
  const digitChars = value.replace(/[^0-9]/g, "");
  const letterRatio = alnumChars.length > 0 ? letterChars.length / alnumChars.length : 0;
  const digitRatio = alnumChars.length > 0 ? digitChars.length / alnumChars.length : 1;
  if (letterRatio < 0.55) {
    return -10;
  }

  if (containsBlacklistedKeyword(value)) {
    return -10;
  }

  let score = 0;
  score += Math.min(words.length, 6);
  score += candidate.markerBoost ? 4 : 0;
  if (value.length >= 12 && value.length <= 90) {
    score += 2;
  }
  if (digitRatio > 0.35) {
    score -= 2;
  }

  return score;
}

export function extractSuggestedTitleFromOcrText(text: string): string | null {
  const qtyItemTitle = extractTitleFromQtyItemSection(text);
  if (qtyItemTitle) {
    const normalized = normalizeTitleCandidate(qtyItemTitle);
    return normalized || null;
  }

  const candidates = buildTitleCandidates(text);
  if (candidates.length === 0) {
    return null;
  }

  let best: { candidate: TitleCandidate; score: number } | null = null;
  for (const candidate of candidates) {
    const score = scoreTitleCandidate(candidate);
    if (score < 4) {
      continue;
    }
    if (!best || score > best.score) {
      best = { candidate, score };
    }
  }

  if (!best) {
    return null;
  }

  const normalized = normalizeTitleCandidate(best.candidate.text.slice(0, 90));
  return normalized || null;
}

export function extractAsinsFromOcrText(text: string): string[] {
  const matches = text.matchAll(ASIN_FROM_OCR_PATTERN);
  const seen = new Set<string>();
  const asins: string[] = [];

  for (const match of matches) {
    let asin = (match[0] ?? "").toUpperCase();
    if (asin.length === 10) {
      asin = `B0${asin.slice(2)}`;
    }
    if (!asin || seen.has(asin)) {
      continue;
    }
    seen.add(asin);
    asins.push(asin);
  }

  return asins;
}

export function buildScanPayload(text: string, confidence: number | null): ScanPayload {
  const titleCandidate = extractSuggestedTitleFromOcrText(text);
  return {
    ok: true,
    asins: extractAsinsFromOcrText(text),
    ocrTextSnippet: normalizeOcrSnippet(text),
    titleCandidate,
    suggestedTitle: titleCandidate,
    confidence: Number.isFinite(confidence) ? Number(confidence?.toFixed(2)) : null,
  };
}

async function preprocessForOcr(sourceImage: Buffer): Promise<Buffer> {
  return sharp(sourceImage)
    .rotate()
    .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
    .grayscale()
    .normalize()
    .linear(1.22, -12)
    .sharpen()
    .png({ quality: 100 })
    .toBuffer();
}

export function resolveTesseractNodeWorkerPath(): string {
  const distPath = path.join(
    process.cwd(),
    "node_modules/tesseract.js/dist/worker/node/index.js",
  );
  if (existsSync(distPath)) {
    return distPath;
  }

  const srcPath = path.join(
    process.cwd(),
    "node_modules/tesseract.js/src/worker-script/node/index.js",
  );
  if (existsSync(srcPath)) {
    return srcPath;
  }

  return distPath;
}

export async function preprocessImageForOcr(sourceImage: Buffer): Promise<Buffer> {
  return preprocessForOcr(sourceImage);
}

export async function runOcrOnImage(sourceImage: Buffer): Promise<OcrScanResult> {
  const image = await preprocessForOcr(sourceImage);
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
