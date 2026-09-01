import { Crown, ShieldCheck, LifeBuoy, CreditCard, Building2, Mail, Check, Ban, Lock } from "lucide-react";
import { cn } from "../../utils/cn";
import { ROLE_LABELS } from "../utils/platformRoles";

const ROLE_META = {
  owner: { icon: Crown, cls: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20" },
  admin: { icon: ShieldCheck, cls: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20" },
  support: { icon: LifeBuoy, cls: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20" },
  billing: { icon: CreditCard, cls: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20" },
  tenant_manager: { icon: Building2, cls: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20" },
};

export function RoleBadge({ role, className }) {
  const m = ROLE_META[role] || ROLE_META.support;
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold ring-1", m.cls, className)}>
      <Icon className="h-3 w-3" /> {ROLE_LABELS[role] || role}
    </span>
  );
}

const STATUS_META = {
  active: { icon: Check, cls: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20", label: "Active" },
  invited: { icon: Mail, cls: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20", label: "Invited" },
  suspended: { icon: Ban, cls: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20", label: "Suspended" },
  // Not a stored status — it is "active, but five failed sign-ins ago". Shown
  // in the status column because that is the question being asked ("why can't
  // they get in?"), and it clears itself after fifteen minutes.
  locked: { icon: Lock, cls: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20", label: "Locked out" },
};

export function StatusBadge({ status, className }) {
  const m = STATUS_META[status] || STATUS_META.active;
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold ring-1", m.cls, className)}>
      <Icon className="h-3 w-3" /> {m.label}
    </span>
  );
}
