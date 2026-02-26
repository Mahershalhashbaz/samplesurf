"use client";

import {
  AlertTriangle,
  Camera,
  CalendarDays,
  DollarSign,
  Eye,
  ExternalLink,
  ImageIcon,
  Loader2,
  Link2,
  PackageCheck,
  PlusCircle,
  Save,
  Search,
  Tag,
  Type,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { DatePicker } from "@/components/DatePicker";
import { extractAsinFromAmazonUrl } from "@/lib/amazon";
import { todayDateInput } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";

type SaveResult = {
  id: string;
};

type LookupState = "idle" | "loading" | "done" | "failed";

type LookupResponse = {
  asin: string;
  title?: string;
  rawTitle?: string;
  price?: number;
  source: "page" | "redirected" | "blocked";
};

type DuplicateItemSummary = {
  id: string;
  asin: string;
  title: string;
  receivedDate: string;
};

type DuplicateCheckResponse = {
  existingItem: DuplicateItemSummary | null;
};

type CreateDuplicateResponse = {
  error: "DUPLICATE_ASIN";
  message: string;
  existingItemId?: string;
  existingTitle?: string;
  existingReceived?: string;
};

type ScanResponse = {
  ok: true;
  asins: string[];
  ocrTextSnippet: string;
  titleCandidate: string | null;
  suggestedTitle?: string | null;
  confidence: number | null;
};

type AmazonSearchResult = {
  title: string;
  asin: string;
  brand?: string;
  url: string;
  imageUrl?: string;
};

type AmazonSearchResponse = {
  results: AmazonSearchResult[];
  source: "search" | "blocked";
};

type FormState = {
  amazonUrl: string;
  asin: string;
  title: string;
  acquisitionType: "SAMPLE" | "PURCHASED";
  dispositionType: "KEPT" | "SOLD" | "GAVE_AWAY";
  receivedDate: string;
  receiptValue: string;
  soldDate: string;
  saleProceeds: string;
  notes: string;
};

const initialState: FormState = {
  amazonUrl: "",
  asin: "",
  title: "",
  acquisitionType: "SAMPLE",
  dispositionType: "KEPT",
  receivedDate: todayDateInput(),
  receiptValue: "",
  soldDate: "",
  saleProceeds: "",
  notes: "",
};

function looksLikeAmazonUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.toLowerCase();
    return host === "a.co" || host.endsWith(".a.co") || host.includes("amazon.");
  } catch {
    return false;
  }
}

function formatPriceInput(value: number): string {
  return value.toFixed(2);
}

function deriveAmazonSearchQuery(titleCandidate: string | null, manualTitle: string): string {
  const normalizedSuggested = (titleCandidate ?? "")
    .replace(/^amazon\.com\s*[:|\-]\s*/i, "")
    .replace(/^[1Il|]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
  const base = normalizedSuggested || manualTitle.trim();
  return base.slice(0, 80).trim();
}

export function AddItemForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SaveResult | null>(null);
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [autofilledFromAmazon, setAutofilledFromAmazon] = useState(false);
  const [lastLookupUrl, setLastLookupUrl] = useState("");
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateItemSummary | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [allowDuplicateAsin, setAllowDuplicateAsin] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanUploading, setScanUploading] = useState(false);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSearchQuery, setScanSearchQuery] = useState("");
  const [scanSearchingAmazon, setScanSearchingAmazon] = useState(false);
  const [scanSearchResults, setScanSearchResults] = useState<AmazonSearchResult[]>([]);
  const [scanSearchError, setScanSearchError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const lookupRequestId = useRef(0);
  const duplicateRequestId = useRef(0);
  const scanRequestId = useRef(0);
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const asinInputRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef(form.title);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const normalizedAsin = form.asin.trim().toUpperCase();

  useEffect(() => {
    titleRef.current = form.title;
  }, [form.title]);

  async function checkDuplicateAsin(asin: string) {
    duplicateRequestId.current += 1;
    const requestId = duplicateRequestId.current;
    setCheckingDuplicate(true);

    try {
      const response = await fetch(`/api/items?asin=${encodeURIComponent(asin)}`);
      if (requestId !== duplicateRequestId.current) {
        return;
      }

      if (!response.ok) {
        setDuplicateMatch(null);
        setCheckingDuplicate(false);
        return;
      }

      const payload = (await response.json()) as DuplicateCheckResponse;
      setDuplicateMatch(payload.existingItem);
    } catch {
      if (requestId !== duplicateRequestId.current) {
        return;
      }
      setDuplicateMatch(null);
    } finally {
      if (requestId === duplicateRequestId.current) {
        setCheckingDuplicate(false);
      }
    }
  }

  async function lookupAmazon(rawUrl: string) {
    const trimmed = rawUrl.trim();
    if (!trimmed || !looksLikeAmazonUrl(trimmed)) {
      return;
    }

    lookupRequestId.current += 1;
    const requestId = lookupRequestId.current;
    setLookupState("loading");

    try {
      const response = await fetch(`/api/amazon/lookup?url=${encodeURIComponent(trimmed)}`);
      if (requestId !== lookupRequestId.current) {
        return;
      }

      if (!response.ok) {
        setLookupState("failed");
        setLastLookupUrl(trimmed);
        return;
      }

      const payload = (await response.json()) as LookupResponse;
      let didAutofill = false;

      setForm((prev) => {
        const next = { ...prev };

        if (payload.asin) {
          next.asin = payload.asin.toUpperCase();
        }

        if (payload.title && !prev.title.trim()) {
          next.title = payload.title;
          didAutofill = true;
        }

        if (typeof payload.price === "number" && Number.isFinite(payload.price) && !prev.receiptValue.trim()) {
          next.receiptValue = formatPriceInput(payload.price);
          didAutofill = true;
        }

        return next;
      });

      if (didAutofill) {
        setAutofilledFromAmazon(true);
      }

      setLookupState(payload.source === "blocked" && !didAutofill ? "failed" : "done");
      setLastLookupUrl(trimmed);
    } catch {
      if (requestId !== lookupRequestId.current) {
        return;
      }
      setLookupState("failed");
      setLastLookupUrl(trimmed);
    }
  }

  useEffect(() => {
    const trimmed = form.amazonUrl.trim();

    if (!trimmed || !looksLikeAmazonUrl(trimmed) || trimmed === lastLookupUrl) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void lookupAmazon(trimmed);
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [form.amazonUrl, lastLookupUrl]);

  useEffect(() => {
    setAllowDuplicateAsin(null);
    if (!normalizedAsin) {
      setDuplicateMatch(null);
      setCheckingDuplicate(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      void checkDuplicateAsin(normalizedAsin);
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [normalizedAsin]);

  function clearAmazonUrl() {
    update("amazonUrl", "");
    setLookupState("idle");
    setAutofilledFromAmazon(false);
    setLastLookupUrl("");
  }

  useEffect(() => {
    return () => {
      if (scanPreviewUrl) {
        URL.revokeObjectURL(scanPreviewUrl);
      }
    };
  }, [scanPreviewUrl]);

  function openScanPicker() {
    setScanError(null);
    setScanResult(null);
    setScanSearchError(null);
    setScanSearchResults([]);
    scanInputRef.current?.click();
  }

  function clearScanPreview() {
    if (scanPreviewUrl) {
      URL.revokeObjectURL(scanPreviewUrl);
    }
    setScanPreviewUrl(null);
    setScanFile(null);
    if (scanInputRef.current) {
      scanInputRef.current.value = "";
    }
  }

  function closeScanModal() {
    scanRequestId.current += 1;
    setScanOpen(false);
    setScanUploading(false);
    setScanResult(null);
    setScanError(null);
    setScanSearchError(null);
    setScanSearchResults([]);
    setScanSearchQuery("");
    clearScanPreview();
  }

  async function applyDetectedAsin(asin: string) {
    const normalized = asin.trim().toUpperCase();
    if (!normalized) {
      return;
    }

    update("asin", normalized);
    setScanSuccess("ASIN detected from photo.");
    setScanError(null);
    setAllowDuplicateAsin(null);
    setDuplicateMatch(null);
    closeScanModal();
    void lookupAmazon(`https://www.amazon.com/dp/${normalized}`);
  }

  async function searchAmazonFallback(queryOverride?: string) {
    const nextQuery = (queryOverride ?? scanSearchQuery).trim();
    if (nextQuery.length < 2) {
      setScanSearchError("Enter at least 2 characters to search Amazon.");
      setScanSearchResults([]);
      return;
    }

    setScanSearchingAmazon(true);
    setScanSearchError(null);
    setScanSearchResults([]);

    try {
      const response = await fetch(`/api/amazon/search?q=${encodeURIComponent(nextQuery)}`);
      if (!response.ok) {
        setScanSearchError("Could not search Amazon right now.");
        return;
      }

      const payload = (await response.json()) as AmazonSearchResponse;
      setScanSearchResults(payload.results ?? []);

      if (!payload.results || payload.results.length === 0) {
        setScanSearchError("No results found. Try a shorter or different query.");
      }
    } catch {
      setScanSearchError("Could not search Amazon right now.");
    } finally {
      setScanSearchingAmazon(false);
    }
  }

  async function uploadScanImage(fileOverride?: File) {
    const fileToUpload = fileOverride ?? scanFile;
    if (!fileToUpload) {
      setScanError("Choose a photo first.");
      return;
    }

    scanRequestId.current += 1;
    const requestId = scanRequestId.current;
    setScanUploading(true);
    setScanError(null);
    setScanResult(null);
    setScanSearchError(null);
    setScanSearchResults([]);

    try {
      const formData = new FormData();
      formData.set("image", fileToUpload);

      const response = await fetch("/api/scan", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
        if (requestId === scanRequestId.current) {
          setScanError(payload.message ?? payload.error ?? "Could not read this photo. Please try again.");
        }
        return;
      }

      const payload = (await response.json()) as ScanResponse;
      if (requestId !== scanRequestId.current) {
        return;
      }
      if (payload.asins.length === 1) {
        await applyDetectedAsin(payload.asins[0] ?? "");
        return;
      }

      if (payload.asins.length === 0) {
        setScanSearchQuery(deriveAmazonSearchQuery(payload.titleCandidate, titleRef.current));
      }

      setScanResult(payload);
    } catch {
      if (requestId === scanRequestId.current) {
        setScanError("Could not read this photo. Please try again.");
      }
    } finally {
      if (requestId === scanRequestId.current) {
        setScanUploading(false);
      }
    }
  }

  function onScanFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (scanPreviewUrl) {
      URL.revokeObjectURL(scanPreviewUrl);
    }

    setScanFile(file);
    setScanPreviewUrl(URL.createObjectURL(file));
    setScanOpen(true);
    setScanResult(null);
    setScanError(null);
    setScanSearchError(null);
    setScanSearchResults([]);
    setScanSearchQuery("");
    void uploadScanImage(file);
  }

  async function applyAmazonSearchResult(result: AmazonSearchResult) {
    update("asin", result.asin.toUpperCase());
    if (result.title) {
      update("title", result.title);
    }
    update("amazonUrl", result.url);
    setScanSuccess("ASIN detected from Amazon search.");
    setScanError(null);
    setAllowDuplicateAsin(null);
    setDuplicateMatch(null);
    closeScanModal();
    void lookupAmazon(result.url);
  }

  async function submit(allowDuplicate: boolean): Promise<{ ok: boolean; id?: string }> {
    const receiptValueCents = parseMoneyToCents(form.receiptValue);
    if (receiptValueCents === null || receiptValueCents < 0) {
      setError("Receipt value must be a valid amount >= 0");
      return { ok: false };
    }

    let soldDate: string | null = null;
    let saleProceedsCents: number | null = null;

    if (form.dispositionType === "SOLD") {
      if (!form.soldDate) {
        setError("Disposed date is required for SOLD items");
        return { ok: false };
      }
      soldDate = form.soldDate;
      saleProceedsCents = parseMoneyToCents(form.saleProceeds);
      if (saleProceedsCents === null || saleProceedsCents < 0) {
        setError("Sale proceeds are required for SOLD items");
        return { ok: false };
      }
    }

    if (form.dispositionType === "GAVE_AWAY") {
      if (!form.soldDate) {
        setError("Disposed date is required for GAVE_AWAY items");
        return { ok: false };
      }
      soldDate = form.soldDate;
      saleProceedsCents = 0;
    }

    const response = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asin: form.asin,
        title: form.title,
        acquisitionType: form.acquisitionType,
        dispositionType: form.dispositionType,
        receivedDate: form.receivedDate,
        receiptValueCents,
        currency: "USD",
        soldDate,
        saleProceedsCents,
        notes: form.notes || null,
        allowDuplicate,
      }),
    });

    if (response.status === 409) {
      const payload = (await response.json()) as CreateDuplicateResponse;
      if (payload.error === "DUPLICATE_ASIN") {
        setDuplicateMatch({
          id: payload.existingItemId ?? "",
          asin: normalizedAsin,
          title: payload.existingTitle ?? "(existing item)",
          receivedDate: payload.existingReceived ?? "",
        });
        setError(payload.message);
      }
      return { ok: false };
    }

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Failed to create item");
      return { ok: false };
    }

    const payload = (await response.json()) as { item: { id: string } };
    return { ok: true, id: payload.item.id };
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (duplicateBlocked) {
      setError("Oops - looks like you already added this item.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(null);

    try {
      const result = await submit(allowDuplicateAsin === normalizedAsin);
      if (result.ok && result.id) {
        setSaved({ id: result.id });
      }
    } catch {
      setError("Unexpected error while creating item");
    } finally {
      setSaving(false);
    }
  }

  function onAddAnother() {
    setSaved(null);
    setError(null);
    setLookupState("idle");
    setAutofilledFromAmazon(false);
    setLastLookupUrl("");
    setDuplicateMatch(null);
    setAllowDuplicateAsin(null);
    setScanSuccess(null);
    setScanSearchError(null);
    setScanSearchResults([]);
    setScanSearchQuery("");
    setForm({
      ...initialState,
      acquisitionType: form.acquisitionType,
      receivedDate: form.receivedDate,
      dispositionType: form.dispositionType,
    });
  }

  const duplicateBlocked = Boolean(duplicateMatch && allowDuplicateAsin !== normalizedAsin);
  const trimmedScanSearchQuery = scanSearchQuery.trim();
  const topSearchResults = scanSearchResults.slice(0, 5);
  const topMatch = topSearchResults[0] ?? null;

  function openExternalUrl(url: string) {
    if (!url) {
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="app-card">
      <input
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onScanFileChange}
        ref={scanInputRef}
        type="file"
      />
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="amazon-url">
              <Link2 aria-hidden="true" size={14} />
              Amazon URL (optional)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="amazon-url"
                onChange={(event) => {
                  const value = event.target.value;
                  update("amazonUrl", value);

                  const parsedAsin = extractAsinFromAmazonUrl(value);
                  if (parsedAsin) {
                    update("asin", parsedAsin);
                  }

                  if (!value.trim()) {
                    setLookupState("idle");
                    setAutofilledFromAmazon(false);
                    setLastLookupUrl("");
                  }
                }}
                placeholder="https://www.amazon.com/dp/B08..."
                type="url"
                value={form.amazonUrl}
              />
              <button
                className="btn-primary inline-flex items-center gap-1.5 whitespace-nowrap px-3"
                data-testid="scan-slip-button"
                onClick={openScanPicker}
                type="button"
              >
                <Camera aria-hidden="true" size={15} />
                Scan Slip / Box
              </button>
              {form.amazonUrl ? (
                <button className="btn-secondary whitespace-nowrap px-3" onClick={clearAmazonUrl} type="button">
                  Clear URL
                </button>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {lookupState === "loading" ? <span className="text-slate1">Fetching details...</span> : null}
              {autofilledFromAmazon ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-800">
                  Auto-filled from Amazon
                </span>
              ) : null}
              {scanSuccess ? <span className="rounded-full bg-sky-100 px-2.5 py-1 font-medium text-sky-800">{scanSuccess}</span> : null}
              {lookupState === "failed" ? (
                <span className="text-amber-700">Couldn&apos;t fetch details - you can fill manually.</span>
              ) : null}
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="asin">
              <Tag aria-hidden="true" size={14} />
              ASIN
            </label>
            <input
              data-testid="add-asin"
              id="asin"
              onChange={(e) => update("asin", e.target.value.toUpperCase())}
              ref={asinInputRef}
              required
              value={form.asin}
            />
            {checkingDuplicate && normalizedAsin ? <p className="mt-1 text-xs text-slate1">Checking duplicates...</p> : null}
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="title">
              <Type aria-hidden="true" size={14} />
              Title
            </label>
            <input
              data-testid="add-title"
              id="title"
              onChange={(e) => update("title", e.target.value)}
              required
              value={form.title}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="acquisitionType">
              Acquisition Type
            </label>
            <select
              data-testid="add-acquisition-type"
              id="acquisitionType"
              onChange={(e) => update("acquisitionType", e.target.value as FormState["acquisitionType"])}
              value={form.acquisitionType}
            >
              <option value="SAMPLE">Sample</option>
              <option value="PURCHASED">Purchased</option>
            </select>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="dispositionType">
              <PackageCheck aria-hidden="true" size={14} />
              What happened to it?
            </label>
            <select
              data-testid="add-disposition-type"
              id="dispositionType"
              onChange={(e) => update("dispositionType", e.target.value as FormState["dispositionType"])}
              value={form.dispositionType}
            >
              <option value="KEPT">KEPT</option>
              <option value="SOLD">SOLD</option>
              <option value="GAVE_AWAY">GAVE_AWAY</option>
            </select>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="receivedDate">
              <CalendarDays aria-hidden="true" size={14} />
              Received Date
            </label>
            <DatePicker
              id="receivedDate"
              onChange={(nextDate) => update("receivedDate", nextDate)}
              required
              testId="add-received-date"
              value={form.receivedDate}
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="receiptValue">
              <DollarSign aria-hidden="true" size={14} />
              Receipt Value (USD)
            </label>
            <input
              data-testid="add-receipt-value"
              id="receiptValue"
              min="0"
              onChange={(e) => update("receiptValue", e.target.value)}
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={form.receiptValue}
            />
          </div>

          {form.dispositionType !== "KEPT" ? (
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="soldDate">
                <CalendarDays aria-hidden="true" size={14} />
                Disposed Date
              </label>
              <DatePicker
                id="soldDate"
                onChange={(nextDate) => update("soldDate", nextDate)}
                required
                testId="add-sold-date"
                value={form.soldDate}
              />
            </div>
          ) : null}

          {form.dispositionType === "SOLD" ? (
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="saleProceeds">
                <DollarSign aria-hidden="true" size={14} />
                Sale Proceeds
              </label>
              <input
                data-testid="add-sale-proceeds"
                id="saleProceeds"
                min="0"
                onChange={(e) => update("saleProceeds", e.target.value)}
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={form.saleProceeds}
              />
            </div>
          ) : null}

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium" htmlFor="notes">
              Notes (optional)
            </label>
            <textarea
              className="min-h-24 w-full"
              id="notes"
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Optional notes"
              value={form.notes}
            />
          </div>
        </div>

        {duplicateMatch ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="duplicate-warning-banner">
            <p className="inline-flex items-center gap-1.5 font-semibold">
              <AlertTriangle aria-hidden="true" size={15} />
              Oops - looks like you already added this item.
            </p>
            <p className="mt-1 text-xs">
              {duplicateMatch.title || "(no title)"}{" "}
              {duplicateMatch.receivedDate ? `- received ${duplicateMatch.receivedDate}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {duplicateMatch.id ? (
                <Link className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1" href={`/items/${duplicateMatch.id}`}>
                  <ExternalLink aria-hidden="true" size={14} />
                  View existing item
                </Link>
              ) : null}
              <button
                className="btn-secondary px-3 py-1"
                onClick={() => setAllowDuplicateAsin(normalizedAsin)}
                type="button"
              >
                Add anyway
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        {saved ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p>Item saved.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-primary inline-flex items-center gap-1.5" onClick={onAddAnother} type="button">
                <PlusCircle aria-hidden="true" size={15} />
                Add Another
              </button>
              <Link className="btn-secondary inline-flex items-center gap-1.5" href={`/items/${saved.id}`}>
                <ExternalLink aria-hidden="true" size={15} />
                Open Item Details
              </Link>
              <Link className="btn-secondary" href="/items">
                Go to Inventory
              </Link>
            </div>
          </div>
        ) : null}

        <button
          className="btn-primary inline-flex items-center gap-1.5"
          data-testid="add-save"
          disabled={saving || duplicateBlocked}
          type="submit"
        >
          <Save aria-hidden="true" size={15} />
          {saving ? "Saving..." : "Save Item"}
        </button>
      </form>

      {scanOpen ? (
        <div className="fixed inset-0 z-[10000] p-3 sm:p-4 md:p-6">
          <button
            aria-label="Close scan dialog"
            className="fixed inset-0 bg-slate-900/60"
            onClick={closeScanModal}
            type="button"
          />
          <div className="relative mx-auto flex min-h-full w-full max-w-3xl items-center justify-center">
            <div
              className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl"
              data-testid="scan-modal-panel"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-4 py-3 md:px-6 md:py-4">
                <h3 className="text-lg font-semibold text-ink">Scan Slip / Box</h3>
                <button className="btn-secondary px-3 py-1.5" onClick={closeScanModal} type="button">
                  Cancel
                </button>
              </div>

              <div
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6 md:py-5 [-webkit-overflow-scrolling:touch]"
                data-testid="scan-modal-scroll"
              >
                {scanPreviewUrl ? (
                  <Image
                    alt="Scan preview"
                    className="max-h-[52vh] w-full rounded-xl border border-[color:var(--border)] bg-white object-contain"
                    height={1200}
                    src={scanPreviewUrl}
                    unoptimized
                    width={1200}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-[color:var(--border)] p-8 text-center text-sm text-slate1">
                    Capture a photo to continue.
                  </div>
                )}

                {scanUploading ? (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--brand-primary)]/12 px-3 py-1 text-sm text-[color:var(--brand-violet)]">
                    <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                    Processing photo...
                  </div>
                ) : null}

                {scanError ? <p className="mt-4 text-sm text-red-700">{scanError}</p> : null}

                {scanResult && scanResult.asins.length > 1 ? (
                  <div className="mt-4 rounded-xl border border-[color:var(--border)] bg-ice/70 p-3">
                    <p className="text-sm font-semibold text-ink">Multiple items detected - choose which to add</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {scanResult.asins.map((asin) => (
                        <button
                          className="btn-secondary px-3 py-1.5"
                          key={asin}
                          onClick={() => {
                            void applyDetectedAsin(asin);
                          }}
                          type="button"
                        >
                          Use {asin}
                        </button>
                      ))}
                    </div>
                    {scanResult.ocrTextSnippet ? (
                      <p className="mt-3 text-xs text-slate1">OCR preview: {scanResult.ocrTextSnippet}</p>
                    ) : null}
                  </div>
                ) : null}

                {scanResult && scanResult.asins.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    <p>No ASIN detected. Search Amazon instead?</p>
                    <p className="mt-1 text-xs text-amber-800">
                      Try retaking the photo with the slip centered and well-lit if search doesn&apos;t match.
                    </p>
                    {!scanSearchQuery ? (
                      <p className="mt-2 text-xs text-amber-900">
                        We couldn&apos;t confidently detect a product title. Type a short title to search.
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        onChange={(event) => setScanSearchQuery(event.target.value)}
                        placeholder="Search by product name"
                        type="text"
                        value={scanSearchQuery}
                      />
                      <button
                        className="btn-primary inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:w-auto"
                        disabled={scanSearchingAmazon || scanUploading || !scanResult}
                        onClick={() => {
                          void searchAmazonFallback();
                        }}
                        type="button"
                      >
                        {scanSearchingAmazon ? (
                          <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                        ) : (
                          <Search aria-hidden="true" size={15} />
                        )}
                        Lookup on Amazon
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5"
                        disabled={!topMatch}
                        onClick={() => {
                          if (topMatch) {
                            openExternalUrl(topMatch.url);
                          }
                        }}
                        type="button"
                      >
                        <Eye aria-hidden="true" size={14} />
                        Open in Amazon (top match)
                      </button>
                      <button
                        className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5"
                        disabled={trimmedScanSearchQuery.length < 2}
                        onClick={() => {
                          openExternalUrl(`https://www.amazon.com/s?k=${encodeURIComponent(trimmedScanSearchQuery)}`);
                        }}
                        type="button"
                      >
                        <ExternalLink aria-hidden="true" size={14} />
                        Open search in Amazon
                      </button>
                    </div>

                    {scanSearchError ? <p className="mt-2 text-xs text-red-700">{scanSearchError}</p> : null}

                    {topSearchResults.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {topSearchResults.map((result) => (
                          <button
                            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 text-left text-ink"
                            key={`${result.asin}-${result.url}`}
                            onClick={() => {
                              void applyAmazonSearchResult(result);
                            }}
                            type="button"
                          >
                            <div className="flex items-start gap-3">
                              {result.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  alt=""
                                  className="h-12 w-12 shrink-0 rounded-lg border border-[color:var(--border)] bg-white object-cover"
                                  src={result.imageUrl}
                                />
                              ) : (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[color:var(--border)] bg-ice/70 text-slate1">
                                  <ImageIcon aria-hidden="true" size={18} />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="break-words text-sm font-semibold">{result.title}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate1">
                                  <span className="rounded-full bg-ice px-2 py-0.5 font-mono">{result.asin}</span>
                                  {result.brand ? <span>Brand: {result.brand}</span> : null}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="btn-secondary px-3 py-1.5"
                        onClick={() => {
                          closeScanModal();
                          setTimeout(() => asinInputRef.current?.focus(), 0);
                        }}
                        type="button"
                      >
                        Enter ASIN manually
                      </button>
                      <button
                        className="btn-secondary px-3 py-1.5"
                        onClick={() => {
                          closeScanModal();
                          setTimeout(() => document.getElementById("amazon-url")?.focus(), 0);
                        }}
                        type="button"
                      >
                        Paste Amazon URL
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-[color:var(--border)] bg-[color:var(--card)]/95 px-4 py-3 backdrop-blur md:px-6 md:py-4 supports-[backdrop-filter]:bg-[color:var(--card)]/90"
                data-testid="scan-modal-footer"
              >
                <button className="btn-secondary px-3 py-1.5" onClick={openScanPicker} type="button">
                  Retake
                </button>
                <button
                  className="btn-secondary px-3 py-1.5"
                  disabled={scanUploading || !scanFile}
                  onClick={() => {
                    void uploadScanImage();
                  }}
                  type="button"
                >
                  Use Photo
                </button>
                <button className="btn-secondary px-3 py-1.5" onClick={closeScanModal} type="button">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
