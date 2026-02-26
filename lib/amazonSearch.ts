import { summarizeAmazonTitle } from "./amazonTitle";
import { decodeHtmlEntities } from "./html-entities";

const ASIN_PATH_PATTERN = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i;

export type AmazonSearchResult = {
  title: string;
  asin: string;
  brand?: string;
  url: string;
  imageUrl?: string;
};

export type AmazonSearchResponse = {
  results: AmazonSearchResult[];
  source: "search" | "blocked";
};

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, " ");
}

function cleanText(input: string): string {
  return decodeHtmlEntities(stripTags(input).replace(/\s+/g, " ")).trim();
}

function toAbsoluteAmazonUrl(href: string): string {
  if (/^https?:\/\//i.test(href)) {
    return href;
  }

  if (href.startsWith("/")) {
    return `https://www.amazon.com${href}`;
  }

  return `https://www.amazon.com/${href}`;
}

function toAbsoluteAssetUrl(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return `https://www.amazon.com${trimmed}`;
  }

  return `https://www.amazon.com/${trimmed}`;
}

function extractAttribute(tagAttrs: string, name: string): string | null {
  const match = tagAttrs.match(new RegExp(`${name}\\s*=\\s*([\"'])(.*?)\\1`, "i"));
  if (!match?.[2]) {
    return null;
  }
  return decodeHtmlEntities(match[2]).trim();
}

function extractBrand(summaryTitle: string): string | undefined {
  const marker = " - ";
  const index = summaryTitle.lastIndexOf(marker);
  if (index <= 0 || index >= summaryTitle.length - marker.length) {
    return undefined;
  }
  return summaryTitle.slice(index + marker.length).trim() || undefined;
}

function extractImageUrlFromAnchorHtml(html: string): string | undefined {
  const imageMatch = html.match(/<img\b[^>]*?\bsrc=(["'])(.*?)\1/i);
  if (imageMatch?.[2]) {
    const absolute = toAbsoluteAssetUrl(decodeHtmlEntities(imageMatch[2]));
    return absolute || undefined;
  }

  const lazyImageMatch = html.match(/<img\b[^>]*?\bdata-src=(["'])(.*?)\1/i);
  if (lazyImageMatch?.[2]) {
    const absolute = toAbsoluteAssetUrl(decodeHtmlEntities(lazyImageMatch[2]));
    return absolute || undefined;
  }

  return undefined;
}

function isLikelyProductTitle(title: string): boolean {
  if (title.length < 8) {
    return false;
  }

  if (/^(sponsored|shop on amazon|visit the amazon)/i.test(title)) {
    return false;
  }

  return true;
}

export function extractAmazonSearchResults(html: string): AmazonSearchResult[] {
  const results: AmazonSearchResult[] = [];
  const seenAsins = new Set<string>();
  const anchorRegex = /<a\b([^>]*?)href=(["'])(.*?)\2([^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[3] ?? "";
    const asinMatch = href.match(ASIN_PATH_PATTERN);
    const asin = asinMatch?.[1]?.toUpperCase();
    if (!asin || seenAsins.has(asin)) {
      continue;
    }

    const attrs = `${match[1] ?? ""} ${match[4] ?? ""}`;
    const innerHtml = match[5] ?? "";
    const ariaLabel = extractAttribute(attrs, "aria-label");
    const rawTitle = cleanText(ariaLabel || innerHtml);
    if (!isLikelyProductTitle(rawTitle)) {
      continue;
    }

    const summarized = summarizeAmazonTitle(rawTitle).title || rawTitle;
    const url = toAbsoluteAmazonUrl(href);
    const imageUrl = extractImageUrlFromAnchorHtml(innerHtml);

    seenAsins.add(asin);
    results.push({
      title: summarized,
      asin,
      brand: extractBrand(summarized),
      url,
      imageUrl,
    });

    if (results.length >= 5) {
      break;
    }
  }

  return results;
}

function isBlockedOrUnavailable(html: string): boolean {
  return /captcha|automated access|robot check|sorry, we just need to make sure/i.test(html);
}

export async function searchAmazonByQuery(query: string): Promise<AmazonSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { results: [], source: "blocked" };
  }

  const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(trimmed)}`;
  let response: Response;
  try {
    response = await fetch(searchUrl, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  } catch {
    return { results: [], source: "blocked" };
  }

  if (!response.ok) {
    return { results: [], source: "blocked" };
  }

  let html = "";
  try {
    html = await response.text();
  } catch {
    return { results: [], source: "blocked" };
  }

  if (!html || isBlockedOrUnavailable(html)) {
    return { results: [], source: "blocked" };
  }

  const results = extractAmazonSearchResults(html);
  return {
    results,
    source: results.length > 0 ? "search" : "blocked",
  };
}
