import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Globe, LayoutDashboard, Lock, UserCog, ArrowRight, Radio } from "lucide-react";
import { cn } from "../../utils/cn";
import { accessLabel, avatarGradient, countdown, statusMeta, surfaceLabel } from "./supportSessionUtils";

/**
 * Pills, tiles and the clock shared by the support-session list and detail
 * screens. Both screens describe the same object, so they had grown two
 * copies of every badge — and the copies had already drifted (the list showed
 * "Full", the detail "Full access").
 */

export const CARD =
  "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
// Brand hero gradient — resolves to the platform palette (same vars as the sidebar).
export const HEADER_GRADIENT =
  "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";

export const surfaceIcon = (mode) => (mode === "website" ? Globe : LayoutDashboard);

/**
 * A clock the countdowns can trust.
 *
 * Two problems it solves. First, `Date.now()` read during render never ticks —
 * "expires in 42m" stayed at 42m until something else re-rendered the screen.
 * Second, an operator laptop running a few minutes fast would show a live
 * session as already expired (or worse, the reverse), because expiry is decided
 * on the server. So the API sends its own `serverTime`, we keep the offset, and
 * every countdown on both screens is measured against that.
 *
 * The interval only runs while something is actually counting down.
 */
export function useServerClock(running) {
  const skewRef = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  const sync = useCallback((serverTime) => {
    if (!serverTime) return;
    const t = new Date(serverTime).getTime();
    if (!Number.isNaN(t)) skewRef.current = Date.now() - t;
    setNow(Date.now() - skewRef.current);
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now() - skewRef.current);
    const id = setInterval(() => setNow(Date.now() - skewRef.current), 1000);
    return () => clearInterval(id);
  }, [running]);

  return { now, sync };
}

/** Status pill with a solid dot. Feed it an EFFECTIVE status, never a raw one. */
export function StatusPill({ status, className }) {
  const m = statusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold capitalize",
        m.pill,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

/** Access pill — view-only (amber) vs full (neutral). */
export function AccessPill({ access, onDark = false }) {
  if (access === "view_only") {
    return (
      <span className="inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
        <Eye className="h-3 w-3" /> {accessLabel(access)}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold",
        onDark
          ? "bg-white/15 text-white ring-1 ring-white/20"
          : "bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-white/10 dark:text-white/70 dark:ring-white/10",
      )}
    >
      <Lock className="h-3 w-3" /> {accessLabel(access)}
    </span>
  );
}

/** Surface chip — which side of the tenant the operator was standing on. */
export function SurfacePill({ mode, onDark = false }) {
  const Icon = surfaceIcon(mode);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold",
        onDark
          ? "bg-white/15 text-white ring-1 ring-white/20"
          : "bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-white/10 dark:text-white/70 dark:ring-white/10",
      )}
    >
      <Icon className="h-3 w-3" /> {surfaceLabel(mode)}
    </span>
  );
}

/** Tenant initial badge, tinted by the session's effective status. */
export function TenantAvatar({ name, status, size = "md" }) {
  const dims = size === "sm" ? "h-8 w-8 text-[11px]" : "h-12 w-12 text-lg";
  return (
    <span
      className={cn("grid shrink-0 place-items-center font-bold uppercase text-white shadow-sm", dims)}
      style={{ background: avatarGradient(statusMeta(status).color) }}
    >
      {String(name || "—").charAt(0)}
    </span>
  );
}

/** The focal "operator → acting as" block. Identical on both screens. */
export function ImpersonationBlock({ session }) {
  return (
    <div
      className="relative overflow-hidden py-3 pl-4 pr-3"
      style={{ background: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.08)" }}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: "var(--tenant-accent, #047857)" }} />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Operator</p>
          <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">{session.impersonatorEmail || "—"}</p>
          <p className="mt-2 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-gray-400">
            <ArrowRight className="h-3 w-3" /> Acting as
          </p>
          <p className="truncate text-xs font-semibold" style={{ color: "var(--tenant-accent, #047857)" }}>
            {session.targetEmail || "—"}
            {session.targetRole ? <span className="font-medium text-gray-400"> · {session.targetRole}</span> : null}
          </p>
        </div>
        <span
          className="grid h-10 w-10 shrink-0 place-items-center"
          style={{ background: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.16)", color: "var(--tenant-accent, #047857)" }}
        >
          <UserCog className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

/**
 * "Expires in 12m 04s" for a live session — the one number that tells an
 * operator whether they need to reach for Revoke or just wait.
 */
export function ExpiryCountdown({ session, now, onDark = false, className }) {
  const left = countdown(session?.expiresAt, now);
  if (!left) return null;
  const urgent = new Date(session.expiresAt).getTime() - now < 5 * 60 * 1000;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap font-mono text-[10px] font-semibold tabular-nums",
        onDark ? "text-white/85" : urgent ? "text-amber-600" : "text-emerald-600",
        className,
      )}
      title={`Expires ${new Date(session.expiresAt).toLocaleString()}`}
    >
      <Radio className="h-3 w-3 animate-pulse" /> {left} left
    </span>
  );
}

/** Stat cell in the attached strip under the hero banner. */
export function HeaderStat({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${color}1a`, color }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none text-gray-900 dark:text-white">{value}</p>
        <p className="mt-1 truncate text-xs text-gray-400">{label}</p>
        {sub ? <p className="truncate text-[10px] text-gray-300 dark:text-white/30">{sub}</p> : null}
      </div>
    </div>
  );
}
