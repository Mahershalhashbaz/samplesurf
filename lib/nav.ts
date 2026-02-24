export type NavMatchMode = "exact" | "prefix";

function normalizePathname(pathname: string): string {
  const withoutQuery = pathname.split("?")[0]?.split("#")[0] ?? "";
  if (!withoutQuery) {
    return "/";
  }

  if (withoutQuery !== "/" && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }

  return withoutQuery;
}

export function isNavItemActive(pathname: string, href: string, mode: NavMatchMode): boolean {
  const normalizedPath = normalizePathname(pathname);
  const normalizedHref = normalizePathname(href);

  if (mode === "exact") {
    return normalizedPath === normalizedHref;
  }

  if (normalizedHref === "/") {
    return normalizedPath === "/";
  }

  return normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`);
}
