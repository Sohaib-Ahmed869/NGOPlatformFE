// Presentational primitives shared by the admin Donors screens (list + detail).
// Pure helpers live in ./donorUtils.
import { cn } from "../../utils/cn";
import { initials, TYPE_LABEL, TYPE_CHIP } from "./donorUtils";

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

export function Avatar({ name, size = "sm", onGradient }) {
  const dim = size === "lg" ? "h-14 w-14 text-lg" : "h-9 w-9 text-xs";
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold uppercase",
        dim,
        onGradient ? "bg-white/15 text-white" : "bg-accent/10 text-accent",
      )}
    >
      {initials(name)}
    </span>
  );
}

export function TypeChip({ type }) {
  const key = TYPE_LABEL[type] ? type : "one-time";
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide", TYPE_CHIP[key])}>
      {TYPE_LABEL[key]}
    </span>
  );
}
