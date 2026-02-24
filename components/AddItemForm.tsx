"use client";

import {
  AlertTriangle,
  CalendarDays,
  DollarSign,
  ExternalLink,
  Link2,
  PackageCheck,
  PlusCircle,
  Save,
  Tag,
  Type,
} from "lucide-react";
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
  const lookupRequestId = useRef(0);
  const duplicateRequestId = useRef(0);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const normalizedAsin = form.asin.trim().toUpperCase();

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
    setForm({
      ...initialState,
      acquisitionType: form.acquisitionType,
      receivedDate: form.receivedDate,
      dispositionType: form.dispositionType,
    });
  }

  const duplicateBlocked = Boolean(duplicateMatch && allowDuplicateAsin !== normalizedAsin);

  return (
    <div className="app-card">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="amazon-url">
              <Link2 aria-hidden="true" size={14} />
              Amazon URL (optional)
            </label>
            <div className="flex items-center gap-2">
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
    </div>
  );
}
