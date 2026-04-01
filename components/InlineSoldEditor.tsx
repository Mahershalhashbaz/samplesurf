"use client";

import { Save } from "lucide-react";
import { useState } from "react";

import { DatePicker } from "@/components/DatePicker";
import { centsToDecimalString, parseMoneyToCents } from "@/lib/money";
import { todayDateInput } from "@/lib/dates";

type InlineSoldEditorProps = {
  itemId: string;
  dispositionType: "KEPT" | "SOLD" | "GAVE_AWAY";
  soldDate: string | null;
  saleProceedsCents: number | null;
};

export function InlineSoldEditor({
  itemId,
  dispositionType,
  soldDate,
  saleProceedsCents,
}: InlineSoldEditorProps) {
  const [type, setType] = useState<"KEPT" | "SOLD" | "GAVE_AWAY">(dispositionType);
  const [date, setDate] = useState<string>(soldDate ?? "");
  const [proceeds, setProceeds] = useState<string>(centsToDecimalString(saleProceedsCents));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setError(null);

    try {
      let soldDateValue: string | null = null;
      let saleProceeds: number | null = null;

      if (type === "SOLD") {
        soldDateValue = date || todayDateInput();
        saleProceeds = parseMoneyToCents(proceeds);
        if (saleProceeds === null || saleProceeds < 0) {
          setError("SOLD items need valid proceeds");
          setSaving(false);
          return;
        }
      }

      if (type === "GAVE_AWAY") {
        soldDateValue = date || todayDateInput();
        saleProceeds = 0;
      }

      const response = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispositionType: type,
          soldDate: soldDateValue,
          saleProceedsCents: saleProceeds,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Could not save");
        setSaving(false);
        return;
      }

      window.location.reload();
    } catch {
      setError("Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[12rem] space-y-1.5">
      <div className="grid gap-2">
        <select className="w-full" onChange={(e) => setType(e.target.value as typeof type)} value={type}>
          <option value="KEPT">KEPT</option>
          <option value="SOLD">SOLD</option>
          <option value="GAVE_AWAY">GAVE_AWAY</option>
        </select>

        {type !== "KEPT" ? (
          <div className="w-full">
            <DatePicker
              allowClear={false}
              id={`inline-sold-date-${itemId}`}
              inputClassName="w-full"
              onChange={setDate}
              value={date}
            />
          </div>
        ) : null}

        {type === "SOLD" ? (
          <input
            className="w-full"
            min="0"
            onChange={(e) => setProceeds(e.target.value)}
            placeholder="0.00"
            step="0.01"
            type="number"
            value={proceeds}
          />
        ) : null}

        <button
          className="btn-secondary inline-flex w-full items-center justify-center gap-1.5 px-3 py-1.5"
          disabled={saving}
          onClick={onSave}
          type="button"
        >
          <Save aria-hidden="true" size={14} />
          {saving ? "..." : "Save"}
        </button>
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
