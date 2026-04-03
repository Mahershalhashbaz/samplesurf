import dynamic from "next/dynamic";
import Link from "next/link";
import { CircleDollarSign, Clapperboard, Download, FileUp, Package, PlusCircle, TrendingDown, Wallet } from "lucide-react";

import { CountUpValue } from "@/components/CountUpValue";
import { KpiCard } from "@/components/KpiCard";
import { getDashboardMetrics } from "@/lib/queries";
import { parseTaxYear } from "@/lib/year";

const DashboardCharts = dynamic(
  () => import("@/components/DashboardCharts").then((module) => module.DashboardCharts),
  {
    ssr: false,
    loading: () => (
      <section className="app-card text-sm text-slate1">Loading charts...</section>
    ),
  },
);

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
    <div className="space-y-4 md:space-y-6">
      <section className="app-card ui-fade-up" style={{ animationDelay: "40ms" }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink md:text-2xl">Dashboard - {year}</h2>
            <p className="text-sm text-slate1">Fast snapshot for inventory and year-based tax events.</p>
          </div>
          <span className="app-pill">Tax Year {year}</span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          className="ui-fade-up ui-delay-1"
          label="Unsold Inventory"
          href={`/items?year=${year}`}
          icon={Package}
          value={<CountUpValue kind="number" value={metrics.unsoldInventoryCount} />}
        />
        <KpiCard
          className="ui-fade-up ui-delay-2"
          href={`/video-tracker?year=${year}`}
          icon={Clapperboard}
          label="Video Tracker"
          value={<CountUpValue kind="number" value={metrics.openVideoCount} />}
          hint="Open items still waiting for a video"
        />
        <KpiCard
          className="ui-fade-up ui-delay-3"
          label={`Sample Income (${year})`}
          value={<CountUpValue kind="currencyCents" value={metrics.sampleIncomeCents} />}
        />
        <KpiCard
          className="ui-fade-up ui-delay-4"
          label={`Disposition Gain/Loss (${year})`}
          value={<CountUpValue kind="currencyCents" value={metrics.dispositionGainLossCents} />}
        />
      </section>

      <section className="space-y-2 md:space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-ink md:text-xl">Tax Summary - {year}</h3>
          <span className="app-pill">Year Focus</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
          <KpiCard
            className="ui-fade-up ui-delay-1"
            label="Gross Income (Samples Received)"
            icon={CircleDollarSign}
            testId="tax-summary-gross"
            value={<CountUpValue kind="currencyCents" value={metrics.taxSummary.grossSampleIncomeCents} />}
          />
          <KpiCard
            className="ui-fade-up ui-delay-2"
            hint="Absolute value of negative gain/loss lines"
            icon={TrendingDown}
            label="Loss"
            testId="tax-summary-loss"
            value={<CountUpValue kind="currencyCents" value={metrics.taxSummary.lossCents} />}
          />
          <KpiCard
            className="ui-fade-up ui-delay-3"
            icon={Wallet}
            label="Net Total"
            testId="tax-summary-net"
            value={<CountUpValue kind="currencyCents" value={metrics.taxSummary.netTotalCents} />}
            hint="Gross sample income + disposition gain/loss"
          />
        </div>
      </section>

      <section className="app-card ui-fade-up" style={{ animationDelay: "120ms" }}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate1">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Link className="ui-action-hover btn-primary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto" href={`/items/new?year=${year}`}>
            <PlusCircle aria-hidden="true" size={15} />
            Add Item
          </Link>
          <Link className="ui-action-hover btn-secondary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto" href={`/items?year=${year}`}>
            <Package aria-hidden="true" size={15} />
            Inventory
          </Link>
          <Link className="ui-action-hover btn-secondary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto" href={`/video-tracker?year=${year}`}>
            <Clapperboard aria-hidden="true" size={15} />
            Video Tracker
          </Link>
          <Link className="ui-action-hover btn-secondary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto" href={`/import?year=${year}`}>
            <FileUp aria-hidden="true" size={15} />
            Import CSV
          </Link>
          <Link className="ui-action-hover btn-secondary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto" href={`/tax-year?year=${year}`}>
            <Wallet aria-hidden="true" size={15} />
            Go to Tax Year View
          </Link>
          <a className="ui-action-hover btn-secondary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto" href="/api/export/backup">
            <Download aria-hidden="true" size={15} />
            Export Backup
          </a>
        </div>
      </section>

      <div className="ui-fade-up" style={{ animationDelay: "160ms" }}>
        <DashboardCharts
          dispositionMix={metrics.charts.dispositionMix}
          monthlyDispositionGainLoss={metrics.charts.monthlyDispositionGainLoss}
          monthlySampleIncome={metrics.charts.monthlySampleIncome}
          topReceiptItems={metrics.charts.topReceiptItems}
          year={year}
        />
      </div>
    </div>
  );
}
