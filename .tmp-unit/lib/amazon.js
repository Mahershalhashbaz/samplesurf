"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractAsinFromAmazonUrl = extractAsinFromAmazonUrl;
exports.lookupAmazonByUrl = lookupAmazonByUrl;
const amazonTitle_1 = require("./amazonTitle");
const html_entities_1 = require("./html-entities");
const ASIN_REGEX = /^[A-Z0-9]{10}$/i;
function toUrl(raw) {
    const trimmed = raw.trim();
    if (!trimmed) {
        return null;
    }
    try {
        return new URL(trimmed);
    }
    catch {
        try {
            return new URL(`https://${trimmed}`);
        }
        catch {
            return null;
        }
    }
}
function isAmazonHost(hostname) {
    const host = hostname.toLowerCase();
    return host === "a.co" || host.endsWith(".a.co") || host.includes("amazon.");
}
function normalizeAsin(value) {
    if (!ASIN_REGEX.test(value)) {
        return null;
    }
    return value.toUpperCase();
}
function extractAsinFromPath(pathname) {
    const decodedPath = decodeURIComponent(pathname);
    const patterns = [/\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i, /\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i];
    for (const pattern of patterns) {
        const match = decodedPath.match(pattern);
        if (match?.[1]) {
            return match[1].toUpperCase();
        }
    }
    const segments = decodedPath.split("/").filter(Boolean);
    for (const segment of segments) {
        const normalized = normalizeAsin(segment);
        if (normalized) {
            return normalized;
        }
    }
    return null;
}
function extractAsinFromAmazonUrl(rawUrl) {
    const parsed = toUrl(rawUrl);
    if (!parsed) {
        return null;
    }
    if (!isAmazonHost(parsed.hostname)) {
        return null;
    }
    return extractAsinFromPath(parsed.pathname);
}
function parseTagAttributes(tag) {
    const attributes = {};
    const attrPattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let match;
    while ((match = attrPattern.exec(tag)) !== null) {
        const key = match[1]?.toLowerCase();
        const value = match[2] ?? match[3] ?? "";
        if (key) {
            attributes[key] = value;
        }
    }
    return attributes;
}
function findMetaContent(html, matchers) {
    const tags = html.match(/<meta\s+[^>]*>/gi) ?? [];
    for (const tag of tags) {
        const attrs = parseTagAttributes(tag);
        const content = attrs.content?.trim();
        if (!content) {
            continue;
        }
        for (const matcher of matchers) {
            if ((attrs[matcher.attr] ?? "").toLowerCase() === matcher.value.toLowerCase()) {
                return content;
            }
        }
    }
    return null;
}
function extractTitle(html) {
    const ogTitle = findMetaContent(html, [{ attr: "property", value: "og:title" }]);
    if (ogTitle) {
        return ogTitle;
    }
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    if (!titleTag) {
        return null;
    }
    return titleTag || null;
}
function parsePrice(raw) {
    const match = raw.replace(/,/g, "").match(/-?\d+(?:\.\d{1,2})?/);
    if (!match) {
        return null;
    }
    const parsed = Number.parseFloat(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
}
function extractPrice(html) {
    const metaPrice = findMetaContent(html, [
        { attr: "property", value: "product:price:amount" },
        { attr: "property", value: "og:price:amount" },
        { attr: "name", value: "twitter:data1" },
        { attr: "itemprop", value: "price" },
    ]);
    if (metaPrice) {
        const parsed = parsePrice(metaPrice);
        if (parsed !== null) {
            return parsed;
        }
    }
    const offscreenPrice = html.match(/<span[^>]*class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*([^<]+?)\s*<\/span>/i)?.[1];
    if (offscreenPrice) {
        const parsed = parsePrice(offscreenPrice);
        if (parsed !== null) {
            return parsed;
        }
    }
    const jsonPrice = html.match(/"price"\s*:\s*"?([$€£]?\d[\d,]*(?:\.\d{1,2})?)"?/i)?.[1];
    if (jsonPrice) {
        return parsePrice(jsonPrice);
    }
    return null;
}
function isBlockedOrUnavailable(html) {
    return /captcha|automated access|robot check|sorry, we just need to make sure/i.test(html);
}
async function lookupAmazonByUrl(rawUrl) {
    const parsedUrl = toUrl(rawUrl);
    if (!parsedUrl) {
        return { asin: null, source: "blocked" };
    }
    const requestedUrl = parsedUrl.toString();
    const initialAsin = extractAsinFromAmazonUrl(requestedUrl);
    let response;
    try {
        response = await fetch(requestedUrl, {
            method: "GET",
            redirect: "follow",
            cache: "no-store",
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });
    }
    catch {
        return { asin: initialAsin, source: "blocked" };
    }
    const finalUrl = response.url || requestedUrl;
    const asin = extractAsinFromAmazonUrl(finalUrl) ?? initialAsin;
    if (!asin || !response.ok) {
        return { asin, source: "blocked" };
    }
    let html;
    try {
        html = await response.text();
    }
    catch {
        return { asin, source: "blocked" };
    }
    if (!html || isBlockedOrUnavailable(html)) {
        return { asin, source: "blocked" };
    }
    const extractedTitle = extractTitle(html);
    const decodedTitle = extractedTitle ? (0, html_entities_1.decodeHtmlEntities)(extractedTitle) : null;
    const titleSummary = decodedTitle ? (0, amazonTitle_1.summarizeAmazonTitle)(decodedTitle) : null;
    const price = extractPrice(html);
    if (!titleSummary?.title && price === null) {
        return { asin, source: "blocked" };
    }
    return {
        asin,
        ...(titleSummary?.title ? { title: titleSummary.title } : {}),
        ...(titleSummary?.rawTitle ? { rawTitle: titleSummary.rawTitle } : {}),
        ...(price !== null ? { price } : {}),
        source: finalUrl !== requestedUrl ? "redirected" : "page",
    };
}
