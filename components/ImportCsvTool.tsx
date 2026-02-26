"use client";

import Papa from "papaparse";
import { Download, FileUp } from "lucide-react";
import { useMemo, useState } from "react";

import {
  IMPORT_FIELDS,
  type ImportField,
  type ImportMapping,
  type RejectedImportRow,
  buildRejectedCsv,
  validateMappedRows,
} from "@/lib/import";

const labels: Record<ImportField, string> = {
  asin: "ASIN",
  title: "Title",
  acquisitionType: "Acquisition type",
  dispositionType: "Disposition type",
  receivedDate: "Received date",
  receiptValue: "Receipt value",
  soldDate: "Disposed date",
  saleProceeds: "Sale proceeds",
  notes: "Notes",
};

const requiredFields: ImportField[] = ["asin", "acquisitionType", "receivedDate", "receiptValue"];

function emptyMapping(): ImportMapping {
  return {
    asin: null,
    title: null,
    acquisitionType: null,
    dispositionType: null,
    receivedDate: null,
    receiptValue: null,
    soldDate: null,
    saleProceeds: null,
    notes: null,
  };
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function autoMap(headers: string[]): ImportMapping {
  const mapping = emptyMapping();

  headers.forEach((header) => {
    const normalized = normalizeHeader(header);

    if (!mapping.asin && normalized.includes("asin")) mapping.asin = header;
    if (!mapping.title && normalized.includes("title")) mapping.title = header;
    if (!mapping.acquisitionType && (normalized.includes("acquisition") || normalized === "type")) {
      mapping.acquisitionType = header;
    }
    if (
      !mapping.dispositionType &&
      (normalized.includes("disposition") || normalized.includes("status") || normalized.includes("whathappened"))
    ) {
      mapping.dispositionType = header;
    }
    if (!mapping.receivedDate && (normalized.includes("received") || normalized === "receiveddate")) {
      mapping.receivedDate = header;
    }
    if (
      !mapping.receiptValue &&
      (normalized.includes("receiptvalue") || normalized === "fmv" || normalized === "cost" || normalized === "value")
    ) {
      mapping.receiptValue = header;
    }
    if (!mapping.soldDate && (normalized.includes("solddate") || normalized.includes("disposeddate"))) {
      mapping.soldDate = header;
    }
    if (!mapping.saleProceeds && (normalized.includes("saleproceeds") || normalized === "proceeds")) {
      mapping.saleProceeds = header;
    }
    if (!mapping.notes && normalized.includes("note")) mapping.notes = header;
  });

  return mapping;
}

export function ImportCsvTool() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>(emptyMapping());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [serverRejectedRows, setServerRejectedRows] = useState<RejectedImportRow[]>([]);

  const preview = useMemo(() => validateMappedRows(rows, mapping), [rows, mapping]);
  const combinedRejectedRows = useMemo(
    () => [...preview.rejected, ...serverRejectedRows].sort((a, b) => a.rowNumber - b.rowNumber),
    [preview.rejected, serverRejectedRows],
  );
  const rejectedMap = useMemo(
    () => new Map(combinedRejectedRows.map((entry) => [entry.rowNumber, entry.reason])),
    [combinedRejectedRows],
  );
  const parsedMap = useMemo(
    () => new Map(preview.parsed.map((entry) => [entry.rowNumber, entry])),
    [preview.parsed],
  );

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResultMessage(null);
    setServerRejectedRows([]);

    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setLoading(false);

        if (results.errors.length > 0) {
          setError(results.errors[0]?.message ?? "Failed to parse CSV");
          return;
        }

        const parsedRows = (results.data || []).map((row) => {
          const normalized: Record<string, string> = {};
          Object.entries(row).forEach(([key, value]) => {
            normalized[key] = String(value ?? "").trim();
          });
          return normalized;
        });

        const fileHeaders = (results.meta.fields ?? []).filter(
          (header): header is string => Boolean(header),
        );
        setHeaders(fileHeaders);
        setRows(parsedRows);
        setMapping(autoMap(fileHeaders));
      },
      error: () => {
        setLoading(false);
        setError("Could not read file");
      },
    });
  }

  function updateMapping(field: ImportField, value: string) {
    setMapping((prev) => ({
      ...prev,
      [field]: value || null,
    }));
  }

  async function importValidRows() {
    setImporting(true);
    setError(null);
    setResultMessage(null);

    const rowsToImport = preview.parsed.map((row) => ({
      rowNumber: row.rowNumber,
      asin: row.asin,
      title: row.title,
      acquisitionType: row.acquisitionType,
      dispositionType: row.dispositionType,
      receivedDate: row.receivedDate,
      receiptValueCents: row.receiptValueCents,
      soldDate: row.soldDate,
      saleProceedsCents: row.saleProceedsCents,
      notes: row.notes,
      currency: "USD",
      warningReasons: row.warningReasons,
    }));

    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: rowsToImport, allowDuplicates }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Import failed");
      setImporting(false);
      return;
    }

    const payload = (await response.json()) as {
      importedCount: number;
      rejectedRows?: Array<{ rowNumber: number; asin?: string; reason: string }>;
    };

    const importRejected = (payload.rejectedRows ?? []).map((entry) => ({
      rowNumber: entry.rowNumber,
      reason: entry.reason,
      raw: rows[entry.rowNumber - 2] ?? { asin: entry.asin ?? "" },
    }));
    setServerRejectedRows(importRejected);

    const skippedCount = importRejected.length;
    setResultMessage(
      skippedCount > 0
        ? `Imported ${payload.importedCount} row(s). Skipped ${skippedCount} duplicate row(s).`
        : `Imported ${payload.importedCount} row(s).`,
    );
    setImporting(false);
  }

  function downloadRejectedReport() {
    const csv = buildRejectedCsv(combinedRejectedRows, headers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "import-rejected-rows.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  const missingRequiredMapping = requiredFields.some((field) => !mapping[field]);

  return (
    <div className="app-card space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="csvFile">
          CSV file
        </label>
        <input accept=".csv,text/csv" id="csvFile" onChange={onFileChange} type="file" />
      </div>

      {loading ? <p className="text-sm text-slate1">Parsing CSV...</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {resultMessage ? <p className="text-sm text-emerald-700">{resultMessage}</p> : null}

      {headers.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate1">Column Mapping</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {IMPORT_FIELDS.map((field) => (
              <label className="block" key={field}>
                <span className="mb-1 block text-sm font-medium">
                  {labels[field]} {requiredFields.includes(field) ? <span className="text-red-600">*</span> : null}
                </span>
                <select onChange={(e) => updateMapping(field, e.target.value)} value={mapping[field] ?? ""}>
                  <option value="">(not mapped)</option>
                  {headers.map((header) => (
                    <option key={`${field}-${header}`} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {missingRequiredMapping ? (
            <p className="text-sm text-amber-700">Map all required fields before importing.</p>
          ) : null}

          <label className="inline-flex items-center gap-2 text-sm text-ink/80">
            <input
              checked={allowDuplicates}
              onChange={(event) => setAllowDuplicates(event.target.checked)}
              type="checkbox"
            />
            Allow duplicates
          </label>
        </section>
      ) : null}

      {rows.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="app-pill">Rows: {rows.length}</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">Valid: {preview.parsed.length}</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">Rejected: {combinedRejectedRows.length}</span>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800">
              Warnings: {preview.parsed.filter((row) => row.warningReasons.length > 0).length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table>
              <thead className="bg-ice text-xs uppercase tracking-wide text-ink/70">
                <tr>
                  <th>Row</th>
                  <th>ASIN</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Disposition</th>
                  <th>Received</th>
                  <th>Receipt Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((row, index) => {
                  const rowNumber = index + 2;
                  const rejectedReason = rejectedMap.get(rowNumber);
                  const parsedRow = parsedMap.get(rowNumber);
                  const status = rejectedReason
                    ? `Rejected: ${rejectedReason}`
                    : parsedRow && parsedRow.warningReasons.length > 0
                      ? `Warning: ${parsedRow.warningReasons.join("; ")}`
                      : "Valid";

                  return (
                    <tr key={`preview-${rowNumber}`}>
                      <td>{rowNumber}</td>
                      <td className="font-mono text-xs">{parsedRow?.asin ?? row[mapping.asin ?? ""] ?? ""}</td>
                      <td>{parsedRow?.title ?? row[mapping.title ?? ""] ?? ""}</td>
                      <td>{parsedRow?.acquisitionType ?? row[mapping.acquisitionType ?? ""] ?? ""}</td>
                      <td>{parsedRow?.dispositionType ?? row[mapping.dispositionType ?? ""] ?? ""}</td>
                      <td>{parsedRow?.receivedDate ?? row[mapping.receivedDate ?? ""] ?? ""}</td>
                      <td>
                        {parsedRow
                          ? (parsedRow.receiptValueCents / 100).toFixed(2)
                          : row[mapping.receiptValue ?? ""] ?? ""}
                      </td>
                      <td
                        className={
                          rejectedReason
                            ? "text-red-700"
                            : parsedRow?.warningReasons.length
                              ? "text-amber-700"
                              : "text-emerald-700"
                        }
                      >
                        {status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="btn-primary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto"
              data-testid="import-valid-rows"
              disabled={importing || missingRequiredMapping || preview.parsed.length === 0}
              onClick={importValidRows}
              type="button"
            >
              <FileUp aria-hidden="true" size={15} />
              {importing ? "Importing..." : "Import Valid Rows"}
            </button>

            <button
              className="btn-secondary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto"
              disabled={combinedRejectedRows.length === 0}
              onClick={downloadRejectedReport}
              type="button"
            >
              <Download aria-hidden="true" size={15} />
              Download Rejected Report
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
