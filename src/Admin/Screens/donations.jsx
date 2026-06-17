import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  DollarSign,
  Receipt,
  TrendingUp,
  Repeat,
  Gift,
  Calendar,
  Eye,
  AlertCircle,
  LayoutGrid,
  List,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { withMinDelay } from "../../utils/minDelay";
import { CustomSelect } from "../../components/CustomSelect";
import { cn } from "../../utils/cn";
import AdminDonationService from "../../services/adminDonation.service";
import axiosInstance from "../../services/axios";
import Modal from "../../components/Modal";
import {
  HEADER_GRADIENT,
  money,
  fmtDate,
  mapDonationRow,
  computeStats,
  statusLabel,
  TYPE_LABEL,
  TYPE_COLOR,
} from "./donationUtils";
import { HeaderStat, StatusBadge, TypeChip, Avatar } from "./donationShared";

const PER_PAGE = 12;

/* ── Motion ──────────────────────────────────────────────────────────────── */
const fadeWrap = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.28 } },
};
const gridContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.06 } },
  exit: { opacity: 0, transition: { duration: 0.28 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const listContainer = { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.06 } } };
const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

/* ── Card / row / mobile ─────────────────────────────────────────────────── */
function DonationCard({ item, onView, onProcess }) {
  const pendingCancel = item.status === "pending_cancellation";
  return (
    <motion.div
      variants={cardVariants}
      onClick={() => onView(item)}
      className="group flex cursor-pointer flex-col border border-gray-100 bg-white shadow-sm transition-all hover:border-accent/30 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <TypeChip category={item.category} />
        <StatusBadge status={item.status} />
      </div>
      <div className="flex flex-1 flex-col p-5">
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

        <p className="mt-4 font-heading text-3xl font-bold leading-tight text-accent">{money(item.amount)}</p>
        <p className="mt-0.5 truncate text-xs text-text-muted">{item.cause}</p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-4 text-sm">
          <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-text-muted/70">Donation ID</dt>
            <dd className="mt-0.5 truncate font-medium text-gray-800" title={item.donationId}>
              {item.donationId || "—"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-text-muted/70">Date</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-gray-800">
              <Calendar className="h-4 w-4 shrink-0 text-accent" /> {fmtDate(item.date)}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center gap-2 pt-5">
          {pendingCancel && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onProcess(item);
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 border border-orange-200 px-3 py-2 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-50"
            >
              <AlertCircle className="h-4 w-4" /> Process
            </button>
          )}
          <span className="inline-flex flex-1 items-center justify-center gap-2 border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors group-hover:border-accent/50 group-hover:text-accent">
            <Eye className="h-4 w-4" /> View details
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function DonationRow({ item, onView, onProcess }) {
  const pendingCancel = item.status === "pending_cancellation";
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
        <span className="font-heading text-base font-bold tabular-nums text-primary">{money(item.amount)}</span>
      </td>
      <td className="px-4 py-4">
        <TypeChip category={item.category} />
      </td>
      <td className="whitespace-nowrap px-4 py-4 capitalize text-text-muted">{item.paymentMethod}</td>
      <td className="whitespace-nowrap px-4 py-4 text-text-muted">{fmtDate(item.date)}</td>
      <td className="px-4 py-4">
        <StatusBadge status={item.status} />
      </td>
      <td className="px-4 py-4 text-right">
        <div className="flex items-center justify-end gap-1">
          {pendingCancel && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onProcess(item);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-50"
            >
              Process
            </button>
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

function DonationMobile({ item, onView, onProcess }) {
  const pendingCancel = item.status === "pending_cancellation";
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
            <span className="shrink-0 font-heading text-base font-bold tabular-nums text-primary">{money(item.amount)}</span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TypeChip category={item.category} />
              <StatusBadge status={item.status} />
            </div>
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span>{fmtDate(item.date)}</span>
              {pendingCancel && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onProcess(item);
                  }}
                  className="font-semibold text-orange-600"
                >
                  Process
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const AdminDonationsList = () => {
  const navigate = useNavigate();

  // Seed instantly from the cached initial bundle (populated by the dashboard /
  // a prior visit); otherwise fetch the full donations set on mount.
  const seedRaw = () => AdminDonationService.getCachedDonationsBundle()?.allDonations?.donations || null;

  const [allRaw, setAllRaw] = useState(() => seedRaw() || []);
  const [loading, setLoading] = useState(() => !seedRaw());
  const [refreshing, setRefreshing] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem("adminDonationsView") || "list";
    } catch {
      return "list";
    }
  });
  const changeView = (v) => {
    setView(v);
    try {
      localStorage.setItem("adminDonationsView", v);
    } catch {
      /* ignore */
    }
  };
  const [currentPage, setCurrentPage] = useState(1);

  const [showCancelRequestDialog, setShowCancelRequestDialog] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);

  useEffect(() => {
    if (!seedRaw()) loadAll({ cold: true });
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  const loadAll = async ({ cold = false, force = false } = {}) => {
    if (force) setRefreshing(true);
    try {
      const req = AdminDonationService.getAllDonations({ sortBy: "createdAt", sortOrder: "desc" });
      const res = await (cold ? withMinDelay(req) : req);
      setAllRaw(res?.donations || []);
      if (force) toast.success("Refreshed");
    } catch (error) {
      toast.error("Failed to load donations");
      console.error("Donations fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const rows = useMemo(() => allRaw.map(mapDonationRow), [allRaw]);
  const stats = useMemo(() => computeStats(rows), [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !q ||
          r.donationId?.toLowerCase().includes(q) ||
          r.donor?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.cause?.toLowerCase().includes(q);
        const matchesStatus = statusFilter === "all" || (r.status || "").toLowerCase() === statusFilter;
        const matchesType = typeFilter === "all" || r.category === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
      }),
    [rows, searchTerm, statusFilter, typeFilter],
  );

  const statusCounts = useMemo(() => {
    const c = {};
    rows.forEach((r) => {
      const k = (r.status || "unknown").toLowerCase();
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }, [rows]);
  const STATUS_ORDER = ["completed", "active", "pending", "processing", "pending_cancellation", "failed", "cancelled", "ended"];
  const statusPills = [
    { value: "all", label: "All", count: rows.length },
    ...STATUS_ORDER.filter((s) => statusCounts[s]).map((s) => ({ value: s, label: statusLabel(s), count: statusCounts[s] })),
  ];

  const distribution = useMemo(() => {
    const counts = { "one-time": 0, recurring: 0, installments: 0 };
    rows.forEach((r) => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return Object.keys(TYPE_LABEL).map((key) => ({ name: TYPE_LABEL[key], value: counts[key] || 0, color: TYPE_COLOR[key] }));
  }, [rows]);
  const distTotal = distribution.reduce((s, d) => s + d.value, 0);

  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const openDetail = (item) => navigate(`/admin/donations/${item.id}`, { state: { item } });
  const openProcess = (item) => {
    setSelectedDonation(item);
    setShowCancelRequestDialog(true);
  };

  const handleProcessCancellationRequest = async (action) => {
    try {
      if (!selectedDonation) return;
      await axiosInstance.post(`/admin/orders/${selectedDonation.id}/process-cancellation`, { action });
      toast.success(`Cancellation request ${action === "approve" ? "approved" : "rejected"} successfully`);
      setShowCancelRequestDialog(false);
      AdminDonationService.invalidateDonationsCache();
      loadAll();
    } catch (error) {
      console.error("Process cancellation error:", error);
      toast.error(error?.response?.data?.message || "Failed to process cancellation request");
    }
  };

  const handleExportDonations = async () => {
    try {
      setExportLoading(true);
      if (!allRaw || allRaw.length === 0) {
        toast.error("No donations to export");
        return;
      }
      const headers = [
        "Donation ID", "Donor Name", "Email", "Phone", "Amount", "Project/Cause", "Donation Type", "On Behalf Of",
        "Payment Type", "Payment Method", "Status", "Date", "Next Payment Date", "Next Installment Date", "Frequency",
        "Admin Cost", "Receipt Available",
      ].join(",");

      const escapeCsvField = (field) => {
        if (field === null || field === undefined) return "";
        const str = String(field);
        return str.includes(",") ? `"${str}"` : str;
      };

      const csvRows = allRaw.map((donation) => {
        const itemsText = donation.items ? escapeCsvField(donation.items.map((item) => item.title).join("; ")) : "";
        const donationTypes = donation.items
          ? escapeCsvField(donation.items.map((item) => item.donationType || "Sadaqah").join("; "))
          : "Sadaqah";
        const onBehalfOfText = donation.items
          ? escapeCsvField(donation.items.filter((item) => item.onBehalfOf).map((item) => item.onBehalfOf).join("; "))
          : "";
        const adminCost =
          donation.adminCostContribution && donation.adminCostContribution.included ? donation.adminCostContribution.amount : 0;
        const frequency = donation.recurringDetails ? donation.recurringDetails.frequency : "";
        const hasReceipt = donation.receiptUrl ? "Yes" : "No";
        return [
          escapeCsvField(donation.donationId),
          escapeCsvField(donation.donorDetails?.name || ""),
          escapeCsvField(donation.donorDetails?.email || ""),
          escapeCsvField(donation.donorDetails?.phone || ""),
          donation.totalAmount,
          itemsText,
          donationTypes,
          onBehalfOfText,
          escapeCsvField(donation.paymentType),
          escapeCsvField(donation.paymentMethod),
          escapeCsvField(donation.paymentStatus),
          escapeCsvField(new Date(donation.createdAt).toLocaleDateString()),
          escapeCsvField(
            donation.paymentType === "recurring" && donation.recurringDetails?.nextPaymentDate
              ? new Date(donation.recurringDetails.nextPaymentDate).toLocaleDateString()
              : "",
          ),
          escapeCsvField(
            donation.paymentType === "installments" && donation.installmentDetails?.nextInstallmentDate
              ? new Date(donation.installmentDetails.nextInstallmentDate).toLocaleDateString()
              : "",
          ),
          escapeCsvField(frequency),
          adminCost,
          hasReceipt,
        ].join(",");
      });

      const csvContent = [headers, ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `donations_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export completed successfully");
    } catch (error) {
      toast.error("Failed to export donations");
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading donations…" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header card with gradient band + integrated stats */}
      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Giving</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-white">All Donations</h1>
            <p className="mt-1 text-sm text-white/80">Every donation across your organisation, in one place.</p>
          </div>
          <button
            type="button"
            onClick={() => loadAll({ force: true })}
            disabled={refreshing}
            className="inline-flex shrink-0 items-center gap-1.5 border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 divide-y divide-gray-100 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <HeaderStat icon={DollarSign} label="Total raised" value={money(stats.totalAmount)} />
          <HeaderStat icon={Receipt} label="Total donations" value={stats.total} />
          <HeaderStat icon={TrendingUp} label="Average gift" value={money(stats.avg)} />
          <HeaderStat icon={Repeat} label="Recurring plans" value={stats.recurring} />
        </div>
      </div>

      {/* Type distribution */}
      {distTotal > 0 && (
        <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-primary">Donation types</h2>
            <span className="text-xs text-text-muted">
              {distTotal} {distTotal === 1 ? "donation" : "donations"}
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
                    total
                  </text>
                </svg>
              );
            })()}
            <div className="grid w-full flex-1 grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-3">
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

      {/* Controls */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, donor, email or cause…"
              className="w-full border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent"
            />
          </div>
          <CustomSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: "all", label: "All types" },
              { value: "one-time", label: "One-time" },
              { value: "recurring", label: "Recurring" },
              { value: "installments", label: "Installments" },
            ]}
            triggerClassName="border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
            className="md:min-w-[150px]"
          />
          <button
            type="button"
            onClick={handleExportDonations}
            disabled={exportLoading}
            className="inline-flex shrink-0 items-center justify-center gap-2 border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
          >
            {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export
          </button>
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
                    "relative isolate grid h-10 w-10 place-items-center transition-colors duration-200",
                    idx > 0 && "border-l border-gray-200",
                    activeView ? "text-white" : "text-text-muted hover:text-accent",
                  )}
                >
                  {activeView && (
                    <motion.span
                      layoutId="donationsViewActive"
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

        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-2">
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
                    layoutId="donationsStatusActive"
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
              <Gift className="h-6 w-6" />
            </span>
            <p className="font-semibold text-gray-800">{rows.length === 0 ? "No donations yet" : "No matching donations"}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
              {rows.length === 0 ? "Donations will appear here as they come in." : "Try a different search term or filter."}
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
              <DonationCard key={d.id} item={d} onView={openDetail} onProcess={openProcess} />
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
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-accent/10 bg-accent/5 text-left text-[11px] font-semibold uppercase tracking-wider text-accent">
                    <th className="px-4 py-3.5">Donor</th>
                    <th className="px-4 py-3.5">Donation</th>
                    <th className="px-4 py-3.5">Amount</th>
                    <th className="px-4 py-3.5">Type</th>
                    <th className="px-4 py-3.5">Method</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">View</th>
                  </tr>
                </thead>
                <motion.tbody variants={listContainer}>
                  {paginated.map((d) => (
                    <DonationRow key={d.id} item={d} onView={openDetail} onProcess={openProcess} />
                  ))}
                </motion.tbody>
              </table>
            </div>
            <motion.div variants={listContainer} className="divide-y divide-gray-50 md:hidden">
              {paginated.map((d) => (
                <DonationMobile key={d.id} item={d} onView={openDetail} onProcess={openProcess} />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <span className="text-xs text-text-muted">
            Showing {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filtered.length)} of {filtered.length}
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

      {/* Cancellation Request Dialog */}
      <Modal
        isOpen={showCancelRequestDialog}
        onClose={() => setShowCancelRequestDialog(false)}
        title="Process Cancellation Request"
        description="Review the cancellation request and choose to approve or reject it."
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-token">
            <h4 className="font-medium text-gray-900">Donation Details</h4>
            <div className="mt-2 space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium">Donor:</span> {selectedDonation?.donor}
              </p>
              <p>
                <span className="font-medium">Amount:</span> ${selectedDonation?.amount}
              </p>
              <p>
                <span className="font-medium">Type:</span> {selectedDonation?.type}
              </p>
              <p>
                <span className="font-medium">Reason:</span> {selectedDonation?.cancelReason || "—"}
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowCancelRequestDialog(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            >
              Cancel
            </button>
            <button
              onClick={() => handleProcessCancellationRequest("reject")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Reject
            </button>
            <button
              onClick={() => handleProcessCancellationRequest("approve")}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Approve
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDonationsList;
