import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Receipt, ExternalLink, FileText, Building2, DollarSign, Search, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SASelect from "../components/SASelect";
import SALoader from "../SALoader";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
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
const OUTSTANDING = ["open", "failed", "uncollectible"];

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
function HeaderStat({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${color}1a`, color }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none text-gray-900 dark:text-white">{value}</p>
        <p className="mt-1 text-xs text-gray-400">{label}</p>
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

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (status !== "all") params.status = status;
      const res = await superadminService.getInvoices(params);
      setInvoices(res.data.invoices || []);
      setCollected(res.data.totalCollected || 0);
      setPagination(res.data.pagination || {});
    } catch {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Client-side search across the loaded page (the API filters by status only).
  const q = search.trim().toLowerCase();
  const visible = q
    ? invoices.filter((inv) =>
        [inv.organisationId?.name, inv.organisationId?.slug, inv.number, inv.stripeInvoiceId]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      )
    : invoices;

  // Stat strip — Total collected + invoice count are server-wide; paid/outstanding
  // describe the loaded page (a 30-row window).
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const outstanding = invoices.filter((i) => OUTSTANDING.includes(i.status)).reduce((s, i) => s + (i.amountDue || 0), 0);
  const statTiles = [
    { label: "Total collected", value: `$${Number(collected).toLocaleString()}`, icon: DollarSign, color: "#10b981" },
    { label: "Invoices", value: (pagination.total ?? invoices.length).toLocaleString(), icon: Receipt, color: "#6366f1" },
    { label: "Paid", value: paidCount, icon: CheckCircle2, color: "#14b8a6" },
    { label: "Outstanding", value: `$${outstanding.toLocaleString()}`, icon: AlertCircle, color: outstanding > 0 ? "#f59e0b" : "#9ca3af" },
  ];

  return (
    // Sharp-corner variant: square every descendant's corners — matches the rest.
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
        </div>
        {!loading && (
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-white/10 sm:grid-cols-4 sm:divide-y-0">
            {statTiles.map((t) => (
              <HeaderStat key={t.label} {...t} />
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
            className={`${inputCls} rounded-xl pl-10 pr-4`}
          />
        </div>
        <SASelect value={status} onChange={(v) => { setPage(1); setStatus(v); }} capitalize options={STATUS_OPTIONS} />
      </div>

      {loading ? (
        <SALoader />
      ) : invoices.length === 0 ? (
        <div className={`${card} py-20 text-center`}>
          <Receipt className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No invoices yet</p>
        </div>
      ) : visible.length === 0 ? (
        <div className={`${card} py-20 text-center`}>
          <Search className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No invoices match “{search}” on this page</p>
        </div>
      ) : (
        <motion.div className={`${card} overflow-hidden`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left dark:border-white/10" style={{ backgroundColor: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.10)" }}>
                  {["Tenant", "Invoice", "Period", "Amount", "Status", "Date", ""].map((h, i) => (
                    <th key={h || i} className={cn("px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500", h === "Amount" && "text-right")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((inv) => (
                  <tr key={inv._id} className="border-t border-gray-100 transition-colors hover:bg-gray-50/70 dark:border-white/10 dark:hover:bg-white/5">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between px-1">
          <span className="font-mono text-xs text-gray-400">Page {pagination.page} of {pagination.pages} · {pagination.total} total</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/10"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.pages}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/10"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
