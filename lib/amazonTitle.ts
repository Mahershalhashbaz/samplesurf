const GENERIC_LEADING_WORDS = new Set([
  "a",
  "an",
  "the",
  "new",
  "solar",
  "outdoor",
  "indoor",
  "waterproof",
  "wireless",
  "portable",
  "rechargeable",
  "smart",
  "kids",
  "men",
  "women",
]);

const DESCRIPTOR_HINTS =
  /(garden|yard|porch|waterproof|auto|on\/off|birthday|gift|lover|decor|outdoor|indoor|carry on|fits under)/i;

function cleanWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function stripAmazonBranding(rawTitle: string): string {
  const cleaned = rawTitle
    .replace(/\bAmazon\.com\s*[:\-|]\s*/gi, "")
    .replace(/\s*[:\-|]\s*Amazon\.com\b/gi, "")
    .replace(/\bAmazon\.com\b/gi, "")
    .replace(/\s*[|:-]\s*Amazon(?:\.[A-Za-z.]+)?\s*$/i, "")
    .replace(/\s*on Amazon(?:\.[A-Za-z.]+)?\s*$/i, "");

  return cleanWhitespace(cleaned);
}

function looksLikeBrandToken(token: string): boolean {
  return /^[A-Za-z][A-Za-z0-9&'.-]{1,14}$/.test(token);
}

function truncateAtWordBoundary(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const slice = value.slice(0, maxLength + 1);
  const boundary = slice.lastIndexOf(" ");
  if (boundary <= 0) {
    return value.slice(0, maxLength).trim();
  }

  return slice.slice(0, boundary).trim();
}

function extractLeadingBrand(leftSegment: string): { brand: string | null; product: string } {
  const words = leftSegment.split(" ").filter(Boolean);
  if (words.length < 3) {
    return { brand: null, product: leftSegment };
  }

  const first = words[0] ?? "";
  if (!looksLikeBrandToken(first) || GENERIC_LEADING_WORDS.has(first.toLowerCase())) {
    return { brand: null, product: leftSegment };
  }

  return {
    brand: first,
    product: words.slice(1).join(" "),
  };
}

function extractTrailingBrand(value: string): { brand: string | null; product: string } {
  const byMatch = value.match(/^(.*)\s+by\s+([A-Za-z][A-Za-z0-9&'.-]{1,20})$/i);
  if (!byMatch?.[1] || !byMatch[2]) {
    return { brand: null, product: value };
  }

  return {
    brand: byMatch[2],
    product: byMatch[1].trim(),
  };
}

function trimDescriptorTail(product: string): string {
  const commaParts = product.split(",");
  if (commaParts.length > 1) {
    const first = commaParts[0]?.trim() ?? "";
    const remainder = commaParts.slice(1).join(", ");
    const looksLikeSpecTail = /^\s*\d/.test(remainder.trim());
    if (first && (DESCRIPTOR_HINTS.test(remainder) || looksLikeSpecTail)) {
      return first;
    }
  }

  return product;
}

function trimTrailingCountPhrase(product: string): string {
  const withoutCount = product.replace(
    /(?:[\s,/-]+)\d+\s*(?:count|ct|loads?|pack|packs|pcs?|pieces)\s*$/i,
    "",
  );
  return cleanWhitespace(withoutCount);
}

export function summarizeAmazonTitle(rawTitle: string): { title: string; rawTitle: string } {
  const stripped = stripAmazonBranding(rawTitle);
  if (!stripped) {
    return { title: "", rawTitle };
  }

  const dashParts = stripped.split(/\s+–\s+/);
  const leftSide = cleanWhitespace(dashParts[0] ?? stripped);

  const trailing = extractTrailingBrand(leftSide);
  const leading = trailing.brand ? { brand: trailing.brand, product: trailing.product } : extractLeadingBrand(leftSide);

  let product = trimDescriptorTail(cleanWhitespace(leading.product));
  product = trimTrailingCountPhrase(product);
  product = truncateAtWordBoundary(product, 50);

  const brand = leading.brand ? cleanWhitespace(leading.brand) : null;
  if (brand && product) {
    return { title: `${product} - ${brand}`, rawTitle };
  }

  return { title: product || stripped, rawTitle };
}
