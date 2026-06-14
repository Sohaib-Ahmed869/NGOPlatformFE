import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import cancellationService from "../../services/cancellation.service";
import Modal from "../../components/Modal";

const PER_PAGE = 12;

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "N/A";
const formatCurrency = (n) => (n || n === 0 ? `$${parseFloat(n).toFixed(2)}` : "N/A");

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
        <p className="truncate text-lg font-bold leading-none text-primary">{value}</p>
        <p className="mt-1 text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}

const PendingBadge = () => (
  <span className="inline-flex shrink-0 items-center bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
    Pending
  </span>
);

const CancellationRequests = () => {
  const cached = cancellationService.getCached();
  const [pendingRequests, setPendingRequests] = useState(cached || []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState("list"); // grid | list
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
    const donors = new Set(
      pendingRequests.map((r) => r.user?.email || r.user?._id).filter(Boolean),
    ).size;
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
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Cancellation requests</h1>
          <p className="mt-1 text-sm text-text-muted">Review and act on subscription cancellation requests.</p>
        </div>
        <button
          type="button"
          onClick={() => fetchPendingRequests({ force: true })}
          disabled={refreshing}
          className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Inbox} label="Pending requests" value={stats.total} tone="accent" />
        <StatCard icon={DollarSign} label="Value at risk" value={formatCurrency(stats.valueAtRisk)} tone="accent" />
        <StatCard icon={Users} label="Donors" value={stats.donors} tone="accent" />
        <StatCard icon={Clock} label="This week" value={stats.thisWeek} tone="muted" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by donor, email, ID or reason…"
            className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white"
          />
        </div>
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
            <Inbox className="mx-auto mb-3 h-10 w-10 text-text-muted" />
            <p className="text-text-muted">
              {pendingRequests.length === 0
                ? "No cancellation requests to review right now."
                : "No requests match your search."}
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
            {paginated.map((r, i) => (
              <motion.div
                key={r._id || i}
                variants={cardVariants}
                className="group flex flex-col border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/10 text-sm font-bold uppercase text-accent">
                      {r.user?.name?.charAt(0) || "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-primary" title={r.user?.name}>
                        {r.user?.name || "Unknown"}
                      </p>
                      <p className="truncate text-xs text-text-muted" title={r.user?.email}>
                        {r.user?.email || "No email"}
                      </p>
                    </div>
                  </div>
                  <PendingBadge />
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-text-muted">
                  <p className="flex items-center gap-1.5">
                    <DollarSign className="h-3 w-3 shrink-0" />
                    <span className="font-medium text-primary">{formatCurrency(r.totalAmount)}</span>
                    <span className="text-gray-300">·</span>
                    {r.recurringDetails?.frequency || "Unknown"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 shrink-0" /> Requested {formatDate(r.cancellationDetails?.date)}
                  </p>
                  <p className="line-clamp-2 min-h-[32px] italic leading-snug">
                    “{r.cancellationDetails?.reason || "No reason provided"}”
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-gray-50 pt-3">
                  <button
                    type="button"
                    onClick={() => openApprove(r)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 bg-emerald-50 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeny(r)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 bg-red-50 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Deny
                  </button>
                </div>
              </motion.div>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    <th className="px-4 py-3">Donor</th>
                    <th className="px-4 py-3">Subscription</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Requested</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={listContainer}>
                  {paginated.map((r, i) => (
                    <motion.tr
                      key={r._id || i}
                      variants={rowVariants}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-bold uppercase text-accent">
                            {r.user?.name?.charAt(0) || "?"}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-primary">{r.user?.name || "Unknown"}</p>
                            <p className="max-w-[220px] truncate text-xs text-text-muted">
                              {r.user?.email || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-primary">{formatCurrency(r.totalAmount)}</p>
                        <p className="text-xs text-text-muted">{r.recurringDetails?.frequency || "Unknown"}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="max-w-[240px] truncate text-text-muted" title={r.cancellationDetails?.reason}>
                          {r.cancellationDetails?.reason || "No reason provided"}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">{formatDate(r.cancellationDetails?.date)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openApprove(r)}
                            className="inline-flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeny(r)}
                            className="inline-flex items-center gap-1.5 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Deny
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
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

      {/* Approve Dialog */}
      <Modal
        isOpen={showApproveDialog}
        onClose={() => !acting && setShowApproveDialog(false)}
        title="Approve cancellation request"
      >
        <div className="p-4">
          <p className="text-sm text-gray-700">
            Approving permanently cancels the subscription and stops future payments. This can't be undone.
          </p>
          {selectedRequest && (
            <div className="mt-4 space-y-2 border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-primary">{selectedRequest.user?.name || "Unknown"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <DollarSign className="h-4 w-4 text-gray-500" />
                {formatCurrency(selectedRequest.totalAmount)} · {selectedRequest.recurringDetails?.frequency || "Unknown"}
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
      <Modal
        isOpen={showDenyDialog}
        onClose={() => !acting && setShowDenyDialog(false)}
        title="Deny cancellation request"
      >
        <div className="p-4">
          <p className="text-sm text-gray-700">
            Denying keeps the subscription active and it will continue to process payments.
          </p>
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
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <DollarSign className="h-4 w-4 text-gray-500" />
                {formatCurrency(selectedRequest.totalAmount)} · {selectedRequest.recurringDetails?.frequency || "Unknown"}
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
