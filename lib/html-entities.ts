const NAMED_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  quot: '"',
  lt: "<",
  gt: ">",
  nbsp: " ",
};

export function decodeHtmlEntities(input: string): string {
  if (!input || !input.includes("&")) {
    return input;
  }

  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, entity: string) => {
    const normalized = entity.toLowerCase();

    if (normalized.startsWith("#x")) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : full;
    }

    if (normalized.startsWith("#")) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : full;
    }

    return NAMED_ENTITY_MAP[normalized] ?? full;
  });
}
