import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Search,
  X,
  RefreshCw,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ChevronLeft,
  ChevronRight,
  Server,
  Building2,
  Hand,
  Paperclip,
} from "lucide-react";
import TabLoader from "../TabLoader";
import SASelect from "../../SuperAdmin/components/SASelect";
import SAErrorState from "../../SuperAdmin/components/SAErrorState";
import { scrollToTopOf } from "../../SuperAdmin/utils/scrollTo";
import { cn } from "../../utils/cn";

/**
 * The send log: what actually went out, and what didn't.
 *
 * Before this existed, a failed transactional email left nothing behind but a
 * console.log on whichever instance handled the request — so "the donor says
 * they never got their receipt" was unanswerable. The three statuses answer
 * three different questions:
 *   sent    — we handed it to SMTP (delivery itself is the provider's business)
 *   failed  — the provider rejected it; `error` is their words, verbatim
 *   skipped — we never tried: the email is switched off, or had no recipient
 *
 * Shared by the platform console and a tenant's portal via `service`; the
 * backend scopes the rows, so a tenant only ever sees its own.
 */

const card =
  "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";

const STATUS_META = {
  sent: { icon: CheckCircle2, color: "#10b981", label: "Sent" },
  failed: { icon: XCircle, color: "#ef4444", label: "Failed" },
  skipped: { icon: MinusCircle, color: "#94a3b8", label: "Skipped" },
};

const DAYS_OPTIONS = [
  [7, "Last 7 days"],
  [30, "Last 30 days"],
  [90, "Last 90 days"],
];

// Server-paged, so this is a real request size, not a slice of something we
// already hold. Matches the rest of the console's list screens.
const PAGE_SIZES = [25, 50, 100];
const PAGE_SIZE_OPTIONS = PAGE_SIZES.map((n) => ({ value: n, label: String(n) }));
const DEFAULT_LIMIT = 25;

const timeAgo = (d) => {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
};

export default function EmailLogsPanel({ service, templates = [], showTenant = false }) {
  /**
   * Every filter and the page number live in ONE piece of state on purpose.
   *
   * They used to be six `useState`s with an effect that reset the page whenever
   * a filter changed — so changing a filter fired the query twice: once with
   * the stale page, then again after the reset landed. Committing the filter
   * and the page together makes it one render and one request. Search is the
   * exception: its input is held separately and debounced into this object, so
   * typing doesn't queue a request per keystroke.
   */
  const [query, setQuery] = useState({
    status: "all",
    templateKey: "all",
    // "all" | "manual" — after a support call the question is almost never
    // "what did the system send", it's "who did we email by hand, and when".
    origin: "all",
    days: 30,
    search: "",
    page: 1,
    limit: DEFAULT_LIMIT,
  });
  const [searchInput, setSearchInput] = useState("");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [expanded, setExpanded] = useState(null);

  // A filter change always returns you to page one — same commit, one fetch.
  const update = useCallback((patch) => setQuery((qy) => ({ ...qy, ...patch, page: 1 })), []);
  const goToPage = useCallback((page) => setQuery((qy) => ({ ...qy, page })), []);
  // Stable, so opening one row doesn't hand every other row a new prop.
  const toggleExpanded = useCallback((id) => setExpanded((cur) => (cur === id ? null : id)), []);

  useEffect(() => {
    if (searchInput === query.search) return undefined;
    const t = setTimeout(() => update({ search: searchInput }), 350);
    return () => clearTimeout(t);
  }, [searchInput, query.search, update]);

  // Only the latest response may win; stale ones are dropped by sequence
  // number AND cancelled on the wire, so a fast run through the filters doesn't
  // leave four superseded queries running against the log collection.
  const seq = useRef(0);
  const abortRef = useRef(null);

  /**
   * The date window is derived from `days`, and it has to be quantised.
   * `Date.now()` moves every millisecond, so an ISO instant would make every
   * request a unique cache key — the log cache would never hit, and paging back
   * a page would always be a fresh query. Rounded to the minute, "the last 30
   * days" is the same question for a minute at a time, which is the resolution
   * anyone actually asks it at.
   */
  const since = useMemo(() => {
    const minute = 60 * 1000;
    const now = Math.floor(Date.now() / minute) * minute;
    return new Date(now - query.days * 86400 * 1000).toISOString();
  }, [query.days]);

  const params = useMemo(
    () => ({
      page: query.page,
      limit: query.limit,
      since,
      ...(query.status !== "all" ? { status: query.status } : {}),
      ...(query.templateKey !== "all" ? { templateKey: query.templateKey } : {}),
      ...(query.origin === "manual" ? { manual: 1 } : {}),
      ...(query.search.trim() ? { search: query.search.trim() } : {}),
    }),
    [query.page, query.limit, query.status, query.templateKey, query.origin, query.search, since],
  );

  const fetchLogs = useCallback(
    ({ force = false } = {}) => {
      const mine = ++seq.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError("");
      service
        .logs(params, { force, signal: controller.signal })
        .then((res) => {
          if (mine !== seq.current) return;
          setRows(res.logs || []);
          setTotal(res.total || 0);
          setPages(res.pages || 1);
        })
        .catch((err) => {
          if (mine !== seq.current || axios.isCancel(err)) return;
          setRows([]);
          setError(err?.response?.data?.error || "Couldn't load the send log");
        })
        .finally(() => {
          if (mine === seq.current) setLoading(false);
        });
    },
    [service, params],
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // The nonce only re-runs the effect; `refreshAll` has already dropped the
  // cached copy, so the re-run misses and goes to the network on its own.
  const [statsNonce, setStatsNonce] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    service
      .logStats({ days: query.days }, { signal: controller.signal })
      .then((res) => alive && setStats(res))
      .catch((err) => {
        if (alive && !axios.isCancel(err)) setStats(null);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [service, query.days, statsNonce]);

  /** Refresh means "go and look again" — every cached page, not just this one. */
  const refreshAll = useCallback(() => {
    service.invalidateLogs?.();
    setStatsNonce((n) => n + 1);
    fetchLogs({ force: true });
  }, [service, fetchLogs]);

  // Paging from the bottom of a page otherwise drops you at the bottom of the
  // next one, reading its last rows first.
  const resultsTopRef = useRef(null);
  const lastPageRef = useRef(query.page);
  useEffect(() => {
    if (lastPageRef.current === query.page) return;
    lastPageRef.current = query.page;
    scrollToTopOf(resultsTopRef.current);
  }, [query.page]);

  const templateOptions = useMemo(
    () => [["all", "All emails"], ...templates.map((t) => [t.key, t.label])],
    [templates],
  );

  const { status, templateKey, origin, days, page, limit } = query;
  const filtering =
    status !== "all" || templateKey !== "all" || origin !== "all" || !!query.search.trim();

  return (
    <div className="space-y-4">
      {/* headline counters */}
      {stats && (
        <div className={cn(card, "grid grid-cols-2 divide-x divide-gray-100 sm:grid-cols-4 dark:divide-white/10")}>
          <Counter label={`Sent · ${days}d`} value={stats.sent} color="#10b981" />
          <Counter label="Failed" value={stats.failed} color={stats.failed ? "#ef4444" : "#94a3b8"} />
          <Counter label="Skipped" value={stats.skipped} color="#94a3b8" />
          <Counter
            label="Delivered to SMTP"
            value={`${stats.successRate}%`}
            color={stats.successRate >= 98 ? "#10b981" : stats.successRate >= 90 ? "#f59e0b" : "#ef4444"}
          />
        </div>
      )}

      {stats?.worstTemplates?.length > 0 && (
        <div className={cn(card, "p-4")}>
          <h4 className="mb-2 text-xs font-semibold text-gray-700 dark:text-white/80">
            Where failures are concentrated
          </h4>
          <div className="space-y-1.5">
            {stats.worstTemplates.map((w) => (
              <div key={w.key || "adhoc"} className="flex items-start gap-2 text-[11px]">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                <div className="min-w-0">
                  <span className="font-medium text-gray-700 dark:text-white/80">{w.label}</span>
                  <span className="ml-1.5 text-red-500">{w.failed} failed</span>
                  {w.lastError && (
                    <p className="mt-0.5 truncate font-mono text-[10px] text-gray-400">{w.lastError}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Recipient or subject…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-8 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/85"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <SASelect
          value={status}
          onChange={(v) => update({ status: v })}
          options={[["all", "All statuses"], ["sent", "Sent"], ["failed", "Failed"], ["skipped", "Skipped"]]}
        />
        <SASelect value={templateKey} onChange={(v) => update({ templateKey: v })} options={templateOptions} />
        <SASelect
          value={origin}
          onChange={(v) => update({ origin: v })}
          options={[["all", "Any origin"], ["manual", "Sent by hand"]]}
        />
        <SASelect value={days} onChange={(v) => update({ days: Number(v) })} options={DAYS_OPTIONS} />
        <button
          onClick={refreshAll}
          title="Refresh"
          className="grid h-[38px] w-[38px] place-items-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-accent hover:text-accent dark:border-white/10"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* rows — refetching dims the current page rather than replacing it with a
          spinner, so paging and filtering don't flash an empty panel. */}
      <div ref={resultsTopRef} className={cn(card, "overflow-hidden")}>
        {loading && rows.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <TabLoader label="Loading send log" />
          </div>
        ) : error ? (
          <SAErrorState message={error} onRetry={refreshAll} className="!border-0 !shadow-none" />
        ) : rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500 dark:text-white/60">Nothing logged for these filters.</p>
            <p className="mt-1 text-xs text-gray-400">
              {filtering
                ? "Try widening the date range or clearing a filter."
                : "Only emails sent since this feature went live appear here."}
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "divide-y divide-gray-100 transition-opacity dark:divide-white/10",
              loading && "opacity-50",
            )}
          >
            {rows.map((r) => (
              <LogRow
                key={r._id}
                r={r}
                open={expanded === r._id}
                showTenant={showTenant}
                onToggle={toggleExpanded}
              />
            ))}
          </div>
        )}

        {/* The count shows whether or not there's more than one page — "25 of
            25" is the answer to "is that everything?" */}
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-2.5 dark:border-white/10">
            <span className="font-mono text-[11px] text-gray-400">
              {(page - 1) * limit + 1}–{(page - 1) * limit + rows.length} of {total.toLocaleString()}
              {pages > 1 ? ` · page ${page} of ${pages}` : ""}
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="hidden sm:inline">Rows</span>
                <SASelect
                  value={limit}
                  onChange={(v) => update({ limit: Number(v) })}
                  options={PAGE_SIZE_OPTIONS}
                  align="right"
                  className="!min-w-0 w-[68px] !px-2 !py-1 !text-xs"
                />
              </span>
              {pages > 1 && (
                <div className="flex gap-1">
                  <PageBtn disabled={page <= 1 || loading} onClick={() => goToPage(page - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </PageBtn>
                  <PageBtn disabled={page >= pages || loading} onClick={() => goToPage(page + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </PageBtn>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * One log entry.
 *
 * Memoised because everything above it re-renders this list for reasons that
 * have nothing to do with a row: a keystroke in the search box (held locally
 * and debounced, so it renders without fetching), and expanding any single row.
 * Expanding one of 100 entries used to re-render all 100 — including whichever
 * one was already open, with its full detail grid.
 */
const LogRow = memo(function LogRow({ r, open, showTenant, onToggle }) {
  const meta = STATUS_META[r.status] || STATUS_META.skipped;
  return (
    <div>
      <button
        onClick={() => onToggle(r._id)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"
      >
        <meta.icon className="h-4 w-4 shrink-0" style={{ color: meta.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="truncate text-sm text-gray-800 dark:text-white/85">
              {r.to || "—"}
            </span>
            {r.templateLabel && (
              <span className="rounded bg-gray-100 px-1.5 py-px text-[10px] text-gray-500 dark:bg-white/10 dark:text-white/45">
                {r.templateLabel}
              </span>
            )}
            {r.meta?.manual && (
              <span
                title={r.meta.by ? `Sent by hand by ${r.meta.by}` : "Sent by hand from the console"}
                className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-px text-[10px] text-gray-500 dark:bg-white/10 dark:text-white/45"
              >
                <Hand className="h-2.5 w-2.5" />
                By hand
              </span>
            )}
            {r.attachments > 0 && (
              <span title={`${r.attachments} attachment${r.attachments === 1 ? "" : "s"}`}>
                <Paperclip className="h-3 w-3 text-gray-400" />
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-gray-400">
            {r.subject || (r.reason ? `Skipped: ${r.reason.replace(/_/g, " ")}` : "—")}
          </p>
        </div>
        {showTenant && r.organisationId?.name && (
          <span className="hidden shrink-0 items-center gap-1 text-[11px] text-gray-400 sm:inline-flex">
            <Building2 className="h-3 w-3" />
            {r.organisationId.name}
          </span>
        )}
        <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(r.createdAt)}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-white/10 dark:bg-white/[0.02]">
          <dl className="grid gap-x-6 gap-y-1.5 text-[11px] sm:grid-cols-2">
            <Detail label="Status" value={meta.label} />
            <Detail label="Sent at" value={new Date(r.createdAt).toLocaleString()} />
            <Detail label="Template" value={r.templateKey || "ad-hoc"} mono />
            <Detail
              label="SMTP account"
              value={r.transport === "tenant" ? "The charity's own" : "Platform"}
              icon={Server}
            />
            <Detail label="Content from" value={r.source || "—"} />
            {r.durationMs > 0 && <Detail label="Took" value={`${r.durationMs} ms`} />}
            {r.attachments > 0 && (
              <Detail
                label="Attachments"
                // Names only: the files were attached and discarded, never stored,
                // so there is nothing here to link to.
                value={
                  Array.isArray(r.meta?.files) && r.meta.files.length
                    ? r.meta.files.map((f) => f.name).join(", ")
                    : r.attachments
                }
              />
            )}
            {r.meta?.manual && (
              <Detail label="Sent by" value={r.meta.by || "an operator"} icon={Hand} />
            )}
            {r.messageId && <Detail label="Message ID" value={r.messageId} mono />}
          </dl>
          {r.error && (
            <div className="mt-2 rounded-lg bg-red-50 p-2.5 dark:bg-red-500/10">
              <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-red-400">
                Provider error
              </p>
              <p className="mt-1 break-words font-mono text-[11px] text-red-700 dark:text-red-300">
                {r.error}
              </p>
            </div>
          )}
          {r.meta && Object.keys(r.meta).length > 0 && (
            <p className="mt-2 break-words font-mono text-[10px] text-gray-400">
              {Object.entries(r.meta)
                .map(([k, v]) => `${k}=${v}`)
                .join("  ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

function Counter({ label, value, color }) {
  return (
    <div className="px-5 py-4">
      <p className="text-lg font-bold leading-none" style={{ color }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-gray-400">{label}</p>
    </div>
  );
}

function Detail({ label, value, mono, icon: Icon }) {
  return (
    <div className="flex gap-1.5">
      <dt className="shrink-0 text-gray-400">{label}:</dt>
      <dd
        className={cn(
          "inline-flex min-w-0 items-center gap-1 break-all text-gray-700 dark:text-white/75",
          mono && "font-mono",
        )}
      >
        {Icon && <Icon className="h-3 w-3 shrink-0 text-gray-400" />}
        {value}
      </dd>
    </div>
  );
}

function PageBtn({ children, disabled, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-md border transition-colors",
        disabled
          ? "cursor-not-allowed border-gray-100 text-gray-200 dark:border-white/5 dark:text-white/15"
          : "border-gray-200 text-gray-500 hover:border-accent hover:text-accent dark:border-white/10",
      )}
    >
      {children}
    </button>
  );
}
