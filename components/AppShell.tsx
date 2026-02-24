"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Box,
  Check,
  DatabaseBackup,
  FileUp,
  LayoutDashboard,
  Moon,
  PlusCircle,
  ReceiptText,
  Sun,
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
  const searchString = searchParams.toString();

  const rawYear = searchParams.get("year");
  const urlYear = parseYear(rawYear);
  const activeYear = useMemo(() => urlYear ?? storedYear ?? currentTaxYear(), [storedYear, urlYear]);
  const [yearInput, setYearInput] = useState(String(activeYear));

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
    setYearInput(String(activeYear));
  }, [activeYear]);

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

  function applyYear() {
    const parsed = parseYear(yearInput);
    if (parsed === null) {
      return;
    }

    window.localStorage.setItem(TAX_YEAR_STORAGE_KEY, String(parsed));
    setStoredYear(parsed);

    const params = new URLSearchParams(searchString);
    params.set("year", String(parsed));
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleTheme() {
    const nextDark = !isDarkTheme;
    setIsDarkTheme(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextDark ? "dark" : "light");
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 md:p-8">
      <header className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] px-6 py-6 shadow-soft">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(115,91,255,0.22),_rgba(115,91,255,0)_70%)]" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(255,124,87,0.20),_rgba(255,124,87,0)_70%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image
              alt="SampleSurf logo"
              className="h-[60px] w-[60px] object-contain"
              height={60}
              priority
              src="/samplesurf-logo.png"
              width={60}
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate1">SampleSurf</p>
              <h1 className="text-3xl font-semibold text-ink">SampleSurf</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/10 px-3 py-2">
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
            <input
              className="w-24"
              data-testid="global-tax-year"
              id="global-tax-year"
              inputMode="numeric"
              onChange={(event) => setYearInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyYear();
                }
              }}
              type="number"
              value={yearInput}
            />
            <button className="btn-primary inline-flex items-center gap-1.5" onClick={applyYear} type="button">
              <Check aria-hidden="true" size={14} />
              Apply
            </button>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="sidebar-shell h-fit rounded-2xl border p-5 shadow-soft lg:sticky lg:top-6">
          <div className="sidebar-panel mb-4 flex items-center gap-2 rounded-xl px-3 py-2">
            <Image
              alt="SampleSurf logo"
              className="h-8 w-8 object-contain"
              height={32}
              src="/samplesurf-logo.png"
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
                      className={`group relative inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
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

        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
