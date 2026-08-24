import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Search, Inbox, Building2, Star, RefreshCw, CircleDot, AlertCircle, UserRound, ChevronRight, MessageSquare, X } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SAErrorState from "../components/SAErrorState";
import { supportCategoryLabel } from "../../config/supportCategories";
import { ticketSourceKey, ticketSourceMeta, TICKET_SOURCE_FILTER_OPTIONS } from "../../config/ticketSource";
import { useSARealtime } from "../context/SARealtimeContext";
import SASelect from "../components/SASelect";
import SALoader from "../SALoader";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

import AnimatedNumberBase from "../components/AnimatedNumber";

// Kept this screen's original 0.7s pacing — deduplicating the
// implementation shouldn't silently restyle it.
const AnimatedNumber = (props) => <AnimatedNumberBase duration={0.7} {...props} />;
const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
// Brand hero gradient — the platform palette (same vars as the sidebar),
// mirroring the Organisations / Audit / Support-session / Kanban hero.
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";
const inputCls =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-accent dark:border-white/10 dark:bg-white/5";

const STATUS = { new: "bg-blue-50 text-blue-700", in_progress: "bg-amber-50 text-amber-700", on_hold: "bg-gray-100 text-gray-600", solved: "bg-emerald-50 text-emerald-700", declined: "bg-red-50 text-red-700" };
const STATUS_DOT = { new: "#3b82f6", in_progress: "#f59e0b", on_hold: "#9ca3af", solved: "#10b981", declined: "#ef4444" };
const PRIORITY = { low: "bg-gray-100 text-gray-600", medium: "bg-sky-50 text-sky-700", high: "bg-orange-50 text-orange-700", critical: "bg-red-50 text-red-700" };
const PRIORITY_DOT = { low: "#9ca3af", medium: "#0ea5e9", high: "#f97316", critical: "#ef4444" };
const TRIAGE = { unclassified: "bg-gray-100 text-gray-500", bug: "bg-red-50 text-red-700", feature: "bg-violet-50 text-violet-700", invalid: "bg-gray-100 text-gray-500", duplicate: "bg-gray-100 text-gray-500" };
const label = (s) => String(s || "").replace(/_/g, " ");

const TRIAGE_OPTS = ["unclassified", "bug", "feature", "invalid", "duplicate"];
const STATUS_FILTERS = ["all", "new", "in_progress", "on_hold", "solved", "declined"];

function timeAgo(d) {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function Badge({ className, children }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", className)}>{children}</span>;
}
function StatusPill({ status }) {
  return <Badge className={STATUS[status]}><span className="mr-1 h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT[status] }} />{label(status)}</Badge>;
}
// "Who is this from" chip — tenant (NGO staff) vs tenant customer (donor) vs public.
function SourceBadge({ reporter, className }) {
  const m = ticketSourceMeta(reporter);
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", m.badge, className)} title={m.description}>
      <Icon className="h-2.5 w-2.5" />{m.label}
    </span>
  );
}
/* Stat cell in the attached strip under the hero banner (Organisations look). */
function HeaderStat({ icon: Icon, label: lbl, value, sub, color }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${color}1a`, color }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none text-gray-900 dark:text-white">{value}</p>
        <p className="mt-1 truncate text-xs text-gray-400">{lbl}</p>
        {sub ? <p className="truncate text-[10px] text-gray-300 dark:text-white/30">{sub}</p> : null}
      </div>
    </div>
  );
}

export default function Tickets() {
  const navigate = useNavigate();
  const { ticketsVersion } = useSARealtime();
  // Hydrate from the session cache so revisits are instant (no loader flash) —
  // null cache = first visit (show the loader).
  const cached = superadminService.getTicketsCached();
  const [all, setAll] = useState(cached?.tickets || []);
  const [meta, setMeta] = useState({ total: cached?.total ?? 0, truncated: !!cached?.truncated, stats: cached?.stats || null });
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [revalidating, setRevalidating] = useState(false);
  const [filters, setFilters] = useState({ triage: "all", status: "all", priority: "all", source: "all", search: "" });
  const [, setTick] = useState(0);

  const applyPayload = useCallback((data) => {
    setAll(data.tickets || []);
    setMeta({ total: data.total ?? (data.tickets || []).length, truncated: !!data.truncated, stats: data.stats || null });
    setError(null);
  }, []);

  // Manual refresh / socket refresh / background revalidate — bypasses the cache
  // but never toggles the full-page loader (that's the first-visit path below).
  const fetchAll = useCallback(async () => {
    setRevalidating(true);
    try {
      applyPayload(await superadminService.loadTickets({ force: true }));
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to load tickets");
    } finally {
      setRevalidating(false);
    }
  }, [applyPayload]);

  // This used to force a network request on EVERY mount, so the cache only
  // saved the loader flash. Ticket events are now tracked globally in the
  // realtime context, so an unchanged cache can be trusted: revisiting costs
  // no request, and `ticketsVersion` refreshes the screen when one lands.
  useEffect(() => {
    const cachedNow = superadminService.getTicketsCached();
    if (cachedNow && !superadminService.areTicketsStale()) {
      applyPayload(cachedNow);
      setLoading(false);
      return;
    }
    if (cachedNow) {
      // Stale → keep showing it and revalidate quietly.
      fetchAll();
      return;
    }
    (async () => {
      try {
        applyPayload(await superadminService.loadTickets());
      } catch (err) {
        // An empty grid reads as "no tickets" — say the load failed instead.
        setError(err?.response?.data?.error || "Couldn't load tickets.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketsVersion]);

  // Mirror socket-driven refreshes into the cache for instant, fresh revisits.
  useEffect(() => {
    superadminService.setTicketsCache(all);
  }, [all]);

  // Keep relative "age" times live.
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(i);
  }, []);

  // Real-time is handled centrally now: SARealtimeContext listens for
  // ticket:new / ticket:update, flags the caches stale (including the changed
  // ticket's detail) and bumps `ticketsVersion`, which the load effect above
  // depends on. Listening here only worked while this screen was mounted.

  // Headline figures come from the server's aggregate over the WHOLE
  // collection. They used to be derived from `all`, which is capped at 1000
  // rows — so every tile quietly under-reported once the platform grew past
  // the cap. The local fallback keeps the screen working against an older API.
  const stats = useMemo(() => {
    const s = meta.stats;
    if (s) return { total: s.total, open: s.open, unassigned: s.unassigned, untriaged: s.untriaged, csat: s.csat, ratedCount: s.csatCount };
    const open = all.filter((t) => ["new", "in_progress", "on_hold"].includes(t.status));
    const rated = all.filter((t) => t.satisfactionRating);
    return {
      total: all.length,
      open: open.length,
      unassigned: open.filter((t) => !t.assignee?.userId).length,
      untriaged: all.filter((t) => (t.triage || "unclassified") === "unclassified").length,
      csat: rated.length ? rated.reduce((s2, t) => s2 + t.satisfactionRating, 0) / rated.length : 0,
      ratedCount: rated.length,
    };
  }, [meta.stats, all]);

  const statusCounts = useMemo(() => {
    if (meta.stats?.byStatus) return { all: meta.stats.total, ...meta.stats.byStatus };
    const c = { all: all.length };
    all.forEach((t) => { c[t.status] = (c[t.status] || 0) + 1; });
    return c;
  }, [meta.stats, all]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return all.filter((t) => {
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.priority !== "all" && t.priority !== filters.priority) return false;
      if (filters.triage !== "all" && (t.triage || "unclassified") !== filters.triage) return false;
      if (filters.source !== "all" && ticketSourceKey(t.reporter) !== filters.source) return false;
      if (q) {
        const hay = `${t.summary} ${t.description} ${t.reporter?.name} ${t.reporter?.email} ${t.organisationId?.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, filters]);

  const statTiles = [
    { label: "Total tickets", value: <AnimatedNumber value={stats.total} />, sub: "across all tenants", icon: Inbox, color: "#6366f1" },
    { label: "Open", value: <AnimatedNumber value={stats.open} />, sub: stats.total ? `${Math.round((stats.open / stats.total) * 100)}% of all` : "none", icon: CircleDot, color: "#3b82f6" },
    { label: "Unassigned", value: <AnimatedNumber value={stats.unassigned} />, sub: "open, no owner", icon: UserRound, color: stats.unassigned > 0 ? "#f59e0b" : "#10b981" },
    { label: "Untriaged", value: <AnimatedNumber value={stats.untriaged} />, sub: "need classifying", icon: AlertCircle, color: stats.untriaged > 0 ? "#8b5cf6" : "#10b981" },
  ];

  return (
    // Sharp-corner variant: square every descendant's corners for an angular look.
    // MotionConfig honours the OS "reduce motion" preference for everything inside.
    <MotionConfig reducedMotion="user">
    <div className="[&_*]:!rounded-none">
      {/* Hero — gradient banner + attached stat strip (matches the other screens),
          with the CSAT score featured on the banner. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`${card} mb-6 overflow-hidden`}
      >
        <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          {/* Editorial corner decoration — SVG circle (so the page-wide sharp-corner
              override can't square it) + dot grid. */}
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div aria-hidden className="pointer-events-none absolute bottom-4 right-44 hidden h-10 w-24 opacity-[.20] sm:block" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.95) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
          <div className="relative z-10 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Helpdesk</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Support Tickets</h1>
            <p className="mt-1 text-sm text-white/80">Every ticket across all tenants — triage, classify and route to the board.</p>
          </div>
          {/* Featured CSAT metric */}
          {stats.ratedCount > 0 ? (
            <div className="relative z-10 flex items-center gap-2.5 bg-white/[0.12] px-4 py-2.5 text-white ring-1 ring-white/20 backdrop-blur-sm">
              <Star className="h-6 w-6 shrink-0 fill-amber-300 text-amber-300" />
              <div className="leading-tight">
                <p className="text-xl font-bold">{stats.csat.toFixed(1)}<span className="text-xs font-medium text-white/70"> / 5</span></p>
                <p className="text-[10px] uppercase tracking-wide text-white/70">CSAT · {stats.ratedCount} rated</p>
              </div>
            </div>
          ) : null}
        </div>
        {!loading && (
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

      {/* The row list is capped server-side; say so rather than letting the
          screen imply these are all the tickets there are. */}
      {meta.truncated && (
        <div className="mb-4 flex items-center gap-2 border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Showing the {all.length.toLocaleString()} most recent of {meta.total.toLocaleString()} tickets. Narrow the filters to reach older ones — the counts above cover all of them.
        </div>
      )}

      {/* Status quick-filter pills */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((s) => {
          const activePill = filters.status === s;
          return (
            <button
              key={s}
              onClick={() => setFilters((f) => ({ ...f, status: s }))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                activePill ? "bg-accent text-white shadow-sm" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-white/5 dark:ring-white/10",
              )}
            >
              {s !== "all" ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: activePill ? "#fff" : STATUS_DOT[s] }} /> : null}
              {s === "all" ? "All" : label(s)}
              <span className={cn("rounded-full px-1.5 text-[10px] font-bold", activePill ? "bg-white/25" : "bg-gray-100 text-gray-500 dark:bg-white/10")}>{statusCounts[s] || 0}</span>
            </button>
          );
        })}
      </div>

      {/* Search + secondary filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder="Search summary, reporter, tenant…" className={`${inputCls} w-full pl-9 pr-9`} />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, search: "" }))}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <SASelect
          value={filters.source}
          onChange={(v) => setFilters((p) => ({ ...p, source: v }))}
          options={TICKET_SOURCE_FILTER_OPTIONS}
        />
        {[
          { key: "priority", opts: ["all", "low", "medium", "high", "critical"] },
          { key: "triage", opts: ["all", ...TRIAGE_OPTS] },
        ].map((f) => (
          <SASelect
            key={f.key}
            value={filters[f.key]}
            onChange={(v) => setFilters((p) => ({ ...p, [f.key]: v }))}
            capitalize
            options={f.opts.map((o) => ({ value: o, label: o === "all" ? `All ${f.key}` : label(o) }))}
          />
        ))}
        <button
          type="button"
          onClick={fetchAll}
          disabled={revalidating}
          title="Refresh tickets"
          className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5"
        >
          <RefreshCw className={`h-4 w-4 ${revalidating ? "animate-spin" : ""}`} />
        </button>
      </div>

      <AnimatePresence mode="wait">
      {loading ? (
        <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <SALoader />
        </motion.div>
      ) : error ? (
        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <SAErrorState message={error} onRetry={fetchAll} />
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`${card} py-20 text-center`}
        >
          <motion.span
            className="inline-block"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.08 }}
          >
            <Inbox className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          </motion.span>
          <p className="text-gray-500">{stats.total === 0 ? "No tickets yet" : "No tickets match your filters"}</p>
          {stats.total > 0 && (
            <button
              type="button"
              onClick={() => setFilters({ triage: "all", status: "all", priority: "all", source: "all", search: "" })}
              className="mt-4 border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white/80"
            >
              Clear filters
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div key="list" className={`${card} overflow-hidden`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.3, ease: "easeOut" }}>
          <div className="hidden grid-cols-[1fr_120px_110px_130px_70px_90px] gap-3 border-b border-gray-100 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 lg:grid dark:border-white/10" style={{ backgroundColor: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.10)" }}>
            <span>Ticket</span><span>Category</span><span>Priority</span><span>Status</span><span>CSAT</span><span className="text-right">Age</span>
          </div>
          <div className="divide-y divide-gray-100">
            {filtered.map((t) => (
              <button
                key={t._id}
                onClick={() => navigate(`/tickets/${t._id}`)}
                className="group grid w-full grid-cols-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/[0.04] lg:grid-cols-[1fr_120px_110px_130px_70px_90px]"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PRIORITY_DOT[t.priority] || "#9ca3af" }} title={`${t.priority} priority`} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{t.summary}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400">
                      <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-500 dark:bg-white/10"><Building2 className="h-2.5 w-2.5" />{t.organisationId?.name || "—"}</span>
                      <SourceBadge reporter={t.reporter} />
                      {t.triage && t.triage !== "unclassified" ? <Badge className={TRIAGE[t.triage]}>{t.triage}</Badge> : null}
                      <span className="font-mono">#{t.ticketNumber}</span>
                      <span className="truncate">{t.reporter?.name || t.reporter?.email}</span>
                      {(t.commentCount ?? t.comments?.length) ? <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{t.commentCount ?? t.comments.length}</span> : null}
                    </div>
                  </div>
                </div>
                <span className="hidden text-xs text-gray-500 lg:block">{supportCategoryLabel(t.category)}</span>
                <div className="hidden lg:block"><Badge className={PRIORITY[t.priority]}>{t.priority}</Badge></div>
                <div className="hidden lg:block"><StatusPill status={t.status} /></div>
                <div className="hidden lg:block">{t.satisfactionRating ? <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-500"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{t.satisfactionRating}</span> : <span className="text-gray-300">—</span>}</div>
                <div className="hidden items-center justify-end gap-1 whitespace-nowrap text-xs text-gray-400 lg:flex">
                  {timeAgo(t.createdAt)}
                  <ChevronRight className="h-4 w-4 -translate-x-1 text-gray-300 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 lg:hidden">
                  <Badge className={PRIORITY[t.priority]}>{t.priority}</Badge>
                  <StatusPill status={t.status} />
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}

// On a Vite hot-reload the service module survives, so its ticket caches would
// keep serving stale data. Drop them on dispose → the remounted screen re-fetches
// from the API and updates state. Dev-only: stripped from production builds.
if (import.meta.hot) {
  import.meta.hot.dispose(() => superadminService.clearTicketsCache());
}
