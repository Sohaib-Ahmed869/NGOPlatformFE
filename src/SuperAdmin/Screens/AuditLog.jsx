import { memo, useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  ScrollText,
  Building2,
  Search,
  List,
  AlignLeft,
  Clock,
  UserCog,
  Layers,
  Ticket,
  LifeBuoy,
  Activity,
  Info,
  Globe,
  RefreshCw,
  X,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SASelect from "../components/SASelect";
import SAErrorState from "../components/SAErrorState";
import SATableHead from "../components/SATableHead";
import SAPagination from "../components/SAPagination";
import SALoader from "../SALoader";
import { scrollToTopOf } from "../utils/scrollTo";
import { useTableSort } from "../utils/tableSort";
import { PAGE_SIZE_OPTIONS } from "../utils/paging";

import toast from "react-hot-toast";

import AnimatedNumberBase from "../components/AnimatedNumber";

// Kept this screen's original 0.8s pacing — deduplicating the
// implementation shouldn't silently restyle it.
const AnimatedNumber = (props) => <AnimatedNumberBase duration={0.8} {...props} />;
const card = "rounded-2xl border border-gray-100 bg-white shadow-sm";
const inputCls =
  "w-full border border-gray-200 bg-white py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5";

// Brand hero gradient — resolves to the platform palette (same vars as the
// sidebar), mirroring the Organisations / dashboard hero.
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";

const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");

// Compact relative time for the "When" column / timeline timestamp.
function timeAgo(d) {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

// Common action codes worth filtering on; "all" shows everything.
// How long a cached page is trusted before it's revalidated behind the rows.
// The log is append-only and other operators write to it constantly, so this is
// short by design.
const AUDIT_MAX_AGE_MS = 30_000;

// Rows per page comes from the shared list so every table in the console
// offers the same choices. The server caps at 500, so all of them are safe.

/**
 * Table columns. `key` names a column the SERVER can sort by (AUDIT_SORTS in
 * supportSessionController); the two without one are derived — Category is
 * read off the action's prefix, and Detail is composed from several fields, so
 * neither exists as something the database could order by. They render as
 * plain labels rather than as buttons that would quietly do nothing.
 */
const AUDIT_COLUMNS = [
  { label: "Action", key: "action" },
  { label: "Category" },
  { label: "Operator", key: "operator" },
  { label: "Tenant", key: "tenant" },
  { label: "Detail" },
  { label: "When", key: "when", defaultDir: "desc" },
];

/**
 * The same columns read off a row in the browser, so clicking a header
 * re-orders the loaded entries immediately. Tenant sorts by the populated
 * organisation's NAME here, which is what the operator sees; the server orders
 * by organisationId (it can't reach the name without a $lookup), so on a
 * multi-page log the two can disagree slightly for that one column.
 */
const AUDIT_SORT_ACCESSORS = {
  action: (a) => a.action,
  operator: (a) => a.actorEmail,
  tenant: (a) => a.organisationId?.name,
  when: (a) => a.createdAt,
};

const ACTION_OPTIONS = [
  { value: "all", label: "All actions" },
  { value: "support.action", label: "Support write actions" },
  { value: "support.session_started", label: "Support — started" },
  { value: "support.session_ended", label: "Support — ended" },
  { value: "support.session_revoked", label: "Support — revoked" },
  { value: "org.suspended", label: "Org suspended" },
  { value: "plan.created", label: "Plan created" },
  { value: "plan.updated", label: "Plan updated" },
];

// Map an action's prefix to a category descriptor (icon + colour + group label).
// Prefix-matched so new sub-actions inherit sensible visuals automatically.
const CATEGORIES = {
  support: { label: "Support", color: "#8b5cf6", icon: LifeBuoy },
  plan: { label: "Plans", color: "#10b981", icon: Layers },
  coupon: { label: "Billing", color: "#f59e0b", icon: Ticket },
  org: { label: "Tenant", color: "#ef4444", icon: Building2 },
  default: { label: "System", color: "#6366f1", icon: Activity },
};
const categoryOf = (action = "") => CATEGORIES[action.split(".")[0]] || CATEGORIES.default;

// Friendly labels for known codes; everything else is prettified from the code.
const ACTION_LABELS = {
  "support.action": "Support write action",
  "support.session_started": "Support session started",
  "support.session_ended": "Support session ended",
  "support.session_revoked": "Support session revoked",
  "org.suspended": "Organisation suspended",
  "plan.created": "Plan created",
  "plan.updated": "Plan updated",
};
const prettyAction = (a = "") =>
  ACTION_LABELS[a] || a.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const detailOf = (a) => a.meta?.label || a.meta?.reason || a.meta?.path || a.targetType || "—";

/* Stat cell in the attached strip under the hero banner (Organisations look). */
function HeaderStat({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${color}1a`, color }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none text-gray-900">{value}</p>
        <p className="mt-1 truncate text-xs text-gray-400">{label}</p>
        {sub ? <p className="truncate text-[10px] text-gray-300">{sub}</p> : null}
      </div>
    </div>
  );
}

/* One audit entry in the timeline. Memoised: entries are immutable server rows,
   so a row only re-renders when its own entry changes. */
const TimelineRow = memo(function TimelineRow({ a, i }) {
  const cat = categoryOf(a.action);
  const Icon = cat.icon;
  const detail = detailOf(a);
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.3), ease: [0.2, 0.7, 0.2, 1] }}
      className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-gray-50/70 dark:hover:bg-white/5"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${cat.color}1a`, color: cat.color }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{prettyAction(a.action)}</span>
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: `${cat.color}14`, color: cat.color }}>{cat.label}</span>
          <span className="font-mono text-[10px] text-gray-400">{a.action}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5"><UserCog className="h-3.5 w-3.5 shrink-0 text-gray-400" />{a.actorEmail || "system"}</span>
          <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />{a.organisationId?.name || "Platform"}</span>
          {detail !== "—" && (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-gray-600"><Info className="h-3.5 w-3.5 shrink-0 text-gray-400" /><span className="truncate">{detail}</span></span>
          )}
          {a.ip && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-gray-400"><Globe className="h-3 w-3 shrink-0" />{a.ip}</span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[11px] font-medium text-gray-500">{timeAgo(a.createdAt)}</p>
        <p className="mt-0.5 text-[10px] text-gray-400">{fmt(a.createdAt)}</p>
      </div>
    </motion.li>
  );
});

/* The same entry in table view. */
const AuditTableRow = memo(function AuditTableRow({ a }) {
  const cat = categoryOf(a.action);
  const Icon = cat.icon;
  return (
    <tr key={a._id} className="border-t border-gray-100 transition-colors hover:bg-gray-50/70 dark:hover:bg-white/5">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center" style={{ background: `${cat.color}1a`, color: cat.color }}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{prettyAction(a.action)}</p>
            <p className="font-mono text-[10px] text-gray-400">{a.action}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${cat.color}14`, color: cat.color }}>{cat.label}</span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-600 dark:text-white/70">{a.actorEmail || "system"}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500"><Building2 className="h-3 w-3 shrink-0 text-gray-400" />{a.organisationId?.name || "Platform"}</div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-600 dark:text-white/70">{detailOf(a)}</td>
      <td className="px-4 py-3 text-xs text-gray-400" title={fmt(a.createdAt)}>{timeAgo(a.createdAt)}</td>
    </tr>
  );
});

export default function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("timeline"); // "timeline" | "table"
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  // Sorting is a SERVER concern here: this list is paged, so reordering the 50
  // rows on screen would reorder a page, not the log. The key is a column name
  // the server maps to a field — see AUDIT_SORTS in supportSessionController.
  const [sort, setSort] = useState({ key: "when", dir: "desc" });

  const [error, setError] = useState(null);
  const [revalidating, setRevalidating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [summary, setSummary] = useState({ operators: 0, tenants: 0, latestAt: null });

  // Debounce the box into a server param and snap back to page 1 (both setters
  // batch into one render, so no duplicate request).
  useEffect(() => {
    const next = search.trim();
    if (next === debouncedSearch) return undefined;
    const t = setTimeout(() => {
      setDebouncedSearch(next);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);

  const lastKeyRef = useRef(null);
  const lastViewKeyRef = useRef(null);

  const apply = useCallback((data, key, view) => {
    setEntries(data.entries || []);
    setTotal(data.total || 0);
    setSummary(data.summary || { operators: 0, tenants: 0, latestAt: null });
    setError(null);
    lastKeyRef.current = key;
    // Recording the VIEW too is what lets the next sort or page turn refresh
    // in place. Declaring this ref and never assigning it left it permanently
    // null, so the same-view check could never pass and the table kept
    // blanking for the full-screen loader on every header click.
    lastViewKeyRef.current = view;
  }, []);

  // Cache-first + abortable, matching the other list screens. A page/filter
  // combo already viewed this session renders with NO request; any audited
  // action clears the cache in the service, so the log can't go stale.
  const buildParams = useCallback(() => {
    const params = { page, limit, sort: sort.key, dir: sort.dir };
    if (action !== "all") params.action = action;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [page, limit, sort, action, debouncedSearch]);

  // A new sort re-orders the whole result set, so page 4 of the old order is
  // meaningless in the new one. Both setters batch into one render → one fetch.
  const changeSort = useCallback((next) => {
    setSort(next);
    setPage(1);
  }, []);

  // Identity of the CONTENT — the filters — without the ordering or the page.
  // Sorting or paging the same filtered log is navigation within one view.
  const viewKey = useMemo(() => JSON.stringify([action, debouncedSearch]), [action, debouncedSearch]);

  useEffect(() => {
    const params = buildParams();
    const key = JSON.stringify(params);

    // Cache hit → render it now. But a hit only means WE haven't written to the
    // log since; another operator's actions land in it unannounced, and an
    // audit view that quietly omits them is the one thing this screen can't do.
    // So a stale-but-shown page revalidates behind the rows it's already
    // displaying (the `revalidating` spinner, not the full loader).
    const cached = superadminService.getAuditLogCached(params);
    const fresh = superadminService.getAuditLogAge(params) < AUDIT_MAX_AGE_MS;
    if (cached) {
      apply(cached, key, viewKey);
      setLoading(false);
      if (fresh) return undefined;
    }

    // Sorting or paging the same filtered log is navigation, not a different
    // view: it must never blank the table for the full-screen loader.
    const sameView = cached || lastViewKeyRef.current === viewKey || lastKeyRef.current === key;
    const controller = new AbortController();
    let alive = true;
    (async () => {
      if (sameView) setRevalidating(true);
      else setLoading(true);
      try {
        const data = await superadminService.loadAuditLog(params, { signal: controller.signal });
        if (!alive) return;
        apply(data, key, viewKey);
      } catch (err) {
        if (!alive || axios.isCancel(err)) return;
        // An audit log that silently shows "No audit entries" on failure is
        // actively dangerous — it reads as "nobody did anything".
        const msg = err?.response?.data?.error || "Couldn't load the audit log.";
        if (sameView) toast.error(msg);
        else setError(msg);
      } finally {
        if (alive) {
          setLoading(false);
          setRevalidating(false);
        }
      }
    })();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [buildParams, apply, refreshKey, viewKey]);

  // Warm the next page when the pointer lands on "Next" (or it's tabbed to).
  // Prefetching on load would add a request to every visit; nearly all of them
  // never leave page 1. On intent it costs nothing until you're about to page.
  const prefetchPage = useCallback(
    (target) => {
      if (target < 1) return;
      const params = { ...buildParams(), page: target };
      if (superadminService.getAuditLogCached(params)) return;
      superadminService.loadAuditLog(params).catch(() => {});
    },
    [buildParams],
  );

  // Manual refresh bypasses the cache for the current view.
  const fetchEntries = useCallback(() => {
    superadminService.invalidateAuditCache();
    lastKeyRef.current = JSON.stringify(buildParams()); // treat as same-view → silent
    setRefreshKey((k) => k + 1);
  }, [buildParams]);

  const pages = Math.ceil(total / limit) || 1;
  // Paging from the bottom of a long page otherwise drops you at the bottom of
  // the next one, reading its last rows first.
  const resultsTopRef = useRef(null);
  const lastPageRef = useRef(page);
  useEffect(() => {
    if (lastPageRef.current === page) return;
    lastPageRef.current = page;
    scrollToTopOf(resultsTopRef.current);
  }, [page]);

  // A background revalidate can shrink the set under you (entries aged out of a
  // filter, a narrower window): don't leave the operator on a page that no
  // longer exists.
  useEffect(() => {
    if (!loading && page > pages) setPage(pages);
  }, [loading, page, pages]);
  const hasFilters = Boolean(search.trim() || debouncedSearch || action !== "all");
  // Changing the page size returns to page 1: a smaller page can strand you
  // past the end, and the rows you were looking at have moved regardless.
  const changeLimit = (next) => {
    if (next === limit) return;
    setLimit(next);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setAction("all");
    setPage(1);
  };

  // The server searches now, so the rows ARE the result set.
  // Re-ordered in the browser the instant a header is clicked, so the table
  // responds without waiting on the server. The request still goes out — only
  // the server can order entries that aren't on this page — and lands behind
  // the rows already on screen rather than replacing them with a loader.
  const visible = useTableSort(entries, sort, AUDIT_SORT_ACCESSORS);

  // Every figure describes the whole filtered set — Operators and Tenants used
  // to be counted from the 50 rows on screen, beside a server-wide total.
  const statTiles = useMemo(() => [
    { label: hasFilters ? "Events (filtered)" : "Total events", value: <AnimatedNumber value={total} />, sub: hasFilters ? "matching your filters" : "all time", icon: ScrollText, color: "#6366f1" },
    { label: "Operators", value: <AnimatedNumber value={summary.operators} />, sub: "distinct actors", icon: UserCog, color: "#10b981" },
    { label: "Tenants touched", value: <AnimatedNumber value={summary.tenants} />, sub: "distinct organisations", icon: Building2, color: "#f59e0b" },
    { label: "Latest event", value: timeAgo(summary.latestAt || entries[0]?.createdAt), sub: "most recent action", icon: Clock, color: "#06b6d4" },
  ], [hasFilters, total, summary, entries]);

  return (
    // Sharp-corner variant of this screen: square every descendant's corners
    // (cards, pills, buttons, inputs, icon chips) for an angular look — matches
    // the Organisations / Platform / Settings screens.
    <MotionConfig reducedMotion="user">
    <div className="[&_*]:!rounded-none">
      {/* Hero — gradient banner + attached stat strip (mirrors Organisations) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`${card} mb-6 overflow-hidden`}
      >
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          {/* Editorial corner decoration — SVG circle (so the page-wide sharp-corner
              override can't square it) + dot grid. */}
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div aria-hidden className="pointer-events-none absolute bottom-4 right-12 h-10 w-24 opacity-[.20]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.95) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
          <div className="relative z-10 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Security</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Audit log</h1>
            <p className="mt-1 text-sm text-white/80">Every platform-operator action, append-only.</p>
          </div>
        </div>
        {!loading && (
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0">
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
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, operator, tenant or target…"
            className={`${inputCls} rounded-xl pl-10 pr-9`}
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
        <button
          type="button"
          title="Refresh"
          aria-label="Refresh"
          onClick={fetchEntries}
          disabled={loading || revalidating}
          className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${revalidating ? "animate-spin" : ""}`} />
        </button>
        <SASelect value={action} onChange={(v) => { setPage(1); setAction(v); }} options={ACTION_OPTIONS} />
        {/* View toggle — timeline / table */}
        <div className="flex shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {[["timeline", AlignLeft], ["table", List]].map(([v, Icon]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-label={`${v} view`}
              className={`grid h-10 w-10 place-items-center transition-colors ${view === v ? "bg-accent text-white" : "text-gray-500 hover:bg-gray-50"}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div ref={resultsTopRef} aria-hidden />
      {loading ? (
        <SALoader />
      ) : error ? (
        <SAErrorState message={error} onRetry={fetchEntries} />
      ) : entries.length === 0 ? (
        <div className={`${card} py-20 text-center`}>
          <ScrollText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No audit entries</p>
        </div>
      ) : visible.length === 0 ? (
        // The server searches now — an empty result means nothing matched
        // anywhere, not just "not on this page".
        <div className={`${card} py-20 text-center`}>
          <Search className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">
            {debouncedSearch ? `No entries match “${debouncedSearch}”` : `No ${action === "all" ? "" : `${action} `}entries`}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {view === "timeline" ? (
            <motion.div
              key="timeline"
              className={`${card} overflow-hidden`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <ul className="divide-y divide-gray-100 dark:divide-white/10">
                {visible.map((a, i) => (
                  <TimelineRow key={a._id} a={a} i={i} />
                ))}
              </ul>
            </motion.div>
          ) : (
            <motion.div
              key="table"
              className={`${card} overflow-hidden`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <SATableHead
                    columns={AUDIT_COLUMNS}
                    sort={sort}
                    onSort={changeSort}
                    rowStyle={{ backgroundColor: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.14)" }}
                  />
                  <tbody>
                    {visible.map((a) => (
                      <AuditTableRow key={a._id} a={a} />
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Pagination — the count and the page size show whether or not there is
          more than one page; "40 of 40" is the answer to "is that all of them?" */}
      {!loading && !error && (
        <SAPagination
          className="mt-6"
          page={page}
          pages={pages}
          total={total}
          limit={limit}
          shown={entries.length}
          onPage={setPage}
          onLimit={changeLimit}
          onPrefetch={prefetchPage}
          sizes={PAGE_SIZE_OPTIONS}
        />
      )}
    </div>
    </MotionConfig>
  );
}
