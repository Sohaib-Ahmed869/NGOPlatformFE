import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  DollarSign,
  CheckCircle,
  Clock,
  RotateCcw,
  Megaphone,
  Mail,
  Hash,
  MessageSquare,
  Wallet,
  Receipt,
  ExternalLink,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  CreditCard,
  Eye,
  TrendingUp,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { TabLoader } from "../../components/TabLoader";
import { CustomSelect } from "../../components/CustomSelect";
import PageHeader from "../components/PageHeader";
import GoFundMeService from "../../services/goFundMeService";
import { cn } from "../../utils/cn";

const ITEMS_PER_PAGE = 10;

const DEFAULT_STATS = { completedCount: 0, pendingCount: 0, refundedCount: 0, totalCollected: 0, currency: "AUD" };
const DEFAULT_PAGINATION = { total: 0, pages: 0, currentPage: 1 };

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const formatMoney = (amount, currency = "AUD") => {
  try {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(amount || 0);
  } catch {
    return `$${Number(amount || 0).toFixed(2)} ${currency}`;
  }
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" }) : "—";

const statusStyle = (s) => {
  const m = {
    completed: "bg-green-50 text-green-700",
    pending: "bg-yellow-50 text-yellow-700",
    failed: "bg-red-50 text-red-700",
    refunded: "bg-blue-50 text-blue-700",
  };
  return m[s] || "bg-gray-100 text-gray-600";
};

const fadeWrap = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

/* ── Sharp stat tile (matches Donors / Contacts) ──────────────────────── */
function StatCard({ icon: Icon, label, value, tone = "accent" }) {
  const tones = {
    accent: "bg-accent/10 text-accent",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="flex items-center gap-3 border border-gray-100 bg-white p-3.5 shadow-sm">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center", tones[tone])}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none text-primary" title={String(value)}>
          {value}
        </p>
        <p className="mt-1 text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}

function MethodChip({ method }) {
  const m = (method || "").toLowerCase();
  const isPaypal = m === "paypal";
  return (
    <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-gray-600">
      {isPaypal ? <Wallet className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
      {method || "—"}
    </span>
  );
}

function StatusPill({ status }) {
  return (
    <span className={cn("inline-flex px-2 py-0.5 text-[10px] font-semibold capitalize", statusStyle(status))}>
      {status}
    </span>
  );
}

export default function CampaignPayments() {
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ ...DEFAULT_PAGINATION });
  const [stats, setStats] = useState({ ...DEFAULT_STATS });

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [campaignOptions, setCampaignOptions] = useState([{ value: "all", label: "All campaigns" }]);

  const [detail, setDetail] = useState(null);

  // Campaigns for the filter dropdown.
  useEffect(() => {
    GoFundMeService.getAdminRequests({ status: "all", limit: 200 })
      .then((res) => {
        const opts = (res?.goFundMes || []).map((c) => ({ value: c._id, label: c.title }));
        setCampaignOptions([{ value: "all", label: "All campaigns" }, ...opts]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const res = await GoFundMeService.getAdminPayments({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: searchTerm,
          paymentStatus: selectedStatus,
          campaignId: selectedCampaign,
        });
        if (!active) return;
        setPayments(res?.data?.payments || []);
        setPagination(res?.data?.pagination || DEFAULT_PAGINATION);
        setStats(res?.data?.stats || DEFAULT_STATS);
      } catch {
        if (active) toast.error("Failed to load campaign payments");
      } finally {
        if (active) {
          setLoading(false);
          setInitialLoad(false);
        }
      }
    };
    fetchPayments();
    return () => {
      active = false;
    };
  }, [currentPage, searchTerm, selectedStatus, selectedCampaign]);

  const onFilter = (setter) => (value) => {
    setCurrentPage(1);
    setter(value);
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const res = await GoFundMeService.getAdminPayments({
        page: 1,
        limit: 5000,
        search: searchTerm,
        paymentStatus: selectedStatus,
        campaignId: selectedCampaign,
      });
      const rows = res?.data?.payments || [];
      if (!rows.length) {
        toast.error("No payments to export");
        return;
      }
      const esc = (f) => {
        if (f === null || f === undefined) return "";
        const s = String(f);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const headers = ["Donor", "Email", "Anonymous", "Campaign", "Amount", "Fee", "Net", "Method", "Status", "Reference", "Receipt URL", "Date"].join(",");
      const lines = rows.map((p) =>
        [
          esc(p.donorName),
          esc(p.donorEmail),
          p.isAnonymous ? "Yes" : "No",
          esc(p.campaign?.title || ""),
          p.amount ?? 0,
          p.transactionFee ?? 0,
          p.netAmount ?? 0,
          esc(p.paymentMethod),
          esc(p.paymentStatus),
          esc(p.stripePaymentIntentId),
          esc(p.stripeReceiptUrl),
          esc(new Date(p.createdAt).toLocaleString()),
        ].join(","),
      );
      const csv = [headers, ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `campaign_payments_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch {
      toast.error("Failed to export payments");
    } finally {
      setExportLoading(false);
    }
  };

  if (loading && initialLoad) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <TabLoader />
      </div>
    );
  }

  // Detail "page" — takes over the screen (no modal). Back returns to the list
  // with all filters/page state preserved (the list is just not rendered while
  // a detail is open).
  if (detail) {
    return <PaymentDetail payment={detail} onBack={() => setDetail(null)} />;
  }

  const filtersActive = !!searchTerm || selectedStatus !== "all" || selectedCampaign !== "all";

  return (
    <div className="lg:p-6 mt-20 lg:mt-0">
      <PageHeader
        eyebrow="Fundraising"
        title="Campaign Payments"
        subtitle={`${pagination.total || 0} donation${pagination.total === 1 ? "" : "s"} across your community fundraisers`}
        actions={
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </button>
        }
      />

      <div className="space-y-5">
        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={DollarSign} label="Total collected" value={formatMoney(stats.totalCollected, stats.currency)} tone="green" />
          <StatCard icon={CheckCircle} label="Completed" value={stats.completedCount} tone="accent" />
          <StatCard icon={Clock} label="Pending" value={stats.pendingCount} tone="amber" />
          <StatCard icon={RotateCcw} label="Refunded" value={stats.refundedCount} tone="blue" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => {
                setCurrentPage(1);
                setSearchTerm(e.target.value);
              }}
              placeholder="Search by donor or email…"
              className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white"
            />
          </div>
          <CustomSelect
            value={selectedCampaign}
            onChange={onFilter(setSelectedCampaign)}
            options={campaignOptions}
            searchable={campaignOptions.length > 8}
            triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            className="sm:min-w-[180px]"
          />
          <CustomSelect
            value={selectedStatus}
            onChange={onFilter(setSelectedStatus)}
            options={STATUS_OPTIONS}
            triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            className="sm:min-w-[150px]"
          />
        </div>

        {/* Table */}
        <div className="relative">
          {loading && !initialLoad && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
              <div className="flex items-center gap-2 text-sm font-medium text-accent">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {payments.length === 0 && !loading ? (
              <motion.div
                key="empty"
                variants={fadeWrap}
                initial="hidden"
                animate="show"
                exit="exit"
                className="border border-gray-100 bg-white p-12 text-center shadow-sm"
              >
                <Megaphone className="mx-auto mb-3 h-10 w-10 text-text-muted" />
                <p className="font-medium text-primary">No payments found</p>
                <p className="mt-1 text-sm text-text-muted">
                  {filtersActive ? "Try adjusting your filters." : "No campaign donations have been made yet."}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={`table-${currentPage}-${selectedStatus}-${selectedCampaign}`}
                variants={fadeWrap}
                initial="hidden"
                animate="show"
                exit="exit"
                className="overflow-hidden border border-gray-100 bg-white shadow-sm"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-accent/5 border-b border-accent/10 text-left text-[11px] font-semibold uppercase tracking-wider text-accent">
                        <th className="px-4 py-3">Donor</th>
                        <th className="px-4 py-3">Campaign</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => {
                        const initial = (p.donorName || "?").trim().charAt(0).toUpperCase();
                        const net = p.netAmount != null ? p.netAmount : p.amount;
                        return (
                          <tr
                            key={p._id}
                            onClick={() => setDetail(p)}
                            className="cursor-pointer border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/60"
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-3">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                                  {initial}
                                </span>
                                <div className="min-w-0">
                                  <p className="flex items-center gap-1.5 truncate font-medium text-primary">
                                    {p.donorName}
                                    {p.isAnonymous && (
                                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                                        anon
                                      </span>
                                    )}
                                  </p>
                                  <p className="truncate text-xs text-text-muted">{p.donorEmail}</p>
                                </div>
                              </div>
                            </td>
                            <td className="max-w-[200px] px-4 py-2.5">
                              <p className="truncate text-primary">{p.campaign?.title || "—"}</p>
                            </td>
                            <td className="px-4 py-2.5">
                              <p className="font-semibold text-primary">{formatMoney(p.amount)}</p>
                              <p className="text-[11px] text-text-muted">net {formatMoney(net)}</p>
                            </td>
                            <td className="px-4 py-2.5">
                              <MethodChip method={p.paymentMethod} />
                            </td>
                            <td className="px-4 py-2.5">
                              <StatusPill status={p.paymentStatus} />
                            </td>
                            <td className="px-4 py-2.5 text-text-muted">{formatDate(p.createdAt)}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                {p.stripeReceiptUrl && (
                                  <a
                                    href={p.stripeReceiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="View Stripe receipt"
                                    className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent"
                                  >
                                    <Receipt className="h-4 w-4" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setDetail(p)}
                                  title="View details"
                                  className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </div>
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
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <span className="text-xs text-text-muted">
              Showing {pagination.total ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–
              {Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                let pg;
                if (pagination.pages <= 5) pg = i + 1;
                else if (currentPage <= 3) pg = i + 1;
                else if (currentPage >= pagination.pages - 2) pg = pagination.pages - (4 - i);
                else pg = currentPage - 2 + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={cn(
                      "grid h-8 w-8 place-items-center text-xs font-medium transition-colors",
                      currentPage === pg ? "bg-accent text-white" : "text-text-muted hover:bg-gray-100",
                    )}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === pagination.pages}
                className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Full-screen donation detail "page" (replaces the old modal) ────────── */
const STATUS_DOT = {
  completed: "bg-emerald-300",
  pending: "bg-amber-300",
  failed: "bg-red-300",
  refunded: "bg-sky-300",
};

function BreakdownTile({ tone, icon: Icon, value, label }) {
  const tones = {
    gray: { box: "bg-gray-100 text-gray-600", val: "text-primary" },
    amber: { box: "bg-amber-100 text-amber-600", val: "text-amber-700" },
    green: { box: "bg-emerald-100 text-emerald-600", val: "text-emerald-700" },
  };
  const t = tones[tone] || tones.gray;
  return (
    <div className="border border-gray-100 p-3.5 text-center">
      <span className={cn("mx-auto mb-2 grid h-8 w-8 place-items-center rounded-full", t.box)}>
        <Icon className="h-4 w-4" />
      </span>
      <p className={cn("font-heading text-base font-bold leading-none", t.val)}>{value}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">{label}</p>
    </div>
  );
}

function PaymentDetail({ payment: p, onBack }) {
  const gross = Number(p.amount || 0);
  const fee = Number(p.transactionFee || 0);
  const net = Number(p.netAmount != null ? p.netAmount : gross - fee);
  const netPct = gross > 0 ? Math.max(0, Math.min(100, Math.round((net / gross) * 100))) : 0;
  const donorInitial = (p.donorName || "?").trim().charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="lg:p-6 mt-20 lg:mt-0"
    >
      <button onClick={onBack} className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-accent">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to payments
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          {/* Summary */}
          <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
            {/* Gradient hero header */}
            <div
              className="relative overflow-hidden px-6 py-7 text-white"
              style={{ background: "linear-gradient(120deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))" }}
            >
              <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
              <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur">
                    <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[p.paymentStatus] || "bg-white/70")} />
                    {p.paymentStatus}
                  </span>
                  <p className="mt-3 font-heading text-4xl font-bold leading-none">{formatMoney(p.amount)}</p>
                  <p className="mt-2 truncate text-sm text-white/80">
                    Donation to <span className="font-semibold text-white">{p.campaign?.title || "—"}</span>
                  </p>
                </div>
                <span className="grid h-12 w-12 shrink-0 place-items-center bg-white/15 backdrop-blur">
                  <TrendingUp className="h-6 w-6" />
                </span>
              </div>
            </div>

            {/* Gross → fee → net breakdown */}
            <div className="p-6">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-text-muted">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Net to cause</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Fee</span>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full bg-emerald-500" style={{ width: `${netPct}%` }} title="Net to cause" />
                <div className="h-full bg-amber-400" style={{ width: `${100 - netPct}%` }} title="Processing fee" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <BreakdownTile tone="gray" icon={DollarSign} value={formatMoney(gross)} label="Gross" />
                <BreakdownTile tone="amber" icon={Receipt} value={formatMoney(fee)} label="Processing fee" />
                <BreakdownTile tone="green" icon={ShieldCheck} value={formatMoney(net)} label="Net to cause" />
              </div>
            </div>
          </div>

          {/* Donor & details */}
          <div className="border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/10 text-base font-bold text-accent">
                {donorInitial}
              </span>
              <div className="min-w-0">
                <h2 className="truncate font-heading text-lg font-bold text-primary">{p.donorName || "Donor"}</h2>
                <p className="text-xs text-text-muted">{p.isAnonymous ? "Anonymous donor" : "Donor & payment details"}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <DetailItem icon={Mail} label="Email">
                {p.donorEmail ? <a href={`mailto:${p.donorEmail}`} className="break-all text-accent hover:underline">{p.donorEmail}</a> : "—"}
              </DetailItem>
              <DetailItem icon={Megaphone} label="Campaign">{p.campaign?.title || "—"}</DetailItem>
              <DetailItem icon={Wallet} label="Method"><span className="capitalize">{p.paymentMethod || "—"}</span></DetailItem>
              <DetailItem icon={Calendar} label="Date">{formatDate(p.createdAt)}</DetailItem>
              <DetailItem icon={Hash} label="Reference">
                <span className="break-all font-mono text-xs">{p.stripePaymentIntentId || "—"}</span>
              </DetailItem>
              {p.message && (
                <div className="sm:col-span-2">
                  <DetailItem icon={MessageSquare} label="Message">
                    <span className="italic">“{p.message}”</span>
                  </DetailItem>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar — receipt & status */}
        <div className="lg:col-span-1">
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Receipt</p>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Receipt className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-heading text-xl font-bold text-primary">{formatMoney(p.amount)}</p>
                    <p className="text-xs capitalize text-text-muted">{p.paymentMethod || "payment"} · {p.paymentStatus}</p>
                  </div>
                </div>
                {p.stripeReceiptUrl ? (
                  <a
                    href={p.stripeReceiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex items-center justify-center gap-2 bg-accent py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent/90"
                  >
                    <Receipt className="h-4 w-4" /> View Stripe receipt <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="mt-5 bg-gray-50 px-3 py-2.5 text-center text-xs text-text-muted">No hosted receipt for this payment.</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 border border-emerald-100 bg-emerald-50/50 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <p className="text-xs leading-relaxed text-emerald-800">
                <span className="font-semibold">{formatMoney(net)}</span> reached the cause after a {formatMoney(fee)} processing fee. Funds go directly to the campaign&apos;s connected account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DetailItem({ icon: Icon, label, children }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        <Icon className="h-3.5 w-3.5 text-accent" /> {label}
      </p>
      <div className="mt-0.5 text-primary">{children}</div>
    </div>
  );
}
