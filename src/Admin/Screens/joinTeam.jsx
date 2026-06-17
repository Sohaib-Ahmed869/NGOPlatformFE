import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "../../components/Portal";
import { toast } from "react-hot-toast";
import {
  Search,
  Download,
  RefreshCw,
  Users,
  Clock,
  UserCheck,
  UserX,
  Eye,
  Trash2,
  Phone,
  UserRound,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LayoutGrid,
  List,
  X,
  Mail,
  Check,
  Send,
  CalendarPlus,
  StickyNote,
  CalendarDays,
  Briefcase,
  Clock4,
  ExternalLink,
  ListPlus,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { CustomSelect } from "../../components/CustomSelect";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import joinTeamService from "../../services/joinTeam.service";
import eventsService from "../../services/events.service";
import { getSocket } from "../../services/socket";
import { useAdminRealtime } from "../../context/AdminRealtimeContext";
import VolunteerFormBuilder from "./VolunteerFormBuilder";

const PER_PAGE = 12;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

const fullName = (a) => `${a.firstName || ""} ${a.lastName || ""}`.trim() || "Applicant";
const initials = (a) =>
  `${(a.firstName || "").charAt(0)}${(a.lastName || "").charAt(0)}`.toUpperCase() || "?";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];
// Statuses that trigger an applicant email when "notify" is on.
const EMAILABLE = new Set(["shortlisted", "approved", "rejected"]);
const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-700",
  reviewed: "bg-accent/10 text-accent",
  shortlisted: "bg-primary/10 text-primary",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
};
const ASSIGNMENT_STATUS = [
  { value: "assigned", label: "Assigned" },
  { value: "confirmed", label: "Confirmed" },
  { value: "attended", label: "Attended" },
  { value: "no-show", label: "No-show" },
];
const SORTS = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "createdAt:asc", label: "Oldest first" },
  { value: "firstName:asc", label: "Name A–Z" },
  { value: "firstName:desc", label: "Name Z–A" },
  { value: "age:asc", label: "Age (low–high)" },
  { value: "status:asc", label: "Status" },
];

const fadeWrap = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.35, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};
const gridContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};
const listContainer = { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } } };
const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

function Avatar({ item, className }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-accent/10 font-bold uppercase text-accent",
        className,
      )}
    >
      {initials(item)}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, tone = "accent" }) {
  const tones = { accent: "bg-accent/10 text-accent", muted: "bg-gray-100 text-gray-500" };
  return (
    <div className="flex items-center gap-3 border border-gray-100 bg-white p-3.5 shadow-sm">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center", tones[tone])}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div>
        <p className="text-lg font-bold leading-none text-primary">{value}</p>
        <p className="mt-1 text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = status || "pending";
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 text-xs font-semibold capitalize", STATUS_BADGE[s])}>
      {s}
    </span>
  );
}

function RowActions({ item, onView, onDelete, size = "sm" }) {
  const btn = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onView(item)}
        title="View details"
        className={cn("grid place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent", btn)}
      >
        <Eye className={icon} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(item)}
        title="Delete"
        className={cn("grid place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500", btn)}
      >
        <Trash2 className={icon} />
      </button>
    </div>
  );
}

function Field({ label, value, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm text-gray-800">{value || value === 0 ? value : "—"}</p>
    </div>
  );
}

const EMPTY_STATS = { total: 0, pending: 0, approved: 0, rejected: 0 };

const JoinTeamAdmin = () => {
  const navigate = useNavigate();
  const { refreshVolunteers } = useAdminRealtime();

  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1, stats: EMPTY_STATS });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters / query state.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [sort, setSort] = useState("createdAt:desc");
  const [view, setView] = useState("list");
  const [page, setPage] = useState(1);

  // Bulk selection (list view).
  const [selected, setSelected] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // Modals.
  const [viewApp, setViewApp] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [team, setTeam] = useState([]);
  const [formQuestions, setFormQuestions] = useState([]);
  const [formOpen, setFormOpen] = useState(false);

  const items = data.items;
  const stats = data.stats || EMPTY_STATS;

  // Debounce the search box → query state.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, genderFilter, sort]);

  const fetchList = useCallback(
    async ({ initial = false, force = false } = {}) => {
      if (force) setRefreshing(true);
      const [sortBy, sortOrder] = sort.split(":");
      try {
        const req = joinTeamService.list({
          q: search,
          status: statusFilter,
          gender: genderFilter,
          sortBy,
          sortOrder,
          page,
          limit: PER_PAGE,
        });
        const res = await (initial ? withMinDelay(req) : req);
        setData(res);
        setSelected(new Set()); // stale across reloads
      } catch {
        toast.error("Failed to load applications");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter, genderFilter, sort, page],
  );

  // Keep a ref to the latest fetch so socket handlers always re-run the current query.
  const fetchRef = useRef(fetchList);
  useEffect(() => {
    fetchRef.current = fetchList;
  });

  useEffect(() => {
    fetchList({ initial: loading });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchList]);

  // Team list (for assignment) + custom form questions — loaded once.
  useEffect(() => {
    joinTeamService.team().then(setTeam).catch(() => {});
    joinTeamService.getForm().then(setFormQuestions).catch(() => {});
  }, []);

  // Real-time: react to submissions / changes from anywhere.
  useEffect(() => {
    const socket = getSocket();
    const onNew = ({ volunteer }) => {
      toast.success(`New application from ${volunteer ? fullName(volunteer) : "a volunteer"}`, { icon: "🙌" });
      fetchRef.current?.();
    };
    const onUpdated = ({ volunteer }) => {
      fetchRef.current?.();
      setViewApp((cur) => (cur && volunteer && cur._id === volunteer._id ? volunteer : cur));
    };
    const onRemoved = (payload) => {
      const id = payload?.id;
      fetchRef.current?.();
      setViewApp((cur) => (cur && id && cur._id === id ? null : cur));
    };
    const onBulk = () => fetchRef.current?.();

    socket.on("volunteer:new", onNew);
    socket.on("volunteer:updated", onUpdated);
    socket.on("volunteer:deleted", onRemoved);
    socket.on("volunteer:bulk", onBulk);
    return () => {
      socket.off("volunteer:new", onNew);
      socket.off("volunteer:updated", onUpdated);
      socket.off("volunteer:deleted", onRemoved);
      socket.off("volunteer:bulk", onBulk);
    };
  }, []);

  /* ── selection helpers ─────────────────────────────────────────────── */
  const allOnPageSelected = items.length > 0 && items.every((a) => selected.has(a._id));
  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleSelectAll = () =>
    setSelected((prev) => {
      if (items.every((a) => prev.has(a._id))) return new Set();
      return new Set(items.map((a) => a._id));
    });

  /* ── mutations ─────────────────────────────────────────────────────── */
  const afterMutate = () => {
    fetchRef.current?.();
    refreshVolunteers();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await joinTeamService.remove(deleteTarget._id);
      toast.success("Application deleted");
      setDeleteTarget(null);
      setViewApp((v) => (v && v._id === deleteTarget._id ? null : v));
      afterMutate();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete application");
    } finally {
      setDeleting(false);
    }
  };

  const runBulk = async (action, status) => {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      await joinTeamService.bulk(ids, action, status);
      toast.success(
        action === "delete" ? `Deleted ${ids.length} application(s)` : `Marked ${ids.length} as ${status}`,
      );
      setSelected(new Set());
      afterMutate();
    } catch (err) {
      toast.error(err.response?.data?.error || "Bulk action failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const rows = await joinTeamService.exportAll({ status: statusFilter });
      const header = [
        "First Name", "Last Name", "Email", "Phone", "Age", "Gender", "Address",
        "Skills", "Available Days", "Status", "Assigned To", "Events", "Hours", "Received",
        ...formQuestions.map((q) => q.label),
      ].join(",");
      const esc = (v) => {
        if (v === null || v === undefined) return '""';
        return typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v;
      };
      const lines = rows.map((a) => {
        const hours = (a.assignments || []).reduce((s, x) => s + (x.hours || 0), 0);
        const ans = a.answers || {};
        return [
          esc(a.firstName), esc(a.lastName), esc(a.email), esc(a.phoneNumber),
          a.age ?? "", esc(a.gender), esc(a.address), esc(a.skills),
          esc(Array.isArray(a.availableDays) ? a.availableDays.join("; ") : ""),
          esc(a.status || "pending"),
          esc(a.assignedTo?.name || ""),
          (a.assignments || []).length,
          hours,
          esc(a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : ""),
          ...formQuestions.map((q) => {
            const val = ans[q.key];
            return esc(Array.isArray(val) ? val.join("; ") : val ?? "");
          }),
        ].join(",");
      });
      const csv = [header, ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `volunteers_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading applications…" />
      </div>
    );
  }

  const showingFrom = data.total === 0 ? 0 : (data.page - 1) * PER_PAGE + 1;
  const showingTo = Math.min(data.page * PER_PAGE, data.total);

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Volunteers</h1>
          <p className="mt-1 text-sm text-text-muted">Review, engage and deploy your volunteer applications.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ListPlus className="h-4 w-4" /> Customize form
          </button>
          <button
            type="button"
            onClick={() => fetchList({ force: true })}
            disabled={refreshing}
            className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </button>
          <button
            type="button"
            onClick={exportToCSV}
            disabled={stats.total === 0}
            className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total applications" value={stats.total} tone="accent" />
        <StatCard icon={Clock} label="Pending review" value={stats.pending} tone="accent" />
        <StatCard icon={UserCheck} label="Approved" value={stats.approved} tone="accent" />
        <StatCard icon={UserX} label="Rejected" value={stats.rejected} tone="muted" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 border border-gray-100 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, phone, skills…"
            className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[{ value: "all", label: "All status" }, ...STATUSES]}
            triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            className="min-w-[140px]"
          />
          <CustomSelect
            value={genderFilter}
            onChange={setGenderFilter}
            options={[
              { value: "all", label: "All genders" },
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" },
            ]}
            triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            className="min-w-[130px]"
          />
          <CustomSelect
            value={sort}
            onChange={setSort}
            options={SORTS}
            triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            className="min-w-[150px]"
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
      </div>

      {/* Bulk action bar (list view) */}
      <AnimatePresence>
        {view === "list" && selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-wrap items-center justify-between gap-3 border border-accent/20 bg-accent/5 px-4 py-3"
          >
            <span className="text-sm font-medium text-primary">{selected.size} selected</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => runBulk("status", "shortlisted")}
                className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" /> Shortlist
              </button>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => runBulk("status", "approved")}
                className="inline-flex items-center gap-1.5 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                <UserCheck className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => runBulk("status", "rejected")}
                className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <UserX className="h-3.5 w-3.5" /> Reject
              </button>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => runBulk("delete")}
                className="inline-flex items-center gap-1.5 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
        {items.length === 0 ? (
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
              {stats.total === 0 ? "No volunteer applications yet." : "No applications match your filters."}
            </p>
          </motion.div>
        ) : view === "grid" ? (
          <motion.div
            key={`grid-${data.page}`}
            variants={gridContainer}
            initial="hidden"
            animate="show"
            exit="exit"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {items.map((a, i) => {
              const hours = (a.assignments || []).reduce((s, x) => s + (x.hours || 0), 0);
              return (
                <motion.div
                  key={a._id || i}
                  variants={cardVariants}
                  className="group flex flex-col border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <Avatar item={a} className="h-11 w-11 text-sm" />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/volunteers/${a._id}`)}
                        className="block max-w-full truncate text-left text-sm font-semibold text-primary transition-colors hover:text-accent hover:underline"
                        title={`View ${fullName(a)}'s profile`}
                      >
                        {fullName(a)}
                      </button>
                      <a
                        href={`mailto:${a.email}`}
                        className="block truncate text-xs text-accent hover:underline"
                        title={a.email}
                      >
                        {a.email}
                      </a>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-text-muted">
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 shrink-0" /> {a.phoneNumber || "—"}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <UserRound className="h-3 w-3 shrink-0" />
                      {[a.gender, a.age ? `${a.age} yrs` : null].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <p className="line-clamp-2 min-h-[32px] leading-snug">{a.skills || "No skills listed"}</p>
                  </div>

                  {(a.assignedTo || (a.assignments || []).length > 0) && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {a.assignedTo && (
                        <span className="inline-flex items-center gap-1 bg-primary/5 px-2 py-0.5 font-medium text-primary">
                          <Briefcase className="h-3 w-3" /> {a.assignedTo.name || a.assignedTo.email}
                        </span>
                      )}
                      {(a.assignments || []).length > 0 && (
                        <span className="inline-flex items-center gap-1 bg-accent/10 px-2 py-0.5 font-medium text-accent">
                          <CalendarDays className="h-3 w-3" /> {a.assignments.length} event
                          {a.assignments.length > 1 ? "s" : ""}
                          {hours > 0 ? ` · ${hours}h` : ""}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
                    <StatusBadge status={a.status} />
                    <RowActions item={a} onView={setViewApp} onDelete={setDeleteTarget} />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key={`list-${data.page}`}
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
                    <th className="w-10 px-4 py-3">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className={cn(
                          "grid h-4 w-4 place-items-center border transition-colors",
                          allOnPageSelected ? "border-accent bg-accent text-white" : "border-gray-300 hover:border-accent",
                        )}
                        aria-label="Select all on page"
                      >
                        {allOnPageSelected && <Check className="h-3 w-3" />}
                      </button>
                    </th>
                    <th className="px-4 py-3">Applicant</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={listContainer} initial="hidden" animate="show">
                  {items.map((a, i) => {
                    const isSel = selected.has(a._id);
                    return (
                      <motion.tr
                        key={a._id || i}
                        variants={rowVariants}
                        className={cn(
                          "border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50/60",
                          isSel && "bg-accent/5",
                        )}
                      >
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => toggleSelect(a._id)}
                            className={cn(
                              "grid h-4 w-4 place-items-center border transition-colors",
                              isSel ? "border-accent bg-accent text-white" : "border-gray-300 hover:border-accent",
                            )}
                            aria-label="Select row"
                          >
                            {isSel && <Check className="h-3 w-3" />}
                          </button>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <Avatar item={a} className="h-9 w-9 text-xs" />
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => navigate(`/admin/volunteers/${a._id}`)}
                                className="block max-w-full truncate text-left font-medium text-primary transition-colors hover:text-accent hover:underline"
                                title={`View ${fullName(a)}'s profile`}
                              >
                                {fullName(a)}
                              </button>
                              <p className="max-w-[260px] truncate text-xs text-accent">{a.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-text-muted">{a.phoneNumber || "—"}</td>
                        <td className="px-4 py-2.5 text-text-muted">
                          {a.assignedTo ? (
                            <span className="text-primary">{a.assignedTo.name || a.assignedTo.email}</span>
                          ) : (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={a.status} />
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end">
                            <RowActions item={a} onView={setViewApp} onDelete={setDeleteTarget} size="md" />
                          </div>
                        </td>
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
      {data.pages > 1 && (
        <div className="flex items-center justify-between border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <span className="text-xs text-text-muted">
            Showing {showingFrom}–{showingTo} of {data.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page === 1}
              className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
              let pg;
              if (data.pages <= 5) pg = i + 1;
              else if (data.page <= 3) pg = i + 1;
              else if (data.page >= data.pages - 2) pg = data.pages - (4 - i);
              else pg = data.page - 2 + i;
              return (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setPage(pg)}
                  className={cn(
                    "h-8 w-8 text-xs font-medium transition-colors",
                    data.page === pg ? "bg-accent text-white" : "text-text-muted hover:bg-gray-100",
                  )}
                >
                  {pg}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={data.page === data.pages}
              className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Form builder */}
      <VolunteerFormBuilder open={formOpen} onClose={() => setFormOpen(false)} onSaved={setFormQuestions} />

      {/* Details drawer */}
      <VolunteerDrawer
        volunteer={viewApp}
        team={team}
        questions={formQuestions}
        onClose={() => setViewApp(null)}
        onChanged={(updated) => {
          setViewApp(updated);
          afterMutate();
        }}
        onDelete={(v) => {
          setDeleteTarget(v);
          setViewApp(null);
        }}
      />

      {/* Delete confirmation */}
      <Portal>
        <AnimatePresence>
          {deleteTarget && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
              <motion.div
                className="relative w-full max-w-sm border border-gray-100 bg-white p-6 text-center shadow-2xl"
                initial={{ scale: 0.96, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 16 }}
              >
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-50">
                  <Trash2 className="h-5 w-5 text-red-500" />
                </div>
                <h3 className="text-base font-semibold text-primary">Delete this application?</h3>
                <p className="mt-1 break-words text-sm text-text-muted">
                  The application from <span className="font-medium text-primary">{fullName(deleteTarget)}</span> will be
                  permanently removed. This can't be undone.
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleting}
                    className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex flex-1 items-center justify-center gap-2 bg-red-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
};

/* ── Details drawer: status + assignment + events + notes + profile ──── */

function VolunteerDrawer({ volunteer, team, questions = [], onClose, onChanged, onDelete }) {
  const [savingStatus, setSavingStatus] = useState(false);
  const [notify, setNotify] = useState(true);
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Events (for the link picker) — loaded lazily once the drawer opens.
  const [events, setEvents] = useState([]);
  const [eventToAdd, setEventToAdd] = useState("");
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!volunteer) return;
    setNoteInput("");
    setEventToAdd("");
    eventsService
      .getAll()
      .then((res) => setEvents(res?.events || res || []))
      .catch(() => {});
  }, [volunteer]);

  if (!volunteer) return null;

  const v = volunteer;
  const assignments = v.assignments || [];
  const notes = v.notes || [];
  const totalHours = assignments.reduce((s, a) => s + (a.hours || 0), 0);
  const linkedIds = new Set(assignments.map((a) => String(a.event?._id || a.event)));
  const availableEvents = events.filter((e) => !linkedIds.has(String(e._id)));

  const teamOptions = [
    { value: "", label: "Unassigned" },
    ...team.map((m) => ({ value: m._id, label: m.name || m.email })),
  ];

  const setStatus = async (status) => {
    setSavingStatus(true);
    try {
      const willNotify = notify && EMAILABLE.has(status);
      const updated = await joinTeamService.setStatus(v._id, status, willNotify);
      onChanged(updated);
      toast.success(updated.emailed ? "Status updated · applicant emailed" : "Status updated");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  };

  const assign = async (userId) => {
    try {
      const updated = await joinTeamService.assign(v._id, userId || null);
      onChanged(updated);
      toast.success(userId ? "Assigned" : "Unassigned");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to assign");
    }
  };

  const addNote = async () => {
    const body = noteInput.trim();
    if (!body) return;
    setSavingNote(true);
    try {
      const updated = await joinTeamService.addNote(v._id, body);
      onChanged(updated);
      setNoteInput("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add note");
    } finally {
      setSavingNote(false);
    }
  };

  const removeNote = async (noteId) => {
    try {
      const updated = await joinTeamService.deleteNote(v._id, noteId);
      onChanged(updated);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to remove note");
    }
  };

  const linkEvent = async () => {
    if (!eventToAdd) return;
    setLinking(true);
    try {
      const updated = await joinTeamService.linkEvent(v._id, { eventId: eventToAdd });
      onChanged(updated);
      setEventToAdd("");
      toast.success("Linked to event");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to link event");
    } finally {
      setLinking(false);
    }
  };

  const updateAssignment = async (assignmentId, payload) => {
    try {
      const updated = await joinTeamService.updateAssignment(v._id, assignmentId, payload);
      onChanged(updated);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update");
    }
  };

  const unlink = async (assignmentId) => {
    try {
      const updated = await joinTeamService.unlinkEvent(v._id, assignmentId);
      onChanged(updated);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to remove");
    }
  };

  const SectionTitle = ({ icon: Icon, children, right }) => (
    <div className="mb-3 flex items-center justify-between">
      <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">
        <Icon className="h-3.5 w-3.5" /> {children}
      </h4>
      {right}
    </div>
  );

  return (
    <Portal>
      <AnimatePresence>
        {volunteer && (
          <motion.div
            className="fixed inset-0 z-50 flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div
              className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
              initial={{ x: 40, opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ type: "tween", duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar item={v} className="h-11 w-11 text-sm" />
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-primary">{fullName(v)}</h3>
                    <div className="mt-0.5 flex items-center gap-2">
                      <StatusBadge status={v.status} />
                      <span className="truncate text-xs text-text-muted">Applied {fmtDate(v.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="grid h-8 w-8 shrink-0 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {/* Quick contact actions */}
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/admin/volunteers/${v._id}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Full profile
                  </Link>
                  <a
                    href={`mailto:${v.email}`}
                    className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Mail className="h-3.5 w-3.5" /> Email
                  </a>
                  {v.phoneNumber && (
                    <a
                      href={`tel:${v.phoneNumber}`}
                      className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <Phone className="h-3.5 w-3.5" /> Call
                    </a>
                  )}
                </div>

                {/* Status + assignment */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="border border-gray-100 bg-gray-50/70 p-4">
                    <SectionTitle icon={Check}>Status</SectionTitle>
                    <CustomSelect
                      value={v.status || "pending"}
                      onChange={setStatus}
                      disabled={savingStatus}
                      options={STATUSES}
                      triggerClassName="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                    <label className="mt-2.5 flex cursor-pointer items-start gap-2 text-xs text-text-muted">
                      <input
                        type="checkbox"
                        checked={notify}
                        onChange={(e) => setNotify(e.target.checked)}
                        className="mt-0.5 accent-accent"
                      />
                      <span>
                        Email the applicant on <strong>shortlist / approve / reject</strong>.
                      </span>
                    </label>
                  </div>

                  <div className="border border-gray-100 bg-gray-50/70 p-4">
                    <SectionTitle icon={Briefcase}>Assigned to</SectionTitle>
                    <CustomSelect
                      value={v.assignedTo?._id || ""}
                      onChange={assign}
                      options={teamOptions}
                      triggerClassName="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                    <p className="mt-2.5 text-xs text-text-muted">
                      Owner responsible for following up with this volunteer.
                    </p>
                  </div>
                </div>

                {/* Events */}
                <div>
                  <SectionTitle
                    icon={CalendarDays}
                    right={
                      totalHours > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                          <Clock4 className="h-3.5 w-3.5" /> {totalHours}h logged
                        </span>
                      ) : null
                    }
                  >
                    Events ({assignments.length})
                  </SectionTitle>

                  <div className="space-y-2">
                    {assignments.length === 0 && (
                      <p className="text-sm text-text-muted">Not assigned to any events yet.</p>
                    )}
                    {assignments.map((a) => (
                      <div key={a._id} className="flex flex-wrap items-center gap-2 border border-gray-100 p-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-primary">
                            {a.event?.title || "Event"}
                          </p>
                          <p className="text-xs text-text-muted">{a.event?.date ? fmtDate(a.event.date) : "—"}</p>
                        </div>
                        <CustomSelect
                          value={a.status}
                          onChange={(val) => updateAssignment(a._id, { status: val })}
                          options={ASSIGNMENT_STATUS}
                          triggerClassName="border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-accent"
                          className="w-[120px]"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            defaultValue={a.hours || 0}
                            onBlur={(e) => {
                              const hrs = Math.max(0, Number(e.target.value) || 0);
                              if (hrs !== (a.hours || 0)) updateAssignment(a._id, { hours: hrs });
                            }}
                            className="w-14 border border-gray-200 px-2 py-1 text-xs outline-none focus:border-accent"
                            title="Hours"
                          />
                          <span className="text-xs text-text-muted">h</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => unlink(a._id)}
                          title="Remove from event"
                          className="grid h-7 w-7 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {availableEvents.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <CustomSelect
                        value={eventToAdd}
                        onChange={setEventToAdd}
                        options={[
                          { value: "", label: "Add to an event…" },
                          ...availableEvents.map((e) => ({
                            value: e._id,
                            label: `${e.title} · ${fmtDate(e.date)}`,
                          })),
                        ]}
                        triggerClassName="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={linkEvent}
                        disabled={!eventToAdd || linking}
                        className="inline-flex items-center gap-1.5 bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
                      >
                        {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <SectionTitle icon={StickyNote}>Internal notes ({notes.length})</SectionTitle>
                  <div className="space-y-2">
                    {notes.length === 0 && (
                      <p className="text-sm text-text-muted">No notes yet — jot down anything the team should know.</p>
                    )}
                    {notes.map((n) => (
                      <div key={n._id} className="group border border-gray-100 bg-gray-50/60 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-primary">
                            {n.author?.name || n.author?.email || "Team member"}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-text-muted">{fmtDateTime(n.createdAt)}</span>
                            <button
                              type="button"
                              onClick={() => removeNote(n._id)}
                              className="text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                              title="Delete note"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">{n.body}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2.5 flex items-start gap-2">
                    <textarea
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") addNote();
                      }}
                      rows={2}
                      placeholder="Add an internal note… (⌘/Ctrl + Enter)"
                      className="flex-1 resize-none border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={addNote}
                      disabled={!noteInput.trim() || savingNote}
                      className="inline-flex h-9 items-center gap-1.5 bg-accent px-3 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
                    >
                      {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Profile */}
                <div>
                  <SectionTitle icon={UserRound}>Application details</SectionTitle>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <Field label="Email" value={<a href={`mailto:${v.email}`} className="text-accent hover:underline">{v.email}</a>} />
                    <Field
                      label="Phone"
                      value={v.phoneNumber ? <a href={`tel:${v.phoneNumber}`} className="hover:underline">{v.phoneNumber}</a> : "—"}
                    />
                    <Field label="Age" value={v.age} />
                    <Field label="Gender" value={v.gender} />
                    <Field full label="Address" value={v.address} />
                    <Field full label="Skills & experience" value={v.skills} />
                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Available days</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {v.availableDays?.length ? (
                          v.availableDays.map((d, idx) => (
                            <span key={idx} className="bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                              {d}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-800">—</span>
                        )}
                      </div>
                    </div>
                    {questions.map((q) => {
                      const val = v.answers?.[q.key];
                      if (val === undefined || val === "" || (Array.isArray(val) && !val.length)) return null;
                      return (
                        <Field key={q.key} full label={q.label} value={Array.isArray(val) ? val.join(", ") : String(val)} />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
                <button
                  type="button"
                  onClick={() => onDelete(v)}
                  className="inline-flex items-center gap-2 border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export default JoinTeamAdmin;
