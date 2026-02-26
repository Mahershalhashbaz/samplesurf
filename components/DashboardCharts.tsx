"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { dispositionLabel } from "@/lib/types";

type DashboardChartsProps = {
  year: number;
  monthlySampleIncome: Array<{ month: number; label: string; valueCents: number }>;
  monthlyDispositionGainLoss: Array<{ month: number; label: string; valueCents: number }>;
  dispositionMix: Array<{ type: "KEPT" | "SOLD" | "GAVE_AWAY"; count: number }>;
  topReceiptItems: Array<{ asin: string; title: string; receiptValueCents: number }>;
};

const pieColors = {
  KEPT: "#475569",
  SOLD: "#735BFF",
  GAVE_AWAY: "#FF7C57",
};

function centsToUsd(valueCents: number): number {
  return Math.round(valueCents) / 100;
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function EmptyChart({ message }: { message: string }) {
  return <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] text-sm text-slate1 md:h-[260px]">{message}</div>;
}

export function DashboardCharts({
  year,
  monthlySampleIncome,
  monthlyDispositionGainLoss,
  dispositionMix,
  topReceiptItems,
}: DashboardChartsProps) {
  const sampleData = monthlySampleIncome.map((entry) => ({
    ...entry,
    value: centsToUsd(entry.valueCents),
  }));

  const dispositionData = monthlyDispositionGainLoss.map((entry) => ({
    ...entry,
    value: centsToUsd(entry.valueCents),
  }));

  const topItemsData = topReceiptItems.map((entry) => ({
    ...entry,
    label: entry.asin,
    value: centsToUsd(entry.receiptValueCents),
  }));

  const hasSampleData = sampleData.some((entry) => entry.value !== 0);
  const hasDispositionData = dispositionData.some((entry) => entry.value !== 0);
  const hasMixData = dispositionMix.some((entry) => entry.count > 0);
  const hasTopItems = topItemsData.length > 0;

  return (
    <section className="space-y-3 md:space-y-4" data-testid="dashboard-data-section">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-ink md:text-xl">Data - {year}</h3>
        <span className="app-pill">Visual analytics</span>
      </div>

      <div className="grid gap-3 md:gap-4 xl:grid-cols-2">
        <article className="app-card">
          <h4 className="text-sm font-semibold text-ink md:text-base">Monthly Sample Income</h4>
          <p className="mb-3 text-xs text-slate1 md:mb-4 md:text-sm">Samples received in {year}</p>
          {hasSampleData ? (
            <div className="h-[200px] w-full md:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sampleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe3f0" />
                  <XAxis dataKey="label" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(value: number | string) => `$${value}`} />
                  <Tooltip formatter={(value: unknown) => formatUsd(Number(value) || 0)} />
                  <Bar dataKey="value" fill="#735BFF" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No sample income data for this year yet." />
          )}
        </article>

        <article className="app-card">
          <h4 className="text-sm font-semibold text-ink md:text-base">Monthly Disposition Gain/Loss</h4>
          <p className="mb-3 text-xs text-slate1 md:mb-4 md:text-sm">SOLD and GAVE_AWAY dispositions in {year}</p>
          {hasDispositionData ? (
            <div className="h-[200px] w-full md:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dispositionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe3f0" />
                  <XAxis dataKey="label" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(value: number | string) => `$${value}`} />
                  <Tooltip formatter={(value: unknown) => formatUsd(Number(value) || 0)} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {dispositionData.map((entry) => (
                      <Cell key={entry.month} fill={entry.value >= 0 ? "#735BFF" : "#FF7C57"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No dispositions recorded for this year." />
          )}
        </article>

        <article className="app-card">
          <h4 className="text-sm font-semibold text-ink md:text-base">Disposition Mix</h4>
          <p className="mb-3 text-xs text-slate1 md:mb-4 md:text-sm">Count by disposition type for items received in {year}</p>
          {hasMixData ? (
            <div className="h-[200px] w-full md:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dispositionMix} dataKey="count" nameKey="type" outerRadius={90} label>
                    {dispositionMix.map((entry) => (
                      <Cell key={entry.type} fill={pieColors[entry.type]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(
                      value: unknown,
                      _name: unknown,
                      payload: { payload: { type: "KEPT" | "SOLD" | "GAVE_AWAY" } },
                    ) => [`${Number(value) || 0}`, dispositionLabel(payload.payload.type)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No disposition mix data for this year." />
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {dispositionMix.map((entry) => (
              <span className="app-pill" key={entry.type}>
                {dispositionLabel(entry.type)}: {entry.count}
              </span>
            ))}
          </div>
        </article>

        <article className="app-card">
          <h4 className="text-sm font-semibold text-ink md:text-base">Top 10 Items by Receipt Value</h4>
          <p className="mb-3 text-xs text-slate1 md:mb-4 md:text-sm">Items received in {year}</p>
          {hasTopItems ? (
            <div className="h-[200px] w-full md:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItemsData} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe3f0" />
                  <XAxis
                    dataKey="value"
                    stroke="#64748b"
                    tickFormatter={(value: number | string) => `$${value}`}
                    type="number"
                  />
                  <YAxis dataKey="label" type="category" width={70} stroke="#64748b" />
                  <Tooltip formatter={(value: unknown) => formatUsd(Number(value) || 0)} />
                  <Bar dataKey="value" fill="#5B39FF" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No receipt items available for ranking." />
          )}
        </article>
      </div>
    </section>
  );
}
