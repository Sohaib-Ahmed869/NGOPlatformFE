import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  DollarSign,
  Layers,
  CheckCircle,
  TrendingUp,
  Calendar,
  FileText,
  LayoutGrid,
  List,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { withMinDelay } from "../../utils/minDelay";
import { CustomSelect } from "../../components/CustomSelect";
import { cn } from "../../utils/cn";
import AdminDonationService from "../../services/adminDonation.service";

const PER_PAGE = 12;
const money = (n) => `$${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

const DEFAULT_STATS = { totalAmount: 0, activeInstallments: 0, totalInstallments: 0, averageInstallment: 0 };

const STATUS_BADGE = {
  active: "bg-accent/10 text-accent",
  completed: "bg-primary/10 text-primary",
  pending: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-600",
  cancelled: "bg-gray-100 text-gray-600",
  ended: "bg-gray-100 text-gray-600",
};

// Entrance/exit motion — a coordinated stagger so cards/rows appear smoothly,
// plus a clean cross-fade when switching between grid and list (keyed by
// view+page so it replays on open, view-switch and pagination).
const fadeWrap = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.28 } },
};
const gridContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.28 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.1 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

// ── Data shaping (pure) ────────────────────────────────
const getInstallmentDonations = (response) =>
  (response?.donations || []).filter((d) => d.paymentType === "installments");

const computeInstallmentStats = (response) => {
  const list = getInstallmentDonations(response);
  const totalAmount = list.reduce((s, d) => s + (d.totalAmount || 0), 0);
  const active = list.filter(
    (d) =>
      d.paymentStatus !== "cancelled" &&
      d.paymentStatus !== "failed" &&
      d.paymentStatus !== "ended" &&
      d.installmentDetails?.installmentsPaid < d.installmentDetails?.numberOfInstallments,
  ).length;
  const total = list.length;
  return {
    totalAmount,
    activeInstallments: active,
    totalInstallments: total,
    averageInstallment: total > 0 ? totalAmount / total : 0,
  };
};

const mapInstallments = (response) =>
  getInstallmentDonations(response).map((d) => ({
    id: d._id,
    donationId: d.donationId,
    donor: d.donorDetails?.name || "Anonymous",
    email: d.donorDetails?.email || "—",
    amount: d.totalAmount,
    cause:
      d.items && d.items.length > 0 ? (d.items.length === 1 ? d.items[0].title : "Multiple items") : "—",
    date: d.createdAt,
    status: d.paymentStatus,
    installmentDetails: d.installmentDetails,
    receiptUrl: d.receiptUrl || null,
  }));

function StatCard({ icon: Icon, label, value, tone = "accent" }) {
  const tones = {
    accent: "bg-accent/10 text-accent",
    muted: "bg-gray-100 text-gray-500",
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

function StatusBadge({ status }) {
  const s = status || "pending";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-xs font-semibold capitalize",
        STATUS_BADGE[s] || "bg-gray-100 text-gray-600",
      )}
    >
      {s}
    </span>
  );
}

function ProgressBar({ paid, total }) {
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden bg-gray-100">
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-[11px] font-medium text-text-muted">
        {paid}/{total}
      </span>
    </div>
  );
}

const AdminInstallments = () => {
  const cached = AdminDonationService.getCachedInstallments();
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [donations, setDonations] = useState(cached ? mapInstallments(cached) : []);
  const [stats, setStats] = useState(cached ? computeInstallmentStats(cached) : { ...DEFAULT_STATS });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState("list"); // grid | list
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!AdminDonationService.getCachedInstallments()) fetchInstallments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const fetchInstallments = async ({ force = false } = {}) => {
    if (force) setRefreshing(true);
    try {
      const req = AdminDonationService.getInstallmentsCached({ page: 1, limit: 10000 }, { force });
      const response = await (loading ? withMinDelay(req) : req);
      setStats(computeInstallmentStats(response));
      setDonations(mapInstallments(response));
    } catch (err) {
      toast.error(err.message || "Failed to fetch installments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtered = useMemo(
    () =>
      donations.filter((d) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !q ||
          d.donationId?.toLowerCase().includes(q) ||
          d.donor?.toLowerCase().includes(q) ||
          d.email?.toLowerCase().includes(q) ||
          d.cause?.toLowerCase().includes(q);
        const matchesStatus = statusFilter === "all" || d.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [donations, searchTerm, statusFilter],
  );

  // On-theme status distribution for the donut.
  const distribution = useMemo(() => {
    const counts = { Active: 0, Failed: 0, Ended: 0, Cancelled: 0 };
    donations.forEach((d) => {
      if (
        d.status === "pending" ||
        (d.status !== "cancelled" &&
          d.status !== "failed" &&
          d.status !== "ended" &&
          d.installmentDetails?.installmentsPaid < d.installmentDetails?.numberOfInstallments)
      ) {
        counts.Active++;
      } else if (d.status === "failed") counts.Failed++;
      else if (d.status === "ended") counts.Ended++;
      else if (d.status === "cancelled") counts.Cancelled++;
    });
    const COLORS = {
      Active: "var(--tenant-accent, #C9A84C)",
      Failed: "#DC2626",
      Ended: "var(--tenant-primary, #2C2418)",
      Cancelled: "#9CA3AF",
    };
    return Object.keys(counts).map((name) => ({ name, value: counts[name], color: COLORS[name] }));
  }, [donations]);
  const distTotal = distribution.reduce((s, d) => s + d.value, 0);

  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading installments…" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Installments</h1>
          <p className="mt-1 text-sm text-text-muted">Track installment donation plans.</p>
        </div>
        <button
          type="button"
          onClick={() => fetchInstallments({ force: true })}
          disabled={refreshing}
          className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Total amount" value={money(stats.totalAmount)} tone="accent" />
        <StatCard icon={Layers} label="Active plans" value={stats.activeInstallments} tone="accent" />
        <StatCard icon={CheckCircle} label="Total plans" value={stats.totalInstallments} tone="accent" />
        <StatCard icon={TrendingUp} label="Average plan" value={money(stats.averageInstallment)} tone="muted" />
      </div>

      {/* Status distribution */}
      {distTotal > 0 && (
        <div className="border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-primary">Status distribution</h2>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
            {(() => {
              const r = 58, c = 2 * Math.PI * r, gap = 8;
              let offset = 0;
              return (
                <svg width={150} height={150} viewBox="0 0 140 140" className="shrink-0">
                  <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
                  {distribution
                    .filter((s) => s.value > 0)
                    .map((seg, i) => {
                      const pct = seg.value / distTotal;
                      const dashLen = Math.max(0, pct * c - gap);
                      const el = (
                        <circle
                          key={i}
                          cx="70"
                          cy="70"
                          r={r}
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="16"
                          strokeLinecap="round"
                          strokeDasharray={`${dashLen} ${c - dashLen}`}
                          strokeDashoffset={-offset}
                          transform="rotate(-90 70 70)"
                        />
                      );
                      offset += pct * c;
                      return el;
                    })}
                  <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="700" className="fill-primary">
                    {distTotal}
                  </text>
                  <text x="70" y="82" textAnchor="middle" fontSize="10" fill="#94a3b8">
                    plans
                  </text>
                </svg>
              );
            })()}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
              {distribution.map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm text-text-muted">{s.name}</span>
                  <span className="ml-auto text-sm font-semibold text-primary">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, donor, email or cause…"
            className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white"
          />
        </div>
        <CustomSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All status" },
            { value: "active", label: "Active" },
            { value: "completed", label: "Completed" },
            { value: "pending", label: "Pending" },
            { value: "failed", label: "Failed" },
            { value: "cancelled", label: "Cancelled" },
            { value: "ended", label: "Ended" },
          ]}
          triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          className="sm:min-w-[150px]"
        />
        <div className="inline-flex shrink-0 border border-gray-200">
          <button
            type="button"
            onClick={() => setView("grid")}
            title="Grid view"
            className={cn(
              "grid h-9 w-9 place-items-center transition-colors",
              view === "grid" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            title="List view"
            className={cn(
              "grid h-9 w-9 place-items-center transition-colors",
              view === "list" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50",
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {paginated.length === 0 ? (
          <motion.div
            key="empty"
            variants={fadeWrap}
            initial="hidden"
            animate="show"
            exit="exit"
            className="border border-gray-100 bg-white p-12 text-center shadow-sm"
          >
            <Layers className="mx-auto mb-3 h-10 w-10 text-text-muted" />
            <p className="text-text-muted">
              {donations.length === 0
                ? "No installment plans yet."
                : "No installment plans match your filters."}
            </p>
          </motion.div>
        ) : view === "grid" ? (
          <motion.div
            key={`grid-${currentPage}`}
            variants={gridContainer}
            initial="hidden"
            animate="show"
            exit="exit"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {paginated.map((d, i) => {
              const paid = d.installmentDetails?.installmentsPaid || 0;
              const total = d.installmentDetails?.numberOfInstallments || 0;
              return (
                <motion.div
                  key={d.id || i}
                  variants={cardVariants}
                  className="group flex flex-col border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-primary" title={d.donor}>
                        {d.donor}
                      </p>
                      <p className="truncate text-xs text-text-muted" title={d.email}>
                        {d.email}
                      </p>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>

                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <span className="text-lg font-bold text-primary">{money(d.amount)}</span>
                    <span className="truncate text-[11px] text-text-muted" title={d.donationId}>
                      {d.donationId}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-text-muted">{d.cause}</p>

                  <div className="mt-3">
                    <ProgressBar paid={paid} total={total} />
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-2.5 text-[11px] text-text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {fmtDate(d.date)}
                    </span>
                    {d.receiptUrl && (
                      <a
                        href={d.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline"
                      >
                        <FileText className="h-3 w-3" /> Receipt
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key={`list-${currentPage}`}
            variants={fadeWrap}
            initial="hidden"
            animate="show"
            exit="exit"
            className="overflow-hidden border border-gray-100 bg-white shadow-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    <th className="px-4 py-3">Donation ID</th>
                    <th className="px-4 py-3">Donor</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Cause</th>
                    <th className="w-44 px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <motion.tbody variants={listContainer}>
                  {paginated.map((d, i) => {
                    const paid = d.installmentDetails?.installmentsPaid || 0;
                    const total = d.installmentDetails?.numberOfInstallments || 0;
                    return (
                      <motion.tr
                        key={d.id || i}
                        variants={rowVariants}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
                      >
                        <td className="px-4 py-2.5 font-medium text-primary">{d.donationId}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-primary">{d.donor}</p>
                          <p className="max-w-[220px] truncate text-xs text-text-muted">{d.email}</p>
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-primary">{money(d.amount)}</td>
                        <td className="px-4 py-2.5 text-text-muted">
                          <span className="block max-w-[180px] truncate">{d.cause}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <ProgressBar paid={paid} total={total} />
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={d.status} />
                        </td>
                        <td className="px-4 py-2.5 text-text-muted">{fmtDate(d.date)}</td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <span className="text-xs text-text-muted">
            Showing {(currentPage - 1) * PER_PAGE + 1}–
            {Math.min(currentPage * PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pg;
              if (totalPages <= 5) pg = i + 1;
              else if (currentPage <= 3) pg = i + 1;
              else if (currentPage >= totalPages - 2) pg = totalPages - (4 - i);
              else pg = currentPage - 2 + i;
              return (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setCurrentPage(pg)}
                  className={cn(
                    "h-8 w-8 text-xs font-medium transition-colors",
                    currentPage === pg ? "bg-accent text-white" : "text-text-muted hover:bg-gray-100",
                  )}
                >
                  {pg}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInstallments;
