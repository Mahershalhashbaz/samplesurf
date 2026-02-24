type StatusChipProps = {
  label: string;
  tone?: "default" | "ok" | "warn";
};

const tones: Record<NonNullable<StatusChipProps["tone"]>, string> = {
  default: "bg-ice text-ink border-[color:var(--slate2)]/40",
  ok: "bg-emerald-100 text-emerald-800 border-emerald-200",
  warn: "bg-amber-100 text-amber-800 border-amber-200",
};

export function StatusChip({ label, tone = "default" }: StatusChipProps) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {label}
    </span>
  );
}
