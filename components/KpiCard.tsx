import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type KpiCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  testId?: string;
  icon?: LucideIcon;
  className?: string;
};

export function KpiCard({ label, value, hint, testId, icon: Icon, className }: KpiCardProps) {
  return (
    <div className={`app-card ${className ?? ""}`.trim()} data-testid={testId}>
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate1">
        {Icon ? <Icon aria-hidden="true" size={14} /> : null}
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate1">{hint}</p> : null}
    </div>
  );
}
