import type { LucideIcon } from "lucide-react";

type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  testId?: string;
  icon?: LucideIcon;
};

export function KpiCard({ label, value, hint, testId, icon: Icon }: KpiCardProps) {
  return (
    <div className="app-card" data-testid={testId}>
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate1">
        {Icon ? <Icon aria-hidden="true" size={14} /> : null}
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate1">{hint}</p> : null}
    </div>
  );
}
