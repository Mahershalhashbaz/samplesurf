import { db } from "./db";
import { detectScannableCodeKind, isDirectAsinCode, normalizeScannableCode } from "./fnsku";

const FNSKU_API_BASE_URL = "https://ato.fnskutoasin.com";
const REQUEST_TIMEOUT_MS = 4500;
const ASIN_VALUE_PATTERN = /^B0[A-Z0-9]{8}$/i;

export type FnskuResolutionSource = "direct" | "cache" | "api" | "unresolved" | "error";

export type FnskuResolutionResult = {
  inputCode: string;
  codeKind: "asin" | "fnsku" | "unknown";
  asin: string | null;
  source: FnskuResolutionSource;
  message: string | null;
};

type FetchImpl = typeof fetch;
type PersistCacheFn = (fnskuCode: string, asin: string) => Promise<void>;

function extractAsinFromUnknown(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim().toUpperCase();
    return ASIN_VALUE_PATTERN.test(trimmed) ? trimmed : null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const asin = extractAsinFromUnknown(entry, depth + 1);
      if (asin) {
        return asin;
      }
    }
    return null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.asin === "string") {
      const asin = extractAsinFromUnknown(record.asin, depth + 1);
      if (asin) {
        return asin;
      }
    }

    for (const nestedValue of Object.values(record)) {
      const asin = extractAsinFromUnknown(nestedValue, depth + 1);
      if (asin) {
        return asin;
      }
    }
  }

  return null;
}

function resolutionMessageFromStatus(status: number): string {
  if (status === 401 || status === 403) {
    return "FNSKU lookup is unavailable right now.";
  }
  if (status === 408 || status === 504) {
    return "FNSKU lookup timed out.";
  }
  if (status === 429) {
    return "FNSKU lookup quota is temporarily unavailable.";
  }
  return "Could not resolve this FNSKU right now.";
}

async function persistFnskuCache(fnskuCode: string, asin: string): Promise<void> {
  await db.fnskuResolutionCache.upsert({
    where: { fnskuCode },
    update: {
      asin,
      resolvedAt: new Date(),
    },
    create: {
      fnskuCode,
      asin,
      resolvedAt: new Date(),
    },
  });
}

export async function fetchFnskuAsinFromApi(
  fnskuCode: string,
  options?: {
    apiKey?: string | null;
    fetchImpl?: FetchImpl;
    persistCache?: PersistCacheFn;
  },
): Promise<FnskuResolutionResult> {
  const apiKey = options?.apiKey ?? process.env.FNSKU_API_KEY?.trim();
  if (!apiKey) {
    return {
      inputCode: fnskuCode,
      codeKind: "fnsku",
      asin: null,
      source: "unresolved",
      message: "FNSKU lookup is not configured.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const fetchImpl = options?.fetchImpl ?? fetch;
  const persistCache = options?.persistCache ?? persistFnskuCache;

  try {
    const response = await fetchImpl(`${FNSKU_API_BASE_URL}/api/v1/ScanTask/AddOrGet`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        "Api-Key": apiKey,
      },
      body: JSON.stringify({
        barcode: fnskuCode,
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      return {
        inputCode: fnskuCode,
        codeKind: "fnsku",
        asin: null,
        source: "error",
        message: resolutionMessageFromStatus(response.status),
      };
    }

    const asin = extractAsinFromUnknown(payload);
    if (!asin) {
      return {
        inputCode: fnskuCode,
        codeKind: "fnsku",
        asin: null,
        source: "unresolved",
        message: "No ASIN was returned for this FNSKU.",
      };
    }

    try {
      await persistCache(fnskuCode, asin);
    } catch (error) {
      console.warn("[fnsku] cache write failed", {
        fnskuCode,
        asin,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      inputCode: fnskuCode,
      codeKind: "fnsku",
      asin,
      source: "api",
      message: "ASIN found",
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    return {
      inputCode: fnskuCode,
      codeKind: "fnsku",
      asin: null,
      source: "error",
      message: isAbort ? "FNSKU lookup timed out." : "Could not resolve this FNSKU right now.",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function resolveScannableCode(rawCode: string): Promise<FnskuResolutionResult> {
  const normalizedCode = normalizeScannableCode(rawCode);
  const codeKind = detectScannableCodeKind(normalizedCode);

  if (codeKind === "unknown") {
    return {
      inputCode: normalizedCode,
      codeKind,
      asin: null,
      source: "unresolved",
      message: null,
    };
  }

  if (isDirectAsinCode(normalizedCode)) {
    return {
      inputCode: normalizedCode,
      codeKind: "asin",
      asin: normalizedCode,
      source: "direct",
      message: "ASIN found",
    };
  }

  const cached = await db.fnskuResolutionCache.findUnique({
    where: {
      fnskuCode: normalizedCode,
    },
  });

  if (cached) {
    return {
      inputCode: normalizedCode,
      codeKind: "fnsku",
      asin: cached.asin,
      source: "cache",
      message: "ASIN found",
    };
  }

  return fetchFnskuAsinFromApi(normalizedCode);
}
