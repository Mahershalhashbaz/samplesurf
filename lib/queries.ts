import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { gainLossCents, negativeLossAmount, sum } from "@/lib/accounting";
import { yearRangeUtc } from "@/lib/dates";
import { getNeedsAttentionReasons } from "@/lib/needs-attention";
import { type DispositionType } from "@/lib/types";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type SoldFilter = "all" | "sold" | "unsold";

export type InventoryFilters = {
  receivedYear?: number;
  soldStatus?: SoldFilter;
  acquisitionType?: "SAMPLE" | "PURCHASED";
  needsAttentionOnly?: boolean;
  search?: string;
};

export function buildInventoryWhere(filters: InventoryFilters): Prisma.ItemWhereInput {
  const where: Prisma.ItemWhereInput = {};

  if (filters.receivedYear) {
    const range = yearRangeUtc(filters.receivedYear);
    where.receivedDate = {
      gte: range.start,
      lt: range.end,
    };
  }

  if (filters.soldStatus === "sold") {
    where.dispositionType = {
      in: ["SOLD", "GAVE_AWAY"],
    };
  }

  if (filters.soldStatus === "unsold") {
    where.dispositionType = "KEPT";
  }

  if (filters.acquisitionType) {
    where.acquisitionType = filters.acquisitionType;
  }

  if (filters.search) {
    const term = filters.search.trim();
    where.OR = [
      { asin: { contains: term.toUpperCase() } },
      { title: { contains: term } },
    ];
  }

  return where;
}

export async function getInventoryItems(filters: InventoryFilters) {
  const items = await db.item.findMany({
    where: buildInventoryWhere(filters),
    orderBy: [{ receivedDate: "desc" }, { createdAt: "desc" }],
  });

  if (!filters.needsAttentionOnly) {
    return items;
  }

  return items.filter((item) => getNeedsAttentionReasons(item).length > 0);
}

function monthlyTotalsFromItems(
  items: Array<{ receivedDate: Date; soldDate: Date | null; receiptValueCents: number; gainLossCents: number | null }>,
  field: "receipt" | "gainLoss",
) {
  const monthTotals = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    label: MONTH_LABELS[index],
    valueCents: 0,
  }));

  for (const item of items) {
    const monthIndex =
      field === "receipt"
        ? item.receivedDate.getUTCMonth()
        : item.soldDate
          ? item.soldDate.getUTCMonth()
          : -1;

    if (monthIndex < 0 || monthIndex > 11) {
      continue;
    }

    if (field === "receipt") {
      monthTotals[monthIndex].valueCents += item.receiptValueCents;
    } else {
      monthTotals[monthIndex].valueCents += item.gainLossCents ?? 0;
    }
  }

  return monthTotals;
}

export async function getDashboardMetrics(selectedYear: number) {
  const range = yearRangeUtc(selectedYear);

  const allItems = await db.item.findMany({
    orderBy: [{ receivedDate: "asc" }, { createdAt: "asc" }],
  });

  const unsoldInventoryCount = allItems.filter((item) => item.dispositionType === "KEPT").length;
  const needsAttentionCount = allItems.filter((item) => getNeedsAttentionReasons(item).length > 0).length;

  const receivedThisYear = allItems.filter(
    (item) => item.receivedDate >= range.start && item.receivedDate < range.end,
  );

  const sampleIncomeLines = receivedThisYear.filter((item) => item.acquisitionType === "SAMPLE");
  const grossSampleIncomeCents = sum(sampleIncomeLines.map((item) => item.receiptValueCents));

  const dispositionLines = allItems
    .filter((item) => item.soldDate && item.soldDate >= range.start && item.soldDate < range.end)
    .filter((item) => item.dispositionType === "SOLD" || item.dispositionType === "GAVE_AWAY")
    .filter((item) => gainLossCents(item) !== null);

  const dispositionGainLossValues = dispositionLines.map((item) => gainLossCents(item));
  const dispositionGainLossCents = sum(dispositionGainLossValues);
  const lossCents = negativeLossAmount(dispositionGainLossValues);
  const netTotalCents = grossSampleIncomeCents + dispositionGainLossCents;

  const monthlySampleIncome = monthlyTotalsFromItems(
    sampleIncomeLines.map((item) => ({
      receivedDate: item.receivedDate,
      soldDate: item.soldDate,
      receiptValueCents: item.receiptValueCents,
      gainLossCents: gainLossCents(item),
    })),
    "receipt",
  );

  const monthlyDispositionGainLoss = monthlyTotalsFromItems(
    dispositionLines.map((item) => ({
      receivedDate: item.receivedDate,
      soldDate: item.soldDate,
      receiptValueCents: item.receiptValueCents,
      gainLossCents: gainLossCents(item),
    })),
    "gainLoss",
  );

  const mixSeed: Record<DispositionType, number> = {
    KEPT: 0,
    SOLD: 0,
    GAVE_AWAY: 0,
  };

  for (const item of receivedThisYear) {
    if (item.dispositionType in mixSeed) {
      mixSeed[item.dispositionType as DispositionType] += 1;
    }
  }

  const dispositionMix = (Object.entries(mixSeed) as Array<[DispositionType, number]>).map(
    ([type, count]) => ({ type, count }),
  );

  const topReceiptItems = [...receivedThisYear]
    .sort((a, b) => b.receiptValueCents - a.receiptValueCents)
    .slice(0, 10)
    .map((item) => ({
      asin: item.asin,
      title: item.title,
      receiptValueCents: item.receiptValueCents,
    }));

  return {
    unsoldInventoryCount,
    sampleIncomeCents: grossSampleIncomeCents,
    dispositionGainLossCents,
    needsAttentionCount,
    taxSummary: {
      grossSampleIncomeCents,
      lossCents,
      netTotalCents,
    },
    charts: {
      monthlySampleIncome,
      monthlyDispositionGainLoss,
      dispositionMix,
      topReceiptItems,
    },
  };
}

export async function getTaxYearData(year: number) {
  const range = yearRangeUtc(year);

  const sampleIncomeLines = await db.item.findMany({
    where: {
      acquisitionType: "SAMPLE",
      receivedDate: {
        gte: range.start,
        lt: range.end,
      },
    },
    orderBy: { receivedDate: "asc" },
  });

  const dispositionCandidates = await db.item.findMany({
    where: {
      dispositionType: {
        in: ["SOLD", "GAVE_AWAY"],
      },
      soldDate: {
        gte: range.start,
        lt: range.end,
      },
    },
    orderBy: { soldDate: "asc" },
  });

  const dispositionLines = dispositionCandidates.filter((item) => gainLossCents(item) !== null);

  const sampleIncomeTotalCents = sum(sampleIncomeLines.map((item) => item.receiptValueCents));
  const proceedsTotalCents = sum(
    dispositionLines.map((item) => (item.dispositionType === "GAVE_AWAY" ? 0 : item.saleProceedsCents)),
  );
  const basisTotalCents = sum(dispositionLines.map((item) => item.receiptValueCents));
  const gainLossTotalCents = sum(dispositionLines.map((item) => gainLossCents(item)));
  const lossTotalCents = negativeLossAmount(dispositionLines.map((item) => gainLossCents(item)));
  const netTotalCents = sampleIncomeTotalCents + gainLossTotalCents;

  return {
    sampleIncomeLines,
    dispositionLines,
    totals: {
      sampleIncomeTotalCents,
      proceedsTotalCents,
      basisTotalCents,
      gainLossTotalCents,
      lossTotalCents,
      netTotalCents,
    },
  };
}

export async function getNeedsAttentionItems() {
  const items = await db.item.findMany({
    orderBy: [{ receivedDate: "desc" }, { createdAt: "desc" }],
  });

  return items
    .map((item) => ({ item, reasons: getNeedsAttentionReasons(item) }))
    .filter((entry) => entry.reasons.length > 0);
}

export type VideoTrackerItem = {
  id: string;
  asin: string;
  title: string;
  receivedDate: Date;
  videoDone: boolean;
  videoDoneAt: Date | null;
  videoSlaDays: number;
  videoNotes: string | null;
  createdAt: Date;
};

export async function getVideoTrackerData() {
  const items = await db.item.findMany({
    select: {
      id: true,
      asin: true,
      title: true,
      receivedDate: true,
      videoDone: true,
      videoDoneAt: true,
      videoSlaDays: true,
      videoNotes: true,
      createdAt: true,
    },
  });

  const needsVideo = items
    .filter((item) => item.videoDone === false)
    .sort((a, b) => {
      const receivedCompare = a.receivedDate.getTime() - b.receivedDate.getTime();
      if (receivedCompare !== 0) {
        return receivedCompare;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  const completed = items
    .filter((item) => item.videoDone === true)
    .sort((a, b) => {
      const doneA = a.videoDoneAt?.getTime() ?? 0;
      const doneB = b.videoDoneAt?.getTime() ?? 0;
      if (doneA !== doneB) {
        return doneB - doneA;
      }
      return b.receivedDate.getTime() - a.receivedDate.getTime();
    });

  return { needsVideo, completed };
}
