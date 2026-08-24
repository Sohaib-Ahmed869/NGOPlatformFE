import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  ShieldCheck,
  Building2,
  Eye,
  Ban,
  Search,
  LayoutGrid,
  List,
  Globe,
  UserCog,
  Activity,
  Radio,
  Calendar,
  Clock,
  ArrowUpRight,
  RefreshCw,
  X,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SASelect from "../components/SASelect";
import SAErrorState from "../components/SAErrorState";
import SALoader from "../SALoader";
import { useConfirm } from "../components/ConfirmProvider";
import { useSARealtime } from "../context/SARealtimeContext";
import toast from "react-hot-toast";

import AnimatedNumberBase from "../components/AnimatedNumber";
import useSupportSessions from "../hooks/useSupportSessions";
import {
  STATUS_OPTIONS,
  STATUS_VALUES,
  effectiveStatus,
  fmt,
  fmtShort,
  isLive,
  statusMeta,
  surfaceLabel,
  tenantName,
} from "./supportSessionUtils";
import {
  AccessPill,
  CARD as card,
  ExpiryCountdown,
  HEADER_GRADIENT,
  HeaderStat,
  ImpersonationBlock,
  StatusPill,
  TenantAvatar,
  surfaceIcon,
  useServerClock,
} from "./supportSessionShared";

// Kept this screen's original 0.8s pacing — deduplicating the
// implementation shouldn't silently restyle it.
const AnimatedNumber = (props) => <AnimatedNumberBase duration={0.8} {...props} />;
const inputCls =
  "w-full border border-gray-200 bg-white py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/90";

const LIMIT = 50;

/** Enter/Space activates a row the same way a click does. */
const onRowKey = (fn) => (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  fn();
};

export default function SupportSessions() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { sessionsVersion } = useSARealtime();

  /* ── filters live in the URL ──────────────────────────────────────────────
     They used to be component state, so a session you had filtered down to was
     unlinkable, and coming back from a session's detail page dropped you at
     "all statuses, page 1". */
  const [params, setParams] = useSearchParams();
  const status = STATUS_VALUES.includes(params.get("status")) ? params.get("status") : "all";
  const page = Math.max(1, parseInt(params.get("page"), 10) || 1);
  const view = params.get("view") === "table" ? "table" : "grid";
  const query = (params.get("q") || "").trim();

  const setParam = useCallback(
    (next) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(next)) {
            if (v === null || v === undefined || v === "") p.delete(k);
            else p.set(k, String(v));
          }
          return p;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // The box types locally and lands in the URL 300ms later; the URL is still
  // the single source of truth, so Back and Clear filters both work on it.
  const [search, setSearch] = useState(query);
  const searchRef = useRef(null);
  useEffect(() => {
    setSearch((cur) => (cur.trim() === query ? cur : query));
  }, [query]);
  useEffect(() => {
    if (search.trim() === query) return undefined;
    const t = setTimeout(() => setParam({ q: search.trim() || null, page: null }), 300);
    return () => clearTimeout(t);
  }, [search, query, setParam]);

  // "/" jumps to the search box, as everywhere else in the console.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── data ─────────────────────────────────────────────────────────────── */
  const requestParams = { page, limit: LIMIT };
  if (status !== "all") requestParams.status = status;
  if (query) requestParams.search = query;

  const onBackgroundError = useCallback((message) => toast.error(message), []);
  const { phase, revalidating, sessions, total, summary, serverTime, error, anyLive, refresh, patch } =
    useSupportSessions({ params: requestParams, version: sessionsVersion, onError: onBackgroundError });

  // Countdowns tick against server time, and only while something is counting.
  const { now, sync } = useServerClock(anyLive);
  useEffect(() => {
    sync(serverTime);
  }, [serverTime, sync]);

  const pages = Math.max(1, Math.ceil(total / LIMIT) || 1);
  // Revoking the last row of the last page (or a filter change shrinking the
  // set) used to strand the operator on an empty page with no way back.
  useEffect(() => {
    if (phase === "ready" && page > pages) setParam({ page: pages > 1 ? pages : null });
  }, [phase, page, pages, setParam]);

  /* ── derived ──────────────────────────────────────────────────────────── */
  const hasFilters = Boolean(query || search.trim() || status !== "all");
  const clearFilters = () => {
    setSearch("");
    setParam({ q: null, status: null, page: null });
  };

  // The server sweeps lapsed sessions on every read, but a row can cross its
  // expiry while it sits on screen. Discount those here so the tile and the
  // Revoke buttons agree with what the middleware would actually allow.
  const lapsedOnPage = sessions.filter((s) => s.status === "active" && !isLive(s, now)).length;
  const liveNow = Math.max(0, (summary.liveNow ?? summary.activeNow) - lapsedOnPage);

  /* ── revoking ─────────────────────────────────────────────────────────── */
  // A set, not a single `busyId`: "Revoke all" puts every live row in flight at
  // once, and one id could only ever disable one of them.
  const [busyIds, setBusyIds] = useState(() => new Set());
  const markBusy = (ids, on) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      for (const id of [].concat(ids)) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const revoke = (session) =>
    confirm({
      title: "Revoke support session",
      tone: "danger",
      icon: Ban,
      confirmText: "Revoke",
      message: (
        <>
          Kill <strong className="text-gray-800 dark:text-white">{session.impersonatorEmail || "this operator"}</strong>
          ’s live access to{" "}
          <strong className="text-gray-800 dark:text-white">{tenantName(session)}</strong>? The token is rejected on its
          very next request.
        </>
      ),
      onConfirm: async () => {
        markBusy(session.sessionId, true);
        try {
          await superadminService.revokeSupportSession(session.sessionId);
          patch(session.sessionId, { status: "revoked", endedAt: new Date().toISOString() });
          toast.success("Session revoked — the token is killed immediately");
          refresh();
        } catch (err) {
          // 409 means someone (or the expiry sweep) got there first. That's the
          // outcome the operator wanted, so close the dialog and show the truth
          // rather than making them retry a session that's already dead.
          const already = err?.response?.status === 409 ? err.response.data?.status : null;
          if (already) {
            patch(session.sessionId, { status: already, endedAt: new Date().toISOString() });
            toast(`Session was already ${already}`, { icon: "ℹ️" });
            refresh();
            return;
          }
          toast.error(err?.response?.data?.error || "Failed to revoke");
          throw err; // keep the dialog open so Revoke can be retried
        } finally {
          markBusy(session.sessionId, false);
        }
      },
    });

  const revokeAll = () =>
    confirm({
      title: `Revoke all ${liveNow} live session${liveNow === 1 ? "" : "s"}`,
      tone: "danger",
      icon: Ban,
      confirmText: "Revoke all",
      message:
        "Every platform operator currently inside a tenant is cut off on their very next request. Sessions that already ended are left alone.",
      onConfirm: async () => {
        const ids = sessions.filter((s) => s.status === "active").map((s) => s.sessionId);
        markBusy(ids, true);
        try {
          const res = await superadminService.revokeAllSupportSessions();
          const n = res.data?.revoked || 0;
          patch(res.data?.sessions || ids, { status: "revoked", endedAt: new Date().toISOString() });
          toast.success(n ? `${n} session${n === 1 ? "" : "s"} revoked` : "Nothing was live");
          refresh();
        } catch (err) {
          toast.error(err?.response?.data?.error || "Failed to revoke sessions");
          throw err;
        } finally {
          markBusy(ids, false);
        }
      },
    });

  const statTiles = [
    {
      label: hasFilters ? "Sessions (filtered)" : "Total sessions",
      value: <AnimatedNumber value={total} />,
      sub: hasFilters ? "matching your filters" : "all time",
      icon: ShieldCheck,
      color: "#6366f1",
    },
    {
      label: "Live right now",
      value: <AnimatedNumber value={liveNow} />,
      // Unfiltered on purpose: no filter should be able to hide the answer to
      // "is anyone inside a tenant at this moment".
      sub: liveNow > 0 ? "across all tenants" : "nobody is impersonating",
      icon: Radio,
      color: liveNow > 0 ? "#10b981" : "#9ca3af",
    },
    {
      label: "Operators",
      value: <AnimatedNumber value={summary.operators} />,
      sub: "distinct actors",
      icon: UserCog,
      color: "#f59e0b",
    },
    {
      label: "Tenants touched",
      value: <AnimatedNumber value={summary.tenants} />,
      sub: "distinct organisations",
      icon: Building2,
      color: "#06b6d4",
    },
  ];

  const from = (page - 1) * LIMIT + 1;
  const to = Math.min(total, (page - 1) * LIMIT + sessions.length);

  return (
    // Sharp-corner variant of this screen: square every descendant's corners
    // (cards, pills, buttons, inputs, badges, modal) for an angular look — matches
    // the Organisations / Audit / Platform / Settings screens.
    <MotionConfig reducedMotion="user">
      <div className="[&_*]:!rounded-none">
        {/* Hero — gradient banner + attached stat strip (mirrors Organisations) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={`${card} mb-6 overflow-hidden`}
        >
          <div
            className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden px-6 py-7 sm:px-8"
            style={{ background: HEADER_GRADIENT }}
          >
            {/* Editorial corner decoration — SVG circle (so the page-wide sharp-corner
                override can't square it) + dot grid. */}
            <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
              <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
              <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
            </svg>
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-4 right-12 h-10 w-24 opacity-[.20]"
              style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.95) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }}
            />
            <div className="relative z-10 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Security</p>
              <h1 className="mt-1 text-2xl font-bold text-white">Support sessions</h1>
              <p className="mt-1 text-sm text-white/80">Every platform-support impersonation, with a live kill switch.</p>
            </div>

            {/* Live state + the panic switch. Announced politely so a screen
                reader hears a session start without re-reading the page. */}
            <div className="relative z-10 flex shrink-0 flex-col items-start gap-2 sm:items-end">
              {/* "No live sessions" is a claim, so it waits for real data —
                  saying it over a failed load would be a lie about security. */}
              <span aria-live="polite" className="inline-flex items-center gap-1.5 bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/20">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${liveNow > 0 ? "animate-pulse bg-emerald-300" : "bg-white/50"}`}
                />
                {phase !== "ready" ? "Checking…" : liveNow > 0 ? `${liveNow} live now` : "No live sessions"}
              </span>
              {phase === "ready" && liveNow > 0 && (
                <button
                  type="button"
                  onClick={revokeAll}
                  className="inline-flex items-center gap-1.5 bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
                >
                  <Ban className="h-3.5 w-3.5" /> Revoke all
                </button>
              )}
            </div>
          </div>
          {phase === "ready" && (
            <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-white/10 sm:grid-cols-4 sm:divide-y-0">
              {statTiles.map((t, i) => (
                <motion.div
                  key={t.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.06, duration: 0.4, ease: "easeOut" }}
                >
                  <HeaderStat {...t} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setSearch("")}
              placeholder="Search tenant, operator, acting-as or reason…"
              aria-label="Search support sessions"
              className={`${inputCls} rounded-xl pl-10 pr-9 [&::-webkit-search-cancel-button]:hidden`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <SASelect value={status} onChange={(v) => setParam({ status: v === "all" ? null : v, page: null })} capitalize options={STATUS_OPTIONS} />
          <button
            type="button"
            title="Refresh"
            aria-label="Refresh"
            onClick={refresh}
            disabled={phase === "loading" || revalidating}
            className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
          >
            <RefreshCw className={`h-4 w-4 ${revalidating ? "animate-spin" : ""}`} />
          </button>
          {/* View toggle — cards / table */}
          <div className="flex shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5">
            {[["grid", LayoutGrid], ["table", List]].map(([v, Icon]) => (
              <button
                key={v}
                type="button"
                onClick={() => setParam({ view: v === "grid" ? null : v })}
                aria-label={`${v} view`}
                aria-pressed={view === v}
                className={`grid h-10 w-10 place-items-center transition-colors ${
                  view === v ? "bg-accent text-white" : "text-gray-500 hover:bg-gray-50 dark:text-white/60 dark:hover:bg-white/5"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        {phase === "loading" ? (
          <SALoader />
        ) : phase === "error" ? (
          <SAErrorState message={error} onRetry={refresh} />
        ) : sessions.length === 0 ? (
          <div className={`${card} py-20 text-center`}>
            {hasFilters ? (
              <>
                <Search className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-gray-500 dark:text-white/60">
                  {query ? `No sessions match “${query}”` : `No ${status} sessions`}
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white/80 dark:hover:bg-white/5"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-gray-500 dark:text-white/60">No support sessions yet</p>
                <p className="mt-1 text-xs text-gray-400">
                  One appears here the moment an operator opens a tenant with “Act as”.
                </p>
              </>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {view === "grid" ? (
              <motion.div
                key="grid"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                aria-busy={revalidating}
              >
                {sessions.map((s, i) => {
                  const state = effectiveStatus(s, now);
                  const live = state === "active";
                  const SurfIcon = surfaceIcon(s.mode);
                  const name = tenantName(s);
                  const open = () => navigate(`/support-sessions/${s.sessionId}`);
                  return (
                    <motion.div
                      key={s.sessionId}
                      role="button"
                      tabIndex={0}
                      aria-label={`Support session for ${name}, ${statusMeta(state).label}`}
                      className={`${card} group relative flex cursor-pointer flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4), ease: [0.2, 0.7, 0.2, 1] }}
                      onClick={open}
                      onKeyDown={onRowKey(open)}
                    >
                      {/* live accent stripe */}
                      {live && <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: statusMeta("active").color }} />}

                      <div className="flex flex-1 flex-col p-5">
                        {/* header row: slug tag + access & status pills */}
                        <div className="mb-4 flex items-center justify-between gap-2">
                          <span className="inline-flex min-w-0 items-center gap-1.5 bg-gray-100 px-2 py-1 font-mono text-[10px] text-gray-500 dark:bg-white/10 dark:text-white/60">
                            <Globe className="h-3 w-3 shrink-0" />
                            <span className="truncate">{s.orgSlug || name}</span>
                          </span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <AccessPill access={s.access} />
                            <StatusPill status={state} />
                          </div>
                        </div>

                        {/* identity: initial badge + tenant + reason/surface */}
                        <div className="mb-4 flex items-center gap-3">
                          <TenantAvatar name={name} status={state} />
                          <div className="min-w-0">
                            <h3 className="flex items-center gap-1.5 truncate text-base font-bold text-gray-900 dark:text-white">
                              <span className="truncate">{name}</span>
                              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
                            </h3>
                            <span className="flex min-w-0 items-center gap-1 text-[11px] text-gray-400">
                              <SurfIcon className="h-3 w-3 shrink-0" />
                              <span className="truncate">{s.reason || surfaceLabel(s.mode)}</span>
                            </span>
                          </div>
                        </div>

                        {/* focal block — operator → acting as */}
                        <div className="mb-4">
                          <ImpersonationBlock session={s} />
                        </div>

                        {/* meta grid: surface · actions · started · ended/expires */}
                        <div className="mt-auto grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 dark:border-white/10">
                          <div className="min-w-0">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Surface</p>
                            <p className="mt-1 flex items-center gap-1 truncate text-xs font-medium text-gray-700 dark:text-white/80">
                              <SurfIcon className="h-3 w-3 shrink-0 text-gray-400" /> {surfaceLabel(s.mode)}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Actions</p>
                            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-white/80">
                              <Activity className="h-3 w-3 shrink-0 text-gray-400" /> {s.actionCount || 0}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Started</p>
                            <p className="mt-1 flex items-center gap-1 truncate text-xs font-medium text-gray-700 dark:text-white/80">
                              <Calendar className="h-3 w-3 shrink-0 text-gray-400" /> {fmtShort(s.startedAt)}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">{live ? "Expires" : "Ended"}</p>
                            {live ? (
                              <span className="mt-1 flex items-center gap-1">
                                <ExpiryCountdown session={s} now={now} />
                              </span>
                            ) : (
                              <p className="mt-1 flex items-center gap-1 truncate text-xs font-medium text-gray-700 dark:text-white/80">
                                <Clock className="h-3 w-3 shrink-0 text-gray-400" /> {fmtShort(s.endedAt || s.expiresAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* segmented action footer — stop the card's navigate from firing */}
                      <div
                        className="flex items-stretch border-t border-gray-100 text-[11px] font-semibold dark:border-white/10"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        role="presentation"
                      >
                        <button
                          type="button"
                          onClick={open}
                          className="flex flex-1 items-center justify-center gap-1.5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                          style={{ color: "var(--tenant-accent, #047857)" }}
                        >
                          <Eye className="h-3.5 w-3.5" /> View detail
                        </button>
                        {live && (
                          <button
                            type="button"
                            onClick={() => revoke(s)}
                            disabled={busyIds.has(s.sessionId)}
                            className="flex flex-1 items-center justify-center gap-1.5 border-l border-gray-100 py-3 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-white/10 dark:hover:bg-red-500/10"
                          >
                            <Ban className="h-3.5 w-3.5" /> Revoke
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="table"
                className={`${card} overflow-hidden`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                aria-busy={revalidating}
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 text-left dark:border-white/10" style={{ backgroundColor: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.14)" }}>
                        {["Tenant", "Operator", "Acting as", "Surface", "Access", "Status", "Actions", "Started", ""].map((h, i) => (
                          <th key={h || `spacer-${i}`} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-white/60">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => {
                        const state = effectiveStatus(s, now);
                        const live = state === "active";
                        const SurfIcon = surfaceIcon(s.mode);
                        const name = tenantName(s);
                        const open = () => navigate(`/support-sessions/${s.sessionId}`);
                        return (
                          <tr
                            key={s.sessionId}
                            tabIndex={0}
                            aria-label={`Support session for ${name}, ${statusMeta(state).label}`}
                            onClick={open}
                            onKeyDown={onRowKey(open)}
                            className="cursor-pointer border-t border-gray-100 transition-colors hover:bg-gray-50/70 focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-accent dark:border-white/10 dark:hover:bg-white/5"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <TenantAvatar name={name} status={state} size="sm" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-white/70">{s.impersonatorEmail || "—"}</td>
                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-white/70">{s.targetEmail || "—"}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/60">
                                <SurfIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                {surfaceLabel(s.mode)}
                              </span>
                            </td>
                            <td className="px-4 py-3"><AccessPill access={s.access} /></td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col items-start gap-1">
                                <StatusPill status={state} />
                                {live ? <ExpiryCountdown session={s} now={now} /> : null}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-white/80">{s.actionCount || 0}</td>
                            <td className="px-4 py-3 text-xs text-gray-400" title={fmt(s.startedAt)}>{fmtShort(s.startedAt)}</td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="presentation">
                              {live && (
                                <button
                                  type="button"
                                  onClick={() => revoke(s)}
                                  disabled={busyIds.has(s.sessionId)}
                                  className="inline-flex items-center gap-1 border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10"
                                >
                                  <Ban className="h-3 w-3" /> Revoke
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Pagination */}
        {phase === "ready" && sessions.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-1">
            <span className="font-mono text-xs text-gray-400">
              {from}–{to} of {total}
              {pages > 1 ? ` · page ${page} of ${pages}` : ""}
            </span>
            {pages > 1 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setParam({ page: Math.max(1, page - 1) })}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setParam({ page: Math.min(pages, page + 1) })}
                  disabled={page >= pages}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
