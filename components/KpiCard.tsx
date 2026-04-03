import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type KpiCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  testId?: string;
  icon?: LucideIcon;
  className?: string;
  href?: string;
};

export function KpiCard({ label, value, hint, testId, icon: Icon, className, href }: KpiCardProps) {
  const content = (
    <>
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate1">
        {Icon ? <Icon aria-hidden="true" size={14} /> : null}
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate1">{hint}</p> : null}
    </>
  );

  const classes = `app-card ${
    href ? "ui-action-hover block transition hover:border-[color:var(--brand-primary)]/35 hover:shadow-soft" : ""
  } ${className ?? ""}`.trim();

  if (href) {
    return (
      <Link className={classes} data-testid={testId} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <div className={classes} data-testid={testId}>
      {content}
    </div>
  );
}
