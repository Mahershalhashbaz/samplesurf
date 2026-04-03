"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUp,
  Box,
  Clapperboard,
  DatabaseBackup,
  FileUp,
  LayoutDashboard,
  Menu,
  Moon,
  PlusCircle,
  ReceiptText,
  Sun,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { isNavItemActive, type NavMatchMode } from "@/lib/nav";
import { currentTaxYear, TAX_YEAR_STORAGE_KEY } from "@/lib/year";

const THEME_STORAGE_KEY = "samplesurf.theme";

const navItems: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  matchMode: NavMatchMode;
}> = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, matchMode: "exact" },
  { href: "/items/new", label: "Add Item", icon: PlusCircle, matchMode: "exact" },
  { href: "/items", label: "Inventory", icon: Box, matchMode: "exact" },
  { href: "/video-tracker", label: "Video Tracker", icon: Clapperboard, matchMode: "exact" },
  { href: "/tax-year", label: "Tax Year", icon: ReceiptText, matchMode: "exact" },
  { href: "/needs-attention", label: "Needs Attention", icon: AlertTriangle, matchMode: "exact" },
  { href: "/import", label: "Import", icon: FileUp, matchMode: "exact" },
  { href: "/backup", label: "Backup", icon: DatabaseBackup, matchMode: "exact" },
];

function parseYear(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 1900 || parsed > 9999) return null;
  return parsed;
}

function hrefWithYear(href: string, year: number): string {
  const [path, query] = href.split("?");
  const params = new URLSearchParams(query ?? "");
  params.set("year", String(year));
  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [storedYear, setStoredYear] = useState<number | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);
  const searchString = searchParams.toString();
  const showGlobalQuickAdd = pathname !== "/items/new" && !mobileNavOpen;
  const isItemDetailPage = pathname.startsWith("/items/") && pathname !== "/items" && pathname !== "/items/new";
  const showFloatingScrollTop = pathname !== "/" && !mobileNavOpen && showScrollTopButton;
  const showFloatingBack = pathname !== "/" && !mobileNavOpen && showBackButton;

  const rawYear = searchParams.get("year");
  const urlYear = parseYear(rawYear);
  const activeYear = useMemo(() => urlYear ?? storedYear ?? currentTaxYear(), [storedYear, urlYear]);
  const yearOptions = useMemo(() => {
    const current = currentTaxYear();
    const years = new Set<number>();
    for (let year = current - 3; year <= current + 3; year += 1) {
      years.add(year);
    }
    years.add(activeYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [activeYear]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromStorage = parseYear(window.localStorage.getItem(TAX_YEAR_STORAGE_KEY));
    setStoredYear(fromStorage);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initialDark = storedTheme ? storedTheme === "dark" : media.matches;
    root.classList.toggle("dark", initialDark);
    setIsDarkTheme(initialDark);

    function onSystemChange(event: MediaQueryListEvent) {
      if (window.localStorage.getItem(THEME_STORAGE_KEY)) {
        return;
      }
      root.classList.toggle("dark", event.matches);
      setIsDarkTheme(event.matches);
    }

    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (urlYear !== null) {
      window.localStorage.setItem(TAX_YEAR_STORAGE_KEY, String(urlYear));
      setStoredYear(urlYear);
      return;
    }

    const fallback = storedYear ?? currentTaxYear();
    window.localStorage.setItem(TAX_YEAR_STORAGE_KEY, String(fallback));

    const params = new URLSearchParams(searchString);
    params.set("year", String(fallback));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchString, storedYear, urlYear]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const body = window.document.body;
    if (mobileNavOpen) {
      body.style.overflow = "hidden";
    } else {
      body.style.overflow = "";
    }

    return () => {
      body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, searchString]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function onScroll() {
      const nextTop = window.scrollY > 240;
      const nextBack = window.scrollY > Math.max(420, Math.round(window.innerHeight * 0.75));
      setShowScrollTopButton(nextTop);
      setShowBackButton(nextBack);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  function applyYear(parsed: number) {
    window.localStorage.setItem(TAX_YEAR_STORAGE_KEY, String(parsed));
    setStoredYear(parsed);

    const params = new URLSearchParams(searchString);
    params.set("year", String(parsed));
    router.push(`${pathname}?${params.toString()}`);
  }

  function onChangeYear(rawValue: string) {
    const parsed = parseYear(rawValue);
    if (parsed === null || parsed === activeYear) {
      return;
    }
    applyYear(parsed);
  }

  function toggleTheme() {
    const nextDark = !isDarkTheme;
    setIsDarkTheme(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextDark ? "dark" : "light");
  }

  function onScrollTopClick() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onBackClick() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    if (isItemDetailPage) {
      router.push(hrefWithYear("/items", activeYear));
      return;
    }

    router.push(hrefWithYear("/", activeYear));
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] p-3 md:p-8">
      <header className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-4 shadow-soft md:px-6 md:py-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(115,91,255,0.22),_rgba(115,91,255,0)_70%)]" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(255,124,87,0.20),_rgba(255,124,87,0)_70%)]" />

        <div className="relative md:hidden">
          <div className="flex items-center justify-between gap-2">
            <button
              aria-label="Open navigation"
              className="btn-secondary inline-flex h-10 w-10 items-center justify-center p-0"
              onClick={() => setMobileNavOpen(true)}
              type="button"
            >
              <Menu aria-hidden="true" size={18} />
            </button>

            <Link className="flex min-w-0 items-center gap-2" href={hrefWithYear("/", activeYear)}>
              <Image
                alt="SampleSurf logo"
                className="h-10 w-10 rounded-xl object-cover"
                height={40}
                priority
                src="/samplesurf-logo-rounded.png"
                width={40}
              />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-ink">SampleSurf</p>
              </div>
            </Link>

            <button
              aria-label={`Switch to ${isDarkTheme ? "light" : "dark"} mode`}
              className="theme-icon-toggle shrink-0"
              data-dark={isDarkTheme}
              onClick={toggleTheme}
              title={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
              type="button"
            >
              {isDarkTheme ? <Sun aria-hidden="true" size={16} /> : <Moon aria-hidden="true" size={16} />}
              <span className="sr-only">Toggle color mode</span>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-2 rounded-xl border border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/10 p-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink/80" htmlFor="global-tax-year-mobile">
              Tax Year
            </label>
            <select
              className="h-10 min-w-0"
              id="global-tax-year-mobile"
              onChange={(event) => onChangeYear(event.target.value)}
              value={String(activeYear)}
            >
              {yearOptions.map((year) => (
                <option key={`mobile-year-${year}`} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative hidden flex-wrap items-center justify-between gap-4 md:flex">
          <Link className="flex items-center gap-4" href={hrefWithYear("/", activeYear)}>
            <Image
              alt="SampleSurf logo"
              className="h-[56px] w-[56px] rounded-xl object-cover"
              height={56}
              priority
              src="/samplesurf-logo-rounded.png"
              width={56}
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate1">SampleSurf</p>
              <h1 className="text-3xl font-semibold text-ink">SampleSurf</h1>
            </div>
          </Link>
          <div className="flex max-w-full items-center gap-2 rounded-full border border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/10 px-3 py-2">
            <button
              aria-label={`Switch to ${isDarkTheme ? "light" : "dark"} mode`}
              className="theme-icon-toggle shrink-0"
              data-dark={isDarkTheme}
              onClick={toggleTheme}
              title={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
              type="button"
            >
              {isDarkTheme ? <Sun aria-hidden="true" size={16} /> : <Moon aria-hidden="true" size={16} />}
              <span className="sr-only">Toggle color mode</span>
            </button>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink/80" htmlFor="global-tax-year">
              Tax Year
            </label>
            <select
              className="w-28"
              data-testid="global-tax-year"
              id="global-tax-year"
              onChange={(event) => onChangeYear(event.target.value)}
              value={String(activeYear)}
            >
              {yearOptions.map((year) => (
                <option key={`desktop-year-${year}`} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className={`fixed inset-0 z-[10020] md:hidden ${mobileNavOpen ? "" : "pointer-events-none"}`}>
        <button
          aria-label="Close navigation"
          className={`absolute inset-0 bg-slate-900/55 transition-opacity ${mobileNavOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileNavOpen(false)}
          type="button"
        />
        <aside
          className={`sidebar-shell absolute left-0 top-0 h-full w-[86%] max-w-xs border-r p-4 shadow-2xl transition-transform ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                alt="SampleSurf logo"
                className="h-8 w-8 rounded-xl object-cover"
                height={32}
                src="/samplesurf-logo-rounded.png"
                width={32}
              />
              <p className="text-base font-semibold text-[color:var(--sidebar-fg)]">SampleSurf</p>
            </div>
            <button
              aria-label="Close navigation"
              className="btn-secondary inline-flex h-9 w-9 items-center justify-center p-0"
              onClick={() => setMobileNavOpen(false)}
              type="button"
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>

          <p className="sidebar-muted mb-3 text-xs font-semibold uppercase tracking-[0.16em]">Navigation</p>
          <nav>
            <ul className="space-y-2">
              {navItems.map((item) => {
                const active = isNavItemActive(pathname, item.href, item.matchMode);
                const Icon = item.icon;
                return (
                  <li key={`mobile-${item.href}`}>
                    <Link
                      className={`ui-action-hover group relative inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        active ? "sidebar-link-active" : "sidebar-link"
                      }`}
                      href={hrefWithYear(item.href, activeYear)}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {active ? (
                        <span className="absolute inset-y-1.5 left-1 w-1 rounded-full bg-[linear-gradient(180deg,var(--brand-primary),var(--brand-coral))]" />
                      ) : null}
                      <Icon aria-hidden="true" size={16} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
      </div>

      <div className="mt-4 md:mt-6 md:grid md:grid-cols-[240px_1fr] md:gap-6">
        <aside className="sidebar-shell sticky top-6 hidden h-fit rounded-2xl border p-5 shadow-soft md:block">
          <div className="sidebar-panel mb-4 flex items-center gap-2 rounded-xl px-3 py-2">
            <Image
              alt="SampleSurf logo"
              className="h-8 w-8 rounded-xl object-cover"
              height={32}
              src="/samplesurf-logo-rounded.png"
              width={32}
            />
            <p className="text-base font-semibold text-[color:var(--sidebar-fg)]">SampleSurf</p>
          </div>
          <p className="sidebar-muted mb-3 text-xs font-semibold uppercase tracking-[0.16em]">Navigation</p>
          <nav>
            <ul className="space-y-2">
              {navItems.map((item) => {
                const active = isNavItemActive(pathname, item.href, item.matchMode);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      className={`ui-action-hover group relative inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        active ? "sidebar-link-active" : "sidebar-link"
                      }`}
                      href={hrefWithYear(item.href, activeYear)}
                    >
                      {active ? (
                        <span className="absolute inset-y-1.5 left-1 w-1 rounded-full bg-[linear-gradient(180deg,var(--brand-primary),var(--brand-coral))]" />
                      ) : null}
                      <Icon aria-hidden="true" size={16} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main
          className={`space-y-5 md:space-y-6 ${pathname !== "/" ? "ui-page-enter" : ""}`}
          key={pathname}
        >
          {children}
        </main>
      </div>

      {showGlobalQuickAdd ? (
        <Link
          aria-label="Quick add item"
          className="fab-float-btn btn-primary fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[70] inline-flex h-14 w-14 items-center justify-center rounded-full p-0 shadow-2xl md:hidden"
          href={hrefWithYear("/items/new", activeYear)}
        >
          <PlusCircle aria-hidden="true" size={22} />
        </Link>
      ) : null}

      {showFloatingBack ? (
        <button
          aria-label="Go back"
          className="floating-back-utility btn-secondary fixed left-4 top-[calc(env(safe-area-inset-top)+0.85rem)] z-[69] inline-flex h-11 w-11 items-center justify-center rounded-full p-0 shadow-lg md:left-6 md:top-6"
          onClick={onBackClick}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={16} />
        </button>
      ) : null}

      {showFloatingScrollTop ? (
        <button
          aria-label="Scroll to top"
          className="floating-page-utility btn-secondary fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-[69] inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-4 py-0 shadow-xl md:left-6"
          onClick={onScrollTopClick}
          type="button"
        >
          <ArrowUp aria-hidden="true" size={16} />
          <span className="text-sm">Top</span>
        </button>
      ) : null}
    </div>
  );
}
