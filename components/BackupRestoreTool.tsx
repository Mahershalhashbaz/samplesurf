"use client";

import Papa from "papaparse";
import { Download, Upload } from "lucide-react";
import { useState } from "react";

const requiredHeaders = [
  "asin",
  "title",
  "acquisitionType",
  "receivedDate",
  "receiptValue",
] as const;

export function BackupRestoreTool() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setMessage(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(results.errors[0]?.message ?? "Could not parse backup file");
          return;
        }

        const headers = results.meta.fields ?? [];
        const missing = requiredHeaders.filter((header) => !headers.includes(header));
        if (missing.length > 0) {
          setError(`Missing required backup columns: ${missing.join(", ")}`);
          return;
        }

        const normalizedRows = (results.data || []).map((row) => {
          const normalized: Record<string, string> = {};
          Object.entries(row).forEach(([key, value]) => {
            normalized[key] = String(value ?? "").trim();
          });
          return normalized;
        });

        setRows(normalizedRows);
        setMessage(`Loaded ${normalizedRows.length} row(s) from backup.`);
      },
      error: () => setError("Could not read backup file"),
    });
  }

  async function restore() {
    const confirmed = window.confirm(
      "Restore will replace all current items with the uploaded backup. Continue?",
    );
    if (!confirmed) {
      return;
    }

    setRestoring(true);
    setError(null);

    const response = await fetch("/api/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Restore failed");
      setRestoring(false);
      return;
    }

    const payload = (await response.json()) as { restoredCount: number };
    setMessage(`Restored ${payload.restoredCount} row(s).`);
    setRestoring(false);
  }

  return (
    <div className="app-card space-y-4">
      <div>
        <a className="btn-primary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto" href="/api/export/backup">
          <Download aria-hidden="true" size={15} />
          Download Backup CSV
        </a>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="restoreFile">
          Restore from backup CSV
        </label>
        <input accept=".csv,text/csv" id="restoreFile" onChange={onFileChange} type="file" />
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <button
        className="btn-primary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto"
        disabled={rows.length === 0 || restoring}
        onClick={restore}
        type="button"
      >
        <Upload aria-hidden="true" size={15} />
        {restoring ? "Restoring..." : "Restore Now"}
      </button>
    </div>
  );
}
