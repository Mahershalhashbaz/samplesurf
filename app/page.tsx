import Link from "next/link";
import { CircleDollarSign, Download, FileUp, PlusCircle, TrendingDown, Wallet } from "lucide-react";

import { DashboardCharts } from "@/components/DashboardCharts";
import { KpiCard } from "@/components/KpiCard";
import { formatCents } from "@/lib/money";
import { getDashboardMetrics } from "@/lib/queries";
import { parseTaxYear } from "@/lib/year";

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function firstString(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const year = parseTaxYear(firstString(searchParams.year));
  const metrics = await getDashboardMetrics(year);

  return (
    <div className="space-y-6">
      <section className="app-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Dashboard - {year}</h2>
            <p className="text-sm text-slate1">Fast snapshot for inventory and year-based tax events.</p>
          </div>
          <span className="app-pill">Tax Year {year}</span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Unsold Inventory" value={String(metrics.unsoldInventoryCount)} />
        <KpiCard label={`Sample Income (${year})`} value={formatCents(metrics.sampleIncomeCents)} />
        <KpiCard
          label={`Disposition Gain/Loss (${year})`}
          value={formatCents(metrics.dispositionGainLossCents)}
        />
        <KpiCard label="Needs Attention" value={String(metrics.needsAttentionCount)} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold text-ink">Tax Summary - {year}</h3>
          <span className="app-pill">Year Focus</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard
            label="Gross Income (Samples Received)"
            icon={CircleDollarSign}
            testId="tax-summary-gross"
            value={formatCents(metrics.taxSummary.grossSampleIncomeCents)}
          />
          <KpiCard
            hint="Absolute value of negative gain/loss lines"
            icon={TrendingDown}
            label="Loss"
            testId="tax-summary-loss"
            value={formatCents(metrics.taxSummary.lossCents)}
          />
          <KpiCard
            icon={Wallet}
            label="Net Total"
            testId="tax-summary-net"
            value={formatCents(metrics.taxSummary.netTotalCents)}
            hint="Gross sample income + disposition gain/loss"
          />
        </div>
      </section>

      <section className="app-card">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate1">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-primary inline-flex items-center gap-1.5" href={`/items/new?year=${year}`}>
            <PlusCircle aria-hidden="true" size={15} />
            Add Item
          </Link>
          <Link className="btn-secondary inline-flex items-center gap-1.5" href={`/import?year=${year}`}>
            <FileUp aria-hidden="true" size={15} />
            Import CSV
          </Link>
          <Link className="btn-secondary inline-flex items-center gap-1.5" href={`/tax-year?year=${year}`}>
            <Wallet aria-hidden="true" size={15} />
            Go to Tax Year View
          </Link>
          <a className="btn-secondary inline-flex items-center gap-1.5" href="/api/export/backup">
            <Download aria-hidden="true" size={15} />
            Export Backup
          </a>
        </div>
      </section>

      <DashboardCharts
        dispositionMix={metrics.charts.dispositionMix}
        monthlyDispositionGainLoss={metrics.charts.monthlyDispositionGainLoss}
        monthlySampleIncome={metrics.charts.monthlySampleIncome}
        topReceiptItems={metrics.charts.topReceiptItems}
        year={year}
      />
    </div>
  );
}
