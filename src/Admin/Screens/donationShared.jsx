// Presentational primitives shared by the admin Donations screens (list +
// detail). Pure helpers live in ./donationUtils.
import { Gift, Repeat, Layers } from "lucide-react";
import { cn } from "../../utils/cn";
import { initials, statusStyle, statusLabel, TYPE_LABEL, TYPE_CHIP } from "./donationUtils";

const TYPE_ICON = { "one-time": Gift, recurring: Repeat, installments: Layers };

/* Stat cell that sits in the gradient header band (donor-portal style). */
export function HeaderStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-heading text-lg font-bold leading-none text-primary" title={String(value)}>
          {value}
        </p>
        <p className="mt-1 text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const s = status || "pending";
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold", statusStyle(s))}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {statusLabel(s)}
    </span>
  );
}

export function TypeChip({ category }) {
  const key = TYPE_LABEL[category] ? category : "one-time";
  const Icon = TYPE_ICON[key];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide", TYPE_CHIP[key])}>
      <Icon className="h-3.5 w-3.5" /> {TYPE_LABEL[key]}
    </span>
  );
}

export function Avatar({ name, onGradient }) {
  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold uppercase",
        onGradient ? "bg-white/15 text-white" : "bg-accent/10 text-accent",
      )}
    >
      {initials(name)}
    </span>
  );
}
