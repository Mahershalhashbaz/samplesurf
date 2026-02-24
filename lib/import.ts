import type { AcquisitionType, DispositionType } from "@/lib/types";

import { parseDateOnly, toDateInputValue } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";
import {
  normalizeAcquisitionType,
  normalizeAsin,
  normalizeDispositionType,
} from "@/lib/normalization";

export const IMPORT_FIELDS = [
  "asin",
  "title",
  "acquisitionType",
  "dispositionType",
  "receivedDate",
  "receiptValue",
  "soldDate",
  "saleProceeds",
  "notes",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

export type ImportMapping = Record<ImportField, string | null>;

export type ParsedImportRow = {
  rowNumber: number;
  asin: string;
  title: string;
  acquisitionType: AcquisitionType;
  dispositionType: DispositionType;
  receivedDate: string;
  receiptValueCents: number;
  soldDate: string | null;
  saleProceedsCents: number | null;
  notes: string | null;
  warningReasons: string[];
};

export type RejectedImportRow = {
  rowNumber: number;
  reason: string;
  raw: Record<string, string>;
};

export type ImportPreviewResult = {
  parsed: ParsedImportRow[];
  rejected: RejectedImportRow[];
};

function readMappedValue(
  mapping: ImportMapping,
  row: Record<string, string>,
  field: ImportField,
): string {
  const sourceColumn = mapping[field];
  if (!sourceColumn) {
    return "";
  }
  return String(row[sourceColumn] ?? "").trim();
}

export function validateMappedRows(
  rows: Record<string, string>[],
  mapping: ImportMapping,
): ImportPreviewResult {
  const parsed: ParsedImportRow[] = [];
  const rejected: RejectedImportRow[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const warningReasons: string[] = [];

    const asin = normalizeAsin(readMappedValue(mapping, row, "asin"));
    if (!asin) {
      rejected.push({ rowNumber, reason: "ASIN is required", raw: row });
      return;
    }

    const acquisitionTypeRaw = readMappedValue(mapping, row, "acquisitionType");
    const acquisitionType = normalizeAcquisitionType(acquisitionTypeRaw);
    if (!acquisitionType) {
      rejected.push({
        rowNumber,
        reason: `Invalid acquisition type: ${acquisitionTypeRaw || "(empty)"}`,
        raw: row,
      });
      return;
    }

    const receivedRaw = readMappedValue(mapping, row, "receivedDate");
    const receivedDate = parseDateOnly(receivedRaw);
    if (!receivedDate) {
      rejected.push({
        rowNumber,
        reason: `Invalid received date: ${receivedRaw || "(empty)"}`,
        raw: row,
      });
      return;
    }

    const receiptValueRaw = readMappedValue(mapping, row, "receiptValue");
    const receiptValueCents = parseMoneyToCents(receiptValueRaw);
    if (receiptValueCents === null || receiptValueCents < 0) {
      rejected.push({
        rowNumber,
        reason: `Invalid receipt value: ${receiptValueRaw || "(empty)"}`,
        raw: row,
      });
      return;
    }

    const soldRaw = readMappedValue(mapping, row, "soldDate");
    const soldDate = soldRaw ? parseDateOnly(soldRaw) : null;
    if (soldRaw && !soldDate) {
      rejected.push({
        rowNumber,
        reason: `Invalid sold date: ${soldRaw}`,
        raw: row,
      });
      return;
    }

    const saleValueRaw = readMappedValue(mapping, row, "saleProceeds");
    const saleProceedsCents = saleValueRaw ? parseMoneyToCents(saleValueRaw) : null;
    if (saleValueRaw && (saleProceedsCents === null || saleProceedsCents < 0)) {
      rejected.push({
        rowNumber,
        reason: `Invalid sale proceeds: ${saleValueRaw}`,
        raw: row,
      });
      return;
    }

    const dispositionRaw = readMappedValue(mapping, row, "dispositionType");
    const mappedDisposition = normalizeDispositionType(dispositionRaw);
    const dispositionType =
      mappedDisposition ||
      (soldDate
        ? saleProceedsCents === 0
          ? "GAVE_AWAY"
          : "SOLD"
        : "KEPT");

    if (dispositionType === "SOLD" && !soldDate) {
      warningReasons.push("SOLD item is missing disposed date");
    }

    if (dispositionType === "SOLD" && saleProceedsCents === null) {
      warningReasons.push("SOLD item is missing sale proceeds");
    }

    if (dispositionType === "GAVE_AWAY" && !soldDate) {
      warningReasons.push("GAVE_AWAY item is missing disposed date");
    }

    if (dispositionType === "KEPT" && soldDate) {
      warningReasons.push("KEPT item should not include sold date");
    }

    const title = readMappedValue(mapping, row, "title");
    if (!title) {
      warningReasons.push("Missing title");
    }

    parsed.push({
      rowNumber,
      asin,
      title,
      acquisitionType,
      dispositionType,
      receivedDate: toDateInputValue(receivedDate),
      receiptValueCents,
      soldDate: soldDate ? toDateInputValue(soldDate) : null,
      saleProceedsCents:
        dispositionType === "GAVE_AWAY"
          ? 0
          : dispositionType === "KEPT"
            ? null
            : saleProceedsCents,
      notes: readMappedValue(mapping, row, "notes") || null,
      warningReasons,
    });
  });

  return { parsed, rejected };
}

export function buildRejectedCsv(rejected: RejectedImportRow[], headers: string[]): string {
  const baseHeaders = ["rowNumber", "reason", ...headers];
  const lines = [baseHeaders.join(",")];

  rejected.forEach((row) => {
    const values = [String(row.rowNumber), row.reason, ...headers.map((header) => row.raw[header] ?? "")];
    const escaped = values.map((value) => {
      if (value.includes(",") || value.includes("\n") || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    lines.push(escaped.join(","));
  });

  return `${lines.join("\n")}\n`;
}
