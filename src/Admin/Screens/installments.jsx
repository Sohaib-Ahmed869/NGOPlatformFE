import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Layers,
  CheckCircle,
  TrendingUp,
  Calendar,
  LayoutGrid,
  List,
  Receipt,
  Eye,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import AdminDonationService from "../../services/adminDonation.service";
import { HEADER_GRADIENT, money, fmtDate, ENDED, statusLabel, mapInstallments } from "./installmentUtils";
import { HeaderStat, StatusBadge, TypeChip, Avatar, ProgressBar } from "./installmentShared";

const PER_PAGE = 12;

const DEFAULT_STATS = { totalAmount: 0, activeInstallments: 0, totalInstallments: 0, averageInstallment: 0 };

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
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
  exit: { opacity: 0, transition: { duration: 0.28 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const computeInstallmentStats = (mapped) => {
  const totalAmount = mapped.reduce((s, d) => s + (d.amount || 0), 0);
  const active = mapped.filter((d) => d.status === "active" || d.status === "pending").length;
  const total = mapped.length;
  return {
    totalAmount,
    activeInstallments: active,
    totalInstallments: total,
    averageInstallment: total > 0 ? totalAmount / total : 0,
  };
};

/* ── One installment plan (grid card) — donor "My Subscriptions" layout ──── */
function InstallmentCard({ item, onView }) {
  const isComplete = item.status === "completed";
  const ended = ENDED.includes(item.status);
  const metaLabel = ended || isComplete ? "Started" : item.nextPayment ? "Next payment" : "Started";
  const metaDate = ended || isComplete ? item.date : item.nextPayment || item.date;
  return (
    <motion.div
      variants={cardVariants}
      onClick={() => onView(item)}
      className="group flex cursor-pointer flex-col border border-gray-100 bg-white shadow-sm transition-all hover:border-accent/30 hover:shadow-md"
    >
      {/* Header band */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <TypeChip />
        <StatusBadge status={item.status} />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Donor */}
        <div className="flex items-center gap-2.5">
          <Avatar name={item.donor} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-primary" title={item.donor}>
              {item.donor}
            </p>
            <p className="truncate text-xs text-text-muted" title={item.email}>
              {item.email}
            </p>
          </div>
        </div>

        {/* Amount */}
        <p className="mt-4 font-heading text-3xl font-bold leading-tight text-accent">
          {money(item.installmentAmount)}
          <span className="text-sm font-normal text-text-muted">/installment</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-text-muted">
          {money(item.amount)} total · {item.cause}
        </p>

        {/* Progress */}
        <div className="mt-4">
          <ProgressBar paid={item.paid} total={item.total} status={item.status} />
        </div>

        {/* Meta — definition grid */}
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-4 text-sm">
          <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-text-muted/70">Donation ID</dt>
            <dd className="mt-0.5 truncate font-medium text-gray-800" title={item.donationId}>
              {item.donationId || "—"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-text-muted/70">{metaLabel}</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-gray-800">
              <Calendar className="h-4 w-4 shrink-0 text-accent" /> {fmtDate(metaDate)}
            </dd>
          </div>
        </dl>

        {isComplete && (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4 shrink-0" /> Fully paid
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center gap-2 pt-5">
          {item.receiptUrl && (
            <a
              href={item.receiptUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex flex-1 items-center justify-center gap-2 border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-accent/50 hover:text-accent"
            >
              <Receipt className="h-4 w-4" /> Receipt
            </a>
          )}
          <span className="inline-flex flex-1 items-center justify-center gap-2 border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors group-hover:border-accent/50 group-hover:text-accent">
            <Eye className="h-4 w-4" /> View details
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── One installment plan (desktop table row) ────────────────────────────── */
function InstallmentRow({ item, onView }) {
  return (
    <motion.tr
      variants={rowVariants}
      onClick={() => onView(item)}
      className="group cursor-pointer border-b border-gray-50 transition-colors last:border-0 hover:bg-accent/[0.035]"
    >
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={item.donor} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-primary">{item.donor}</p>
            <p className="max-w-[200px] truncate text-xs text-text-muted">{item.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <p className="truncate text-sm text-primary">{item.cause}</p>
        <p className="truncate text-[11px] text-text-muted" title={item.donationId}>
          {item.donationId}
        </p>
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <span className="font-heading text-base font-bold tabular-nums text-primary">{money(item.installmentAmount)}</span>
        <span className="text-xs font-normal text-text-muted">/inst.</span>
        <p className="text-[11px] text-text-muted">{money(item.amount)} total</p>
      </td>
      <td className="w-48 px-4 py-4">
        <ProgressBar paid={item.paid} total={item.total} status={item.status} thin />
      </td>
      <td className="px-4 py-4">
        <StatusBadge status={item.status} />
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-text-muted">{fmtDate(item.date)}</td>
      <td className="px-4 py-4">
        <div className="flex items-center justify-end gap-1">
          {item.receiptUrl && (
            <a
              href={item.receiptUrl}
              target="_blank"
              rel="noreferrer"
              title="View receipt"
              onClick={(e) => e.stopPropagation()}
              className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent"
            >
              <Receipt className="h-4 w-4" />
            </a>
          )}
          <button
            type="button"
            title="View details"
            onClick={(e) => {
              e.stopPropagation();
              onView(item);
            }}
            className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent group-hover:text-accent"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

/* ── One installment plan (mobile card, used inside list view) ───────────── */
function InstallmentMobile({ item, onView }) {
  return (
    <motion.div
      variants={rowVariants}
      onClick={() => onView(item)}
      className="cursor-pointer p-4 transition-colors hover:bg-accent/[0.035]"
    >
      <div className="flex items-start gap-3">
        <Avatar name={item.donor} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-primary">{item.donor}</p>
              <p className="truncate text-xs text-text-muted">{item.cause}</p>
            </div>
            <span className="shrink-0 text-right">
              <span className="font-heading text-base font-bold tabular-nums text-primary">{money(item.installmentAmount)}</span>
              <span className="text-xs font-normal text-text-muted">/inst.</span>
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar paid={item.paid} total={item.total} status={item.status} thin />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <StatusBadge status={item.status} />
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span>{fmtDate(item.date)}</span>
              {item.receiptUrl && (
                <a
                  href={item.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  <Receipt className="h-3.5 w-3.5" /> Receipt
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const AdminInstallments = () => {
  const navigate = useNavigate();
  const cached = AdminDonationService.getCachedInstallments();
  const cachedMapped = cached ? mapInstallments(cached) : [];
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [donations, setDonations] = useState(cachedMapped);
  const [stats, setStats] = useState(cached ? computeInstallmentStats(cachedMapped) : { ...DEFAULT_STATS });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem("adminInstView") || "list";
    } catch {
      return "list";
    }
  });
  const changeView = (v) => {
    setView(v);
    try {
      localStorage.setItem("adminInstView", v);
    } catch {
      /* ignore */
    }
  };
  const [currentPage, setCurrentPage] = useState(1);

  // Open the individual installment as its own page (pass the plan along so it
  // renders instantly; a direct visit / refresh refetches by id).
  const openDetail = (item) => navigate(`/admin/installments/${item.id}`, { state: { item } });

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
      const mapped = mapInstallments(response);
      setDonations(mapped);
      setStats(computeInstallmentStats(mapped));
      if (force) toast.success("Refreshed");
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

  // Status filter pills — only surface statuses that actually exist, each with a
  // live count (mirrors the donor portal's Active/Past tab pattern).
  const statusCounts = useMemo(() => {
    const c = {};
    donations.forEach((d) => {
      c[d.status] = (c[d.status] || 0) + 1;
    });
    return c;
  }, [donations]);
  const STATUS_ORDER = ["active", "pending", "completed", "failed", "cancelled", "ended"];
  const statusPills = [
    { value: "all", label: "All", count: donations.length },
    ...STATUS_ORDER.filter((s) => statusCounts[s]).map((s) => ({
      value: s,
      label: statusLabel(s),
      count: statusCounts[s],
    })),
  ];

  // Lifecycle distribution for the donut — colours track the status palette.
  const distribution = useMemo(() => {
    const counts = { Active: 0, Completed: 0, Failed: 0, Cancelled: 0, Ended: 0 };
    donations.forEach((d) => {
      if (d.status === "failed") counts.Failed++;
      else if (d.status === "cancelled") counts.Cancelled++;
      else if (d.status === "ended") counts.Ended++;
      else if (d.status === "completed") counts.Completed++;
      else counts.Active++; // active + pending
    });
    const COLORS = {
      Active: "#10B981",
      Completed: "#2563EB",
      Failed: "#DC2626",
      Cancelled: "#F97316",
      Ended: "var(--tenant-primary, #2C2418)",
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
    <div className="w-full space-y-6">
      {/* Header card with gradient band + integrated stats (My Subscriptions style) */}
      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Installment giving</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-white">Installments</h1>
            <p className="mt-1 text-sm text-white/80">Every installment donation plan across your donors, in one place.</p>
          </div>
          <button
            type="button"
            onClick={() => fetchInstallments({ force: true })}
            disabled={refreshing}
            className="inline-flex shrink-0 items-center gap-1.5 border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 divide-y divide-gray-100 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <HeaderStat icon={DollarSign} label="Total amount" value={money(stats.totalAmount)} />
          <HeaderStat icon={Layers} label="Active plans" value={stats.activeInstallments} />
          <HeaderStat icon={CheckCircle} label="Total plans" value={stats.totalInstallments} />
          <HeaderStat icon={TrendingUp} label="Average plan" value={money(stats.averageInstallment)} />
        </div>
      </div>

      {/* Status distribution */}
      {distTotal > 0 && (
        <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-primary">Status distribution</h2>
            <span className="text-xs text-text-muted">
              {distTotal} {distTotal === 1 ? "plan" : "plans"}
            </span>
          </div>
          <div className="flex flex-col items-center gap-6 p-5 sm:flex-row sm:gap-8">
            {(() => {
              const r = 58,
                c = 2 * Math.PI * r,
                gap = 8;
              let offset = 0;
              return (
                <svg width={128} height={128} viewBox="0 0 140 140" className="shrink-0">
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
                  <text x="70" y="66" textAnchor="middle" fontSize="22" fontWeight="700" className="fill-primary">
                    {distTotal}
                  </text>
                  <text x="70" y="83" textAnchor="middle" fontSize="10" fill="#94a3b8">
                    plans
                  </text>
                </svg>
              );
            })()}
            {/* Per-status breakdown fills the width: count + proportional bar + % */}
            <div className="grid w-full flex-1 grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
              {distribution
                .filter((s) => s.value > 0)
                .map((s) => {
                  const pct = Math.round((s.value / distTotal) * 100);
                  return (
                    <div key={s.name}>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                        <span className="text-sm text-text-muted">{s.name}</span>
                        <span className="ml-auto text-sm font-bold text-primary">{s.value}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                        </div>
                        <span className="w-8 shrink-0 text-right text-[11px] font-medium text-text-muted">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Controls — search + status pills + view toggle on one line */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-72 md:flex-1 lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, donor, email or cause…"
            className="w-full border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>

        {/* Status pills */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {statusPills.map((p) => {
            const active = statusFilter === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setStatusFilter(p.value)}
                className={cn(
                  "relative isolate inline-flex items-center gap-1.5 border px-3.5 py-1.5 text-sm font-medium transition-colors duration-200",
                  active
                    ? "border-accent text-accent"
                    : "border-gray-200 bg-white text-text-muted hover:border-accent/40 hover:text-primary",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="instStatusActive"
                    className="absolute inset-0 -z-10 bg-accent/10"
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  />
                )}
                {p.label}
                <span className={cn("text-xs", active ? "text-accent/70" : "text-gray-400")}>{p.count}</span>
              </button>
            );
          })}
        </div>

        {/* View toggle */}
        <div className="inline-flex shrink-0 border border-gray-200">
          {[
            { id: "list", Icon: List, title: "List view" },
            { id: "grid", Icon: LayoutGrid, title: "Card view" },
          ].map((v, idx) => {
            const activeView = view === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => changeView(v.id)}
                title={v.title}
                className={cn(
                  "relative isolate grid h-9 w-9 place-items-center transition-colors duration-200",
                  idx > 0 && "border-l border-gray-200",
                  activeView ? "text-white" : "text-text-muted hover:text-accent",
                )}
              >
                {activeView && (
                  <motion.span
                    layoutId="instViewActive"
                    className="absolute inset-0 -z-10 bg-accent"
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  />
                )}
                <v.Icon className="h-4 w-4" />
              </button>
            );
          })}
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
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
              <Layers className="h-6 w-6" />
            </span>
            <p className="font-semibold text-gray-800">
              {donations.length === 0 ? "No installment plans yet" : "No matching plans"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
              {donations.length === 0
                ? "Installment donation plans will appear here as donors set them up."
                : "Try a different search term or status filter."}
            </p>
          </motion.div>
        ) : view === "grid" ? (
          <motion.div
            key={`grid-${currentPage}`}
            variants={gridContainer}
            initial="hidden"
            animate="show"
            exit="exit"
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
          >
            {paginated.map((d) => (
              <InstallmentCard key={d.id} item={d} onView={openDetail} />
            ))}
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
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-accent/10 bg-accent/5 text-left text-[11px] font-semibold uppercase tracking-wider text-accent">
                    <th className="px-4 py-3.5">Donor</th>
                    <th className="px-4 py-3.5">Plan</th>
                    <th className="px-4 py-3.5">Amount</th>
                    <th className="px-4 py-3.5">Progress</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Started</th>
                    <th className="px-4 py-3.5 text-right">Receipt</th>
                  </tr>
                </thead>
                <motion.tbody variants={listContainer}>
                  {paginated.map((d) => (
                    <InstallmentRow key={d.id} item={d} onView={openDetail} />
                  ))}
                </motion.tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <motion.div variants={listContainer} className="divide-y divide-gray-50 md:hidden">
              {paginated.map((d) => (
                <InstallmentMobile key={d.id} item={d} onView={openDetail} />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <span className="text-xs text-text-muted">
            Showing {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filtered.length)} of{" "}
            {filtered.length}
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
