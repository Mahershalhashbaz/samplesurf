"use client";

import {
  CalendarDays,
  Clapperboard,
  Copy,
  DollarSign,
  ExternalLink,
  Gift,
  PackageCheck,
  Save,
  Tag,
  Trash2,
  Type,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { buildAmazonDetailUrl, isAmazonDetailAsin } from "@/lib/amazon-link";
import { DatePicker } from "@/components/DatePicker";
import { gainLossCents } from "@/lib/accounting";
import { todayDateInput } from "@/lib/dates";
import { centsToDecimalString, formatCents, parseMoneyToCents } from "@/lib/money";

type ItemDetailsEditorProps = {
  item: {
    id: string;
    asin: string;
    title: string;
    acquisitionType: "SAMPLE" | "PURCHASED";
    dispositionType: "KEPT" | "SOLD" | "GAVE_AWAY";
    receivedDate: string;
    receiptValueCents: number;
    currency: string;
    soldDate: string | null;
    saleProceedsCents: number | null;
    notes: string | null;
    videoDone: boolean;
    videoDoneAt: string | null;
    videoSlaDays: number;
    videoNotes: string | null;
  };
};

type FormState = {
  asin: string;
  title: string;
  acquisitionType: "SAMPLE" | "PURCHASED";
  dispositionType: "KEPT" | "SOLD" | "GAVE_AWAY";
  receivedDate: string;
  receiptValue: string;
  soldDate: string;
  saleProceeds: string;
  notes: string;
  videoDone: boolean;
  videoSlaDays: string;
  videoNotes: string;
};

export function ItemDetailsEditor({ item }: ItemDetailsEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    asin: item.asin,
    title: item.title,
    acquisitionType: item.acquisitionType,
    dispositionType: item.dispositionType,
    receivedDate: item.receivedDate,
    receiptValue: centsToDecimalString(item.receiptValueCents),
    soldDate: item.soldDate ?? "",
    saleProceeds: centsToDecimalString(item.saleProceedsCents),
    notes: item.notes ?? "",
    videoDone: item.videoDone,
    videoSlaDays: String(item.videoSlaDays),
    videoNotes: item.videoNotes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [giveAwayOpen, setGiveAwayOpen] = useState(false);
  const [giveAwayDate, setGiveAwayDate] = useState(item.dispositionType === "GAVE_AWAY" && item.soldDate ? item.soldDate : todayDateInput());

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const computedGainLoss = useMemo(() => {
    const saleProceedsCents =
      form.dispositionType === "GAVE_AWAY"
        ? 0
        : form.saleProceeds
          ? parseMoneyToCents(form.saleProceeds)
          : null;
    const receiptValueCents = parseMoneyToCents(form.receiptValue);

    if (receiptValueCents === null) {
      return null;
    }

    return gainLossCents({
      soldDate: form.dispositionType === "KEPT" || !form.soldDate ? null : new Date(),
      dispositionType: form.dispositionType,
      saleProceedsCents,
      receiptValueCents,
    });
  }, [form.dispositionType, form.receiptValue, form.saleProceeds, form.soldDate]);

  const videoCompletedDateLabel =
    form.videoDone
      ? item.videoDoneAt ?? "Will set on save"
      : "-";
  const amazonDetailUrl = isAmazonDetailAsin(form.asin) ? buildAmazonDetailUrl(form.asin) : null;

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);

    const receiptValueCents = parseMoneyToCents(form.receiptValue);
    if (receiptValueCents === null || receiptValueCents < 0) {
      setError("Receipt value is invalid");
      setSaving(false);
      return;
    }
    const videoSlaDays = Number.parseInt(form.videoSlaDays, 10);
    if (!Number.isFinite(videoSlaDays) || videoSlaDays < 1) {
      setError("Video SLA days must be at least 1");
      setSaving(false);
      return;
    }

    let soldDate: string | null = null;
    let saleProceedsCents: number | null = null;

    if (form.dispositionType === "SOLD") {
      if (!form.soldDate) {
        setError("Disposed date is required for SOLD items");
        setSaving(false);
        return;
      }
      soldDate = form.soldDate;
      saleProceedsCents = parseMoneyToCents(form.saleProceeds);
      if (saleProceedsCents === null || saleProceedsCents < 0) {
        setError("Sale proceeds are invalid for SOLD items");
        setSaving(false);
        return;
      }
    }

    if (form.dispositionType === "GAVE_AWAY") {
      if (!form.soldDate) {
        setError("Disposed date is required for GAVE_AWAY items");
        setSaving(false);
        return;
      }
      soldDate = form.soldDate;
      saleProceedsCents = 0;
    }

    const response = await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asin: form.asin,
        title: form.title,
        acquisitionType: form.acquisitionType,
        dispositionType: form.dispositionType,
        receivedDate: form.receivedDate,
        receiptValueCents,
        currency: item.currency,
        soldDate,
        saleProceedsCents,
        notes: form.notes || null,
        videoDone: form.videoDone,
        videoSlaDays,
        videoNotes: form.videoNotes || null,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not save item");
      setSaving(false);
      return;
    }

    setMessage("Saved");
    setSaving(false);
    router.refresh();
  }

  async function markSold() {
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/items/${item.id}/mark-sold`, { method: "POST" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not mark sold");
      setSaving(false);
      return;
    }

    setMessage("Item marked sold");
    setSaving(false);
    router.refresh();
  }

  async function duplicate() {
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/items/${item.id}/duplicate`, { method: "POST" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not duplicate");
      setSaving(false);
      return;
    }

    const payload = (await response.json()) as { item: { id: string } };
    router.push(`/items/${payload.item.id}`);
  }

  async function confirmGiveAway() {
    if (!giveAwayDate) {
      setError("Give away date is required");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dispositionType: "GAVE_AWAY",
        soldDate: giveAwayDate,
        saleProceedsCents: 0,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not mark item as given away");
      setSaving(false);
      return;
    }

    setForm((prev) => ({
      ...prev,
      dispositionType: "GAVE_AWAY",
      soldDate: giveAwayDate,
      saleProceeds: "",
    }));
    setGiveAwayOpen(false);
    setMessage("Item marked as given away");
    setSaving(false);
  }

  async function removeItem() {
    const confirmed = window.confirm("Delete this item? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    setSaving(true);
    const response = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not delete item");
      setSaving(false);
      return;
    }

    router.push("/items");
  }

  return (
    <div className="app-card space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="detail-asin">
            <Tag aria-hidden="true" size={14} />
            ASIN
          </label>
          <input id="detail-asin" onChange={(e) => update("asin", e.target.value.toUpperCase())} value={form.asin} />
          {amazonDetailUrl ? (
            <a
              className="btn-secondary mt-2 inline-flex items-center gap-1.5 px-3 py-1.5"
              href={amazonDetailUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink aria-hidden="true" size={14} />
              Open on Amazon
            </a>
          ) : null}
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="detail-title">
            <Type aria-hidden="true" size={14} />
            Title
          </label>
          <input id="detail-title" onChange={(e) => update("title", e.target.value)} value={form.title} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="detail-acquisition-type">
            Acquisition Type
          </label>
          <select
            id="detail-acquisition-type"
            onChange={(e) => update("acquisitionType", e.target.value as FormState["acquisitionType"])}
            value={form.acquisitionType}
          >
            <option value="SAMPLE">Sample</option>
            <option value="PURCHASED">Purchased</option>
          </select>
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="detail-disposition-type">
            <PackageCheck aria-hidden="true" size={14} />
            Disposition Type
          </label>
          <select
            id="detail-disposition-type"
            onChange={(e) => update("dispositionType", e.target.value as FormState["dispositionType"])}
            value={form.dispositionType}
          >
            <option value="KEPT">KEPT</option>
            <option value="SOLD">SOLD</option>
            <option value="GAVE_AWAY">GAVE_AWAY</option>
          </select>
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="detail-received-date">
            <CalendarDays aria-hidden="true" size={14} />
            Received Date
          </label>
          <DatePicker id="detail-received-date" onChange={(nextDate) => update("receivedDate", nextDate)} value={form.receivedDate} />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="detail-receipt-value">
            <DollarSign aria-hidden="true" size={14} />
            Receipt Value
          </label>
          <input id="detail-receipt-value" min="0" onChange={(e) => update("receiptValue", e.target.value)} step="0.01" type="number" value={form.receiptValue} />
        </div>

        {form.dispositionType !== "KEPT" ? (
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="detail-sold-date">
              <CalendarDays aria-hidden="true" size={14} />
              Disposed Date
            </label>
            <DatePicker id="detail-sold-date" onChange={(nextDate) => update("soldDate", nextDate)} value={form.soldDate} />
          </div>
        ) : null}

        {form.dispositionType === "SOLD" ? (
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="detail-sale-proceeds">
              <DollarSign aria-hidden="true" size={14} />
              Sale Proceeds
            </label>
            <input id="detail-sale-proceeds" min="0" onChange={(e) => update("saleProceeds", e.target.value)} placeholder="Optional" step="0.01" type="number" value={form.saleProceeds} />
          </div>
        ) : null}

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium" htmlFor="detail-notes">
            Item Notes
          </label>
          <textarea className="min-h-24 w-full" id="detail-notes" onChange={(e) => update("notes", e.target.value)} value={form.notes} />
        </div>

        <div className="rounded-xl border border-[color:var(--border)] bg-ice/45 p-4 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-ink" htmlFor="detail-video-done">
              <input
                checked={form.videoDone}
                id="detail-video-done"
                onChange={(event) => update("videoDone", event.target.checked)}
                type="checkbox"
              />
              Video completed
            </label>
            <p className="text-xs text-slate1">
              Completed date: {videoCompletedDateLabel}
            </p>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="detail-video-sla-days">
                <Clapperboard aria-hidden="true" size={14} />
                Video SLA (days)
              </label>
              <input
                id="detail-video-sla-days"
                min="1"
                onChange={(event) => update("videoSlaDays", event.target.value)}
                type="number"
                value={form.videoSlaDays}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="detail-video-notes">
                Video Notes
              </label>
              <textarea
                className="min-h-20 w-full"
                id="detail-video-notes"
                onChange={(event) => update("videoNotes", event.target.value)}
                placeholder="Filming/posting notes"
                value={form.videoNotes}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-ice/40 p-4 text-sm">
        <p>
          Basis: <span className="font-medium">{formatCents(parseMoneyToCents(form.receiptValue))}</span>
        </p>
        <p>
          Gain/Loss: <span className="font-medium">{formatCents(computedGainLoss)}</span>
        </p>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary inline-flex items-center gap-1.5" disabled={saving} onClick={save} type="button">
          <Save aria-hidden="true" size={15} />
          Save
        </button>
        <button className="btn-secondary" onClick={markSold} type="button">
          Mark Sold
        </button>
        <button className="btn-secondary inline-flex items-center gap-1.5" onClick={duplicate} type="button">
          <Copy aria-hidden="true" size={15} />
          Duplicate
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100" onClick={removeItem} type="button">
          <Trash2 aria-hidden="true" size={15} />
          Delete
        </button>
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-ice/45 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Give Away</p>
            <p className="text-xs text-slate1">
              Quickly mark this item as given away without manually changing every field.
            </p>
          </div>
          <button
            className="btn-secondary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto"
            disabled={saving}
            onClick={() => {
              setGiveAwayDate(form.dispositionType === "GAVE_AWAY" && form.soldDate ? form.soldDate : todayDateInput());
              setGiveAwayOpen((prev) => !prev);
              setError(null);
              setMessage(null);
            }}
            type="button"
          >
            <Gift aria-hidden="true" size={15} />
            {form.dispositionType === "GAVE_AWAY" ? "Update Give Away" : "Give Away"}
          </button>
        </div>

        {giveAwayOpen ? (
          <div className="mt-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_1fr] md:items-end">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium" htmlFor="detail-give-away-date">
                  <CalendarDays aria-hidden="true" size={14} />
                  Give Away Date
                </label>
                <DatePicker
                  id="detail-give-away-date"
                  onChange={(nextDate) => setGiveAwayDate(nextDate)}
                  value={giveAwayDate}
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row md:justify-start">
                <button
                  className="btn-primary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto"
                  disabled={saving}
                  onClick={confirmGiveAway}
                  type="button"
                >
                  <Gift aria-hidden="true" size={15} />
                  Confirm Give Away
                </button>
                <button
                  className="btn-secondary w-full sm:w-auto"
                  disabled={saving}
                  onClick={() => {
                    setGiveAwayOpen(false);
                    setGiveAwayDate(form.dispositionType === "GAVE_AWAY" && form.soldDate ? form.soldDate : todayDateInput());
                  }}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
