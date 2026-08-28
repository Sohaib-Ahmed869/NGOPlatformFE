import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Receipt, ExternalLink, FileText, DollarSign, Search, CheckCircle2, AlertCircle, Calendar, RefreshCw, X } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import { useSARealtime } from "../context/SARealtimeContext";
import SASelect from "../components/SASelect";
import SATableHead from "../components/SATableHead";
import SAPagination from "../components/SAPagination";
import { DEFAULT_PAGE_SIZE } from "../utils/paging";
import { useTableSort } from "../utils/tableSort";
import SAErrorState from "../components/SAErrorState";
import SALoader from "../SALoader";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

import AnimatedNumberBase from "../components/AnimatedNumber";

// Kept this screen's original 0.8s pacing — deduplicating the
// implementation shouldn't silently restyle it.
const AnimatedNumber = (props) => <AnimatedNumberBase duration={0.8} {...props} />;
const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";

/**
 * Table columns. `key` names a column the SERVER sorts by (INVOICE_SORTS in
 * superAdminController). "Tenant" isn't one: the charity's name lives on the
 * populated Organisation, not on the invoice, so Mongo can't order by it
 * without a $lookup — it stays a plain label rather than a control that would
 * appear to work and do nothing.
 */
const INVOICE_COLUMNS = [
  { label: "Tenant" },
  { label: "Invoice", key: "invoice" },
  { label: "Period", key: "period", defaultDir: "desc" },
  { label: "Amount", key: "amount", align: "right", defaultDir: "desc" },
  { label: "Status", key: "status" },
  { label: "Date", key: "date", defaultDir: "desc" },
  { label: "" },
];

/**
 * The same columns read off a row in the browser, so a header click re-orders
 * the loaded invoices immediately instead of waiting on the server. The server
 * is still asked — it's the only one that can order the invoices that aren't
 * on this page — but that lands behind the rows you're already reading.
 */
const INVOICE_SORT_ACCESSORS = {
  invoice: (i) => i.number,
  period: (i) => i.periodStart,
  amount: (i) => i.amountDue,
  status: (i) => i.status,
  date: (i) => i.createdAt,
};
const inputCls =
  "w-full border border-gray-200 bg-white py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5";
// Brand hero gradient — the platform palette (same vars as the sidebar).
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";
const AVATAR_GRADIENT = "linear-gradient(135deg, #6366f1, #6366f1b3)";

const STATUS = {
  paid: "bg-emerald-50 text-emerald-700",
  open: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  void: "bg-gray-100 text-gray-500",
  uncollectible: "bg-red-50 text-red-700",
};
const STATUS_DOT = { paid: "#10b981", open: "#f59e0b", failed: "#ef4444", void: "#9ca3af", uncollectible: "#ef4444" };

const money = (v, ccy) => `${(ccy || "usd").toUpperCase() === "USD" ? "$" : ""}${Number(v || 0).toLocaleString()} ${(ccy || "usd").toUpperCase()}`;
// Best logo for a small tile (prefers the square mark) — empty → initial badge.
const orgLogo = (org) =>
  org?.branding?.iconLogoDark || org?.branding?.iconLogo || org?.branding?.logoDark || org?.branding?.logo || "";
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—");
const periodOf = (inv) => {
  if (!inv.periodStart && !inv.periodEnd) return "—";
  const f = (d) => (d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "—");
  return `${f(inv.periodStart)} – ${f(inv.periodEnd)}`;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "paid", label: "Paid" },
  { value: "open", label: "Open" },
  { value: "failed", label: "Failed" },
  { value: "void", label: "Void" },
];

/* Stat cell in the attached strip under the hero banner (Organisations look). */
function HeaderStat({ icon: Icon, label, value, sub, color }) {
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

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [collected, setCollected] = useState(0);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  // Sorting belongs on the server for the same reason the paging does: the
  // largest outstanding invoice is rarely on the page you happen to be on.
  const [sort, setSort] = useState({ key: "date", dir: "desc" });

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [summary, setSummary] = useState({ paidCount: 0, outstandingAmount: 0, outstandingCount: 0 });
  const [error, setError] = useState(null);
  const [revalidating, setRevalidating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // Stripe mirrors invoices by webhook, so new rows arrive without any action
  // here — this bumps when one lands.
  const { invoicesVersion } = useSARealtime();

  // Debounce the search box and snap back to page 1. Both setters run in the
  // same tick (batched → one fetch), and on mount they already match so there's
  // no duplicate initial request.
  useEffect(() => {
    const next = search.trim();
    if (next === debouncedSearch) return undefined;
    const t = setTimeout(() => {
      setDebouncedSearch(next);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);

  // Cache-first, one abortable pipeline. A page/filter/search combo already
  // seen this session renders with NO request; superseded requests are aborted
  // so a slow stale response can't overwrite a newer one.
  const lastKeyRef = useRef(null);
  const lastViewKeyRef = useRef(null);
  useEffect(() => {
    const params = { page, limit, sort: sort.key, dir: sort.dir };
    if (status !== "all") params.status = status;
    if (debouncedSearch) params.search = debouncedSearch;
    const key = JSON.stringify(params);
    // Identity of the CONTENT, without the ordering or the window into it.
    // Re-ordering or paging the same set is navigation, not a new view.
    const viewKey = JSON.stringify([status, debouncedSearch]);

    const apply = (data) => {
      const { invoices: rows = [], pagination: pg = {}, summary: sum, totalCollected } = data || {};
      setInvoices(rows);
      setCollected(totalCollected || 0);
      setPagination(pg);
      setSummary(sum || { paidCount: 0, outstandingAmount: 0, outstandingCount: 0 });
      setError(null);
      lastKeyRef.current = key;
      lastViewKeyRef.current = viewKey;
    };

    const cached = superadminService.getInvoicesCached(params);
    if (cached) {
      apply(cached);
      setLoading(false);
      return undefined;
    }

    // Sorting or paging the same set must not blank the table for the
    // full-screen loader — that's what made a header click look like a reload.
    const sameView = lastViewKeyRef.current === viewKey || lastKeyRef.current === key;
    const controller = new AbortController();
    let alive = true;
    (async () => {
      if (sameView) setRevalidating(true);
      else setLoading(true);
      try {
        const data = await superadminService.loadInvoices(params, { signal: controller.signal });
        if (!alive) return;
        // A filter change can strand us past the last page — snap back.
        if (page > 1 && page > (data?.pagination?.pages || 0)) {
          setPage(Math.max(1, data.pagination.pages || 1));
          return;
        }
        apply(data);
      } catch (err) {
        if (!alive || axios.isCancel(err)) return;
        // Don't fall through to "No invoices yet" — that reads as "this tenant
        // has never been billed" when the request simply failed.
        const msg = err?.response?.data?.error || "Couldn't load invoices.";
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
  }, [page, limit, sort, status, debouncedSearch, refreshKey, invoicesVersion]);

  // Both re-shape the result set, so the page number stops meaning anything.
  const changeSort = useCallback((next) => {
    setSort(next);
    setPage(1);
  }, []);
  const changeLimit = useCallback((next) => {
    setLimit((cur) => (cur === next ? cur : next));
    setPage(1);
  }, []);

  const hardRefresh = () => {
    superadminService.invalidateInvoicesCache();
    setRefreshKey((k) => k + 1);
  };
  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("all");
    setPage(1);
  };
  const hasFilters = Boolean(search.trim() || debouncedSearch || status !== "all");

  // The server filters and searches now, so the rows ARE the result set.
  // Re-ordered in the browser the moment a header is clicked; the server's
  // answer for the same sort lands behind it and agrees.
  const visible = useTableSort(invoices, sort, INVOICE_SORT_ACCESSORS);

  // Every tile describes the whole filtered set — paid/outstanding used to
  // count only the 30 rows on screen while sitting beside lifetime figures.
  const statTiles = useMemo(() => {
    const { paidCount, outstandingAmount, outstandingCount } = summary;
    const total = pagination.total ?? invoices.length;
    return [
      { label: "Total collected", value: <AnimatedNumber value={Number(collected)} prefix="$" />, sub: "lifetime, all invoices", icon: DollarSign, color: "#10b981" },
      { label: hasFilters ? "Invoices (filtered)" : "Invoices", value: <AnimatedNumber value={total} />, sub: hasFilters ? "matching your filters" : "all time", icon: Receipt, color: "#6366f1" },
      { label: "Paid", value: <AnimatedNumber value={paidCount} />, sub: total ? `${Math.round((paidCount / total) * 100)}% of these` : "none yet", icon: CheckCircle2, color: "#14b8a6" },
      {
        label: "Outstanding",
        value: <AnimatedNumber value={outstandingAmount} prefix="$" />,
        sub: outstandingCount ? `across ${outstandingCount} invoice${outstandingCount === 1 ? "" : "s"}` : "nothing owed",
        icon: AlertCircle,
        color: outstandingAmount > 0 ? "#f59e0b" : "#9ca3af",
      },
    ];
  }, [summary, pagination.total, invoices.length, collected, hasFilters]);

  return (
    // Sharp-corner variant: square every descendant's corners — matches the rest.
    // MotionConfig honours the OS "reduce motion" preference for everything inside.
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
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div aria-hidden className="pointer-events-none absolute bottom-4 right-12 h-10 w-24 opacity-[.20]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.95) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
          <div className="relative z-10 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Revenue</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Invoices</h1>
            <p className="mt-1 text-sm text-white/80">SaaS subscription invoices mirrored from Stripe.</p>
          </div>
          <button
            type="button"
            title="Refresh"
            aria-label="Refresh"
            onClick={hardRefresh}
            disabled={loading || revalidating}
            className="relative z-10 grid h-9 w-9 shrink-0 place-items-center bg-white/15 text-white ring-1 ring-white/25 transition-colors hover:bg-white/25 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${revalidating ? "animate-spin" : ""}`} />
          </button>
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

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant or invoice number…"
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
        <SASelect value={status} onChange={(v) => { setPage(1); setStatus(v); }} capitalize options={STATUS_OPTIONS} />
      </div>

      <AnimatePresence mode="wait">
      {loading ? (
        <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <SALoader />
        </motion.div>
      ) : error ? (
        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <SAErrorState message={error} onRetry={hardRefresh} />
        </motion.div>
      ) : visible.length === 0 ? (
        // The server searches now, so an empty result means nothing matched
        // anywhere — not just "not on this page".
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
            {hasFilters ? <Search className="mx-auto mb-3 h-10 w-10 text-gray-300" /> : <Receipt className="mx-auto mb-3 h-10 w-10 text-gray-300" />}
          </motion.span>
          <p className="text-gray-500">
            {debouncedSearch
              ? `No invoices match “${debouncedSearch}”`
              : hasFilters
                ? `No ${status} invoices`
                : "No invoices yet"}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white/80"
            >
              Clear filters
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div key="table" className={`${card} overflow-hidden`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.3, ease: "easeOut" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <SATableHead
                columns={INVOICE_COLUMNS}
                sort={sort}
                onSort={changeSort}
                rowStyle={{ backgroundColor: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.10)" }}
              />
              <tbody>
                {visible.map((inv, i) => (
                  <motion.tr
                    key={inv._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.025, 0.4), duration: 0.3, ease: "easeOut" }}
                    className="border-t border-gray-100 transition-colors hover:bg-gray-50/70 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {orgLogo(inv.organisationId) ? (
                          <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden">
                            <img src={orgLogo(inv.organisationId)} alt={inv.organisationId?.name || ""} className="h-full w-full object-contain" />
                          </span>
                        ) : (
                          <span className="grid h-8 w-8 shrink-0 place-items-center text-[11px] font-bold uppercase text-white" style={{ background: AVATAR_GRADIENT }}>
                            {(inv.organisationId?.name || "?").charAt(0)}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{inv.organisationId?.name || "—"}</span>
                          {inv.organisationId?.slug ? <span className="block truncate font-mono text-[10px] text-gray-400">{inv.organisationId.slug}</span> : null}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{inv.number || inv.stripeInvoiceId?.slice(-8)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-gray-500"><Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />{periodOf(inv)}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">{money(inv.amountPaid || inv.amountDue, inv.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold capitalize", STATUS[inv.status] || "bg-gray-100 text-gray-500")}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT[inv.status] || "#9ca3af" }} />{inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(inv.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {inv.hostedInvoiceUrl && <a href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-accent dark:bg-white/10" title="View invoice"><ExternalLink className="h-4 w-4" /></a>}
                        {inv.invoicePdf && <a href={inv.invoicePdf} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-accent dark:bg-white/10" title="Download PDF"><FileText className="h-4 w-4" /></a>}
                        {!inv.hostedInvoiceUrl && !inv.invoicePdf ? <span className="text-gray-300">—</span> : null}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Pagination — shared footer: same count, same rows control, same
          wording as the rest of the console. */}
      {!loading && (
        <SAPagination
          className="mt-6"
          page={page}
          pages={pagination.pages}
          total={pagination.total || 0}
          limit={limit}
          shown={invoices.length}
          onPage={setPage}
          onLimit={changeLimit}
        />
      )}
    </div>
    </MotionConfig>
  );
}
