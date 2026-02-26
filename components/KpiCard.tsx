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
      <p className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate1">{hint}</p> : null}
    </div>
  );
}
