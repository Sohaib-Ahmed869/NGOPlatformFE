import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Clock,
  User,
  Users,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  LayoutGrid,
  List,
  Repeat,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import cancellationService from "../../services/cancellation.service";
import Modal from "../../components/Modal";

const PER_PAGE = 12;
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
const money = (n) => (n || n === 0 ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—");
const initials = (name) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

/* ── Motion ──────────────────────────────────────────────────────────────── */
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
const listContainer = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } } };
const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

/* ── Presentational primitives ───────────────────────────────────────────── */
function HeaderStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-heading text-lg font-bold leading-none text-primary" title={String(value)}>
          {value}
        </p>
        <p className="mt-1 text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}

function PendingBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" /> Pending
    </span>
  );
}

function FrequencyChip({ frequency }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-600">
      <Repeat className="h-3.5 w-3.5" /> {frequency || "Recurring"}
    </span>
  );
}

function Avatar({ name }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-bold uppercase text-accent">
      {initials(name)}
    </span>
  );
}

const btnApprove =
  "inline-flex items-center justify-center gap-1.5 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50";
const btnDeny =
  "inline-flex items-center justify-center gap-1.5 border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50";

/* ── Card / row / mobile ─────────────────────────────────────────────────── */
function RequestCard({ item, onApprove, onDeny }) {
  return (
    <motion.div
      variants={cardVariants}
      className="group flex flex-col border border-gray-100 bg-white shadow-sm transition-all hover:border-accent/30 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <FrequencyChip frequency={item.recurringDetails?.frequency} />
        <PendingBadge />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2.5">
          <Avatar name={item.user?.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-primary" title={item.user?.name}>
              {item.user?.name || "Unknown"}
            </p>
            <p className="truncate text-xs text-text-muted" title={item.user?.email}>
              {item.user?.email || "No email"}
            </p>
          </div>
        </div>

        <p className="mt-4 font-heading text-2xl font-bold leading-tight text-accent">
          {money(item.totalAmount)}
          <span className="text-sm font-normal text-text-muted">/{(item.recurringDetails?.frequency || "plan").toLowerCase()}</span>
        </p>

        <p className="mt-3 line-clamp-3 min-h-[40px] border-l-2 border-gray-100 pl-3 text-xs italic leading-snug text-text-muted">
          “{item.cancellationDetails?.reason || "No reason provided"}”
        </p>

        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-text-muted">
          <Calendar className="h-3.5 w-3.5 shrink-0" /> Requested {fmtDate(item.cancellationDetails?.date)}
        </p>

        <div className="mt-auto flex items-center gap-2 pt-5">
          <button type="button" onClick={() => onApprove(item)} className={cn(btnApprove, "flex-1")}>
            <CheckCircle className="h-3.5 w-3.5" /> Approve
          </button>
          <button type="button" onClick={() => onDeny(item)} className={cn(btnDeny, "flex-1")}>
            <XCircle className="h-3.5 w-3.5" /> Deny
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function RequestRow({ item, onApprove, onDeny }) {
  return (
    <motion.tr variants={rowVariants} className="border-b border-gray-50 transition-colors last:border-0 hover:bg-accent/[0.035]">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={item.user?.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-primary">{item.user?.name || "Unknown"}</p>
            <p className="max-w-[200px] truncate text-xs text-text-muted">{item.user?.email || "No email"}</p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <span className="font-heading text-base font-bold tabular-nums text-primary">{money(item.totalAmount)}</span>
        <p className="text-[11px] capitalize text-text-muted">{item.recurringDetails?.frequency || "Recurring"}</p>
      </td>
      <td className="px-4 py-4">
        <p className="max-w-[260px] truncate text-text-muted" title={item.cancellationDetails?.reason}>
          {item.cancellationDetails?.reason || "No reason provided"}
        </p>
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-text-muted">{fmtDate(item.cancellationDetails?.date)}</td>
      <td className="px-4 py-4">
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => onApprove(item)} className={btnApprove}>
            <CheckCircle className="h-3.5 w-3.5" /> Approve
          </button>
          <button type="button" onClick={() => onDeny(item)} className={btnDeny}>
            <XCircle className="h-3.5 w-3.5" /> Deny
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

function RequestMobile({ item, onApprove, onDeny }) {
  return (
    <motion.div variants={rowVariants} className="p-4">
      <div className="flex items-start gap-3">
        <Avatar name={item.user?.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-primary">{item.user?.name || "Unknown"}</p>
              <p className="truncate text-xs text-text-muted">{item.user?.email || "No email"}</p>
            </div>
            <span className="shrink-0 text-right">
              <span className="font-heading text-base font-bold tabular-nums text-primary">{money(item.totalAmount)}</span>
              <span className="block text-[11px] capitalize text-text-muted">{item.recurringDetails?.frequency || "Recurring"}</span>
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs italic text-text-muted">“{item.cancellationDetails?.reason || "No reason provided"}”</p>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-[11px] text-text-muted">{fmtDate(item.cancellationDetails?.date)}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onApprove(item)} className={btnApprove}>
                <CheckCircle className="h-3.5 w-3.5" /> Approve
              </button>
              <button type="button" onClick={() => onDeny(item)} className={btnDeny}>
                <XCircle className="h-3.5 w-3.5" /> Deny
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const CancellationRequests = () => {
  const cached = cancellationService.getCached();
  const [pendingRequests, setPendingRequests] = useState(cached || []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem("adminCancellationsView") || "list";
    } catch {
      return "list";
    }
  });
  const changeView = (v) => {
    setView(v);
    try {
      localStorage.setItem("adminCancellationsView", v);
    } catch {
      /* ignore */
    }
  };
  const [currentPage, setCurrentPage] = useState(1);

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [denialReason, setDenialReason] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!cancellationService.getCached()) fetchPendingRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchPendingRequests = async ({ force = false } = {}) => {
    if (force) setRefreshing(true);
    try {
      setError(null);
      const req = cancellationService.list({ force });
      const data = await (isLoading ? withMinDelay(req) : req);
      setPendingRequests(data);
      if (force) toast.success("Refreshed");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to fetch cancellation requests");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setActing(true);
    try {
      const response = await cancellationService.approve(selectedRequest._id);
      if (response.data?.status === "Success") {
        toast.success("Cancellation request approved");
        setPendingRequests((prev) => prev.filter((r) => r._id !== selectedRequest._id));
        setShowApproveDialog(false);
      } else {
        toast.error("Failed to approve cancellation request");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to approve cancellation request");
    } finally {
      setActing(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedRequest) return;
    setActing(true);
    try {
      const response = await cancellationService.deny(selectedRequest._id, denialReason);
      if (response.data?.status === "Success") {
        toast.success("Cancellation request denied");
        setPendingRequests((prev) => prev.filter((r) => r._id !== selectedRequest._id));
        setShowDenyDialog(false);
        setDenialReason("");
      } else {
        toast.error("Failed to deny cancellation request");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to deny cancellation request");
    } finally {
      setActing(false);
    }
  };

  const stats = useMemo(() => {
    const valueAtRisk = pendingRequests.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
    const donors = new Set(pendingRequests.map((r) => r.user?.email || r.user?._id).filter(Boolean)).size;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = pendingRequests.filter((r) => {
      const d = r.cancellationDetails?.date ? new Date(r.cancellationDetails.date).getTime() : 0;
      return d >= weekAgo;
    }).length;
    return { total: pendingRequests.length, valueAtRisk, donors, thisWeek };
  }, [pendingRequests]);

  const filtered = useMemo(
    () =>
      pendingRequests.filter((r) => {
        const q = searchTerm.toLowerCase();
        if (!q) return true;
        return (
          r.user?.name?.toLowerCase().includes(q) ||
          r.user?.email?.toLowerCase().includes(q) ||
          r._id?.toLowerCase().includes(q) ||
          r.cancellationDetails?.reason?.toLowerCase().includes(q)
        );
      }),
    [pendingRequests, searchTerm],
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const openApprove = (request) => {
    setSelectedRequest(request);
    setShowApproveDialog(true);
  };
  const openDeny = (request) => {
    setSelectedRequest(request);
    setDenialReason("");
    setShowDenyDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading cancellation requests…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-50">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <p className="text-sm font-medium text-primary">Something went wrong</p>
          <p className="mt-1 text-xs text-text-muted">{error}</p>
          <button
            onClick={() => fetchPendingRequests({ force: true })}
            className="mt-4 bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-light"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header card with gradient band + integrated stats */}
      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Recurring giving</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-white">Cancellation requests</h1>
            <p className="mt-1 text-sm text-white/80">Review and act on subscription cancellation requests from your donors.</p>
          </div>
          <button
            type="button"
            onClick={() => fetchPendingRequests({ force: true })}
            disabled={refreshing}
            className="inline-flex shrink-0 items-center gap-1.5 border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 divide-y divide-gray-100 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <HeaderStat icon={Inbox} label="Pending requests" value={stats.total} />
          <HeaderStat icon={DollarSign} label="Value at risk" value={money(stats.valueAtRisk)} />
          <HeaderStat icon={Users} label="Donors" value={stats.donors} />
          <HeaderStat icon={Clock} label="This week" value={stats.thisWeek} />
        </div>
      </div>

      {/* Controls — search + view toggle on one line */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by donor, email, ID or reason…"
            className="w-full border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>
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
                    layoutId="cancellationsViewActive"
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
              <Inbox className="h-6 w-6" />
            </span>
            <p className="font-semibold text-gray-800">
              {pendingRequests.length === 0 ? "All caught up" : "No matching requests"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
              {pendingRequests.length === 0
                ? "There are no cancellation requests to review right now."
                : "Try a different search term."}
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
            {paginated.map((r) => (
              <RequestCard key={r._id} item={r} onApprove={openApprove} onDeny={openDeny} />
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
                    <th className="px-4 py-3.5">Subscription</th>
                    <th className="px-4 py-3.5">Reason</th>
                    <th className="px-4 py-3.5">Requested</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={listContainer}>
                  {paginated.map((r) => (
                    <RequestRow key={r._id} item={r} onApprove={openApprove} onDeny={openDeny} />
                  ))}
                </motion.tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <motion.div variants={listContainer} className="divide-y divide-gray-50 md:hidden">
              {paginated.map((r) => (
                <RequestMobile key={r._id} item={r} onApprove={openApprove} onDeny={openDeny} />
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

      {/* Approve Dialog */}
      <Modal isOpen={showApproveDialog} onClose={() => !acting && setShowApproveDialog(false)} title="Approve cancellation request">
        <div className="p-4">
          <p className="text-sm text-gray-700">
            Approving permanently cancels the subscription and stops future payments. This cannot be undone.
          </p>
          {selectedRequest && (
            <div className="mt-4 space-y-2 border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-primary">{selectedRequest.user?.name || "Unknown"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm capitalize text-gray-700">
                <DollarSign className="h-4 w-4 text-gray-500" />
                {money(selectedRequest.totalAmount)} · {selectedRequest.recurringDetails?.frequency || "Recurring"}
              </div>
            </div>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setShowApproveDialog(false)}
              disabled={acting}
              className="border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={acting}
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Confirm approval
            </button>
          </div>
        </div>
      </Modal>

      {/* Deny Dialog */}
      <Modal isOpen={showDenyDialog} onClose={() => !acting && setShowDenyDialog(false)} title="Deny cancellation request">
        <div className="p-4">
          <p className="text-sm text-gray-700">Denying keeps the subscription active and it will continue to process payments.</p>
          <div className="mt-4">
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Reason for denial (optional)
            </label>
            <textarea
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              placeholder="Provide a reason for denying this request…"
              rows={3}
              className="w-full resize-none border-b border-gray-200 bg-transparent py-2 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent"
            />
          </div>
          {selectedRequest && (
            <div className="mt-4 space-y-2 border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-primary">{selectedRequest.user?.name || "Unknown"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm capitalize text-gray-700">
                <DollarSign className="h-4 w-4 text-gray-500" />
                {money(selectedRequest.totalAmount)} · {selectedRequest.recurringDetails?.frequency || "Recurring"}
              </div>
            </div>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setShowDenyDialog(false)}
              disabled={acting}
              className="border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeny}
              disabled={acting}
              className="inline-flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Confirm denial
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CancellationRequests;
