// Presentational primitives shared by the admin Installments screens (list +
// detail), so a plan reads identically wherever it shows up and mirrors the
// donor "My Subscriptions" look. Pure helpers live in ./installmentUtils.
import { Layers } from "lucide-react";
import { cn } from "../../utils/cn";
import { ENDED, initials, statusStyle, statusLabel } from "./installmentUtils";

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

export function TypeChip() {
  return (
    <span className="inline-flex items-center gap-1.5 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-600">
      <Layers className="h-3.5 w-3.5" /> Installment
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

/* Progress bar — colour follows lifecycle (gold while running, emerald done). */
export function ProgressBar({ paid, total, status, thin }) {
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const s = (status || "").toLowerCase();
  const fill =
    s === "completed"
      ? "bg-emerald-500"
      : ENDED.includes(s)
        ? "bg-gray-300"
        : "bg-gradient-to-r from-accent to-accent-light";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-text-muted">
        <span>
          {paid} of {total} paid
        </span>
        <span className="font-semibold text-primary">{pct}%</span>
      </div>
      <div className={cn("overflow-hidden rounded-full bg-gray-100", thin ? "h-1.5" : "h-2")}>
        <div className={cn("h-full rounded-full transition-all", fill)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
