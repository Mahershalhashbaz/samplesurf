const AMAZON_ASIN_PATTERN = /^B0[A-Z0-9]{8}$/i;

export function isAmazonDetailAsin(asin: string | null | undefined): boolean {
  return AMAZON_ASIN_PATTERN.test((asin ?? "").trim());
}

export function buildAmazonDetailUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin.trim().toUpperCase()}`;
}
