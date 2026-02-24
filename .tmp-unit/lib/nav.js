"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNavItemActive = isNavItemActive;
function normalizePathname(pathname) {
    const withoutQuery = pathname.split("?")[0]?.split("#")[0] ?? "";
    if (!withoutQuery) {
        return "/";
    }
    if (withoutQuery !== "/" && withoutQuery.endsWith("/")) {
        return withoutQuery.slice(0, -1);
    }
    return withoutQuery;
}
function isNavItemActive(pathname, href, mode) {
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
