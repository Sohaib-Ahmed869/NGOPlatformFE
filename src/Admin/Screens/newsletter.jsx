import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "../../components/Portal";
import { toast } from "react-hot-toast";
import {
  Search,
  Download,
  Mail,
  MailX,
  MailCheck,
  Users,
  UserX,
  Clock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LayoutGrid,
  List,
  Trash2,
} from "lucide-react";
import { Send, Plug } from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { CustomSelect } from "../../components/CustomSelect";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import newsletterService from "../../services/newsletter.service";
import NewsletterCampaigns from "./NewsletterCampaigns";

const PER_PAGE = 15;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

// A subscriber is active unless explicitly unsubscribed (status defaults to
// "active" on the backend).
const isActive = (s) => s?.status !== "unsubscribed";

// Entrance/exit motion — a coordinated stagger so cards/rows appear smoothly,
// plus a clean cross-fade when switching between grid and list (the content is
// keyed by view+page, so it replays on open, view-switch and pagination).
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
      <div>
        <p className="text-lg font-bold leading-none text-primary">{value}</p>
        <p className="mt-1 text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold",
        active ? "bg-accent/10 text-accent" : "bg-red-50 text-red-600",
      )}
    >
      {active ? <Mail className="h-3 w-3" /> : <MailX className="h-3 w-3" />}
      {active ? "Active" : "Unsubscribed"}
    </span>
  );
}

// Toggle (unsubscribe / re-activate) + delete — shared by the card and row.
function RowActions({ sub, toggling, onToggle, onDelete, size = "sm" }) {
  const active = isActive(sub);
  const btn = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onToggle(sub)}
        disabled={toggling}
        title={active ? "Unsubscribe" : "Re-activate"}
        className={cn(
          "grid place-items-center text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-50",
          btn,
        )}
      >
        {toggling ? (
          <Loader2 className={cn(icon, "animate-spin")} />
        ) : active ? (
          <MailX className={icon} />
        ) : (
          <MailCheck className={icon} />
        )}
      </button>
      <button
        type="button"
        onClick={() => onDelete(sub)}
        title="Delete"
        className={cn(
          "grid place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500",
          btn,
        )}
      >
        <Trash2 className={icon} />
      </button>
    </div>
  );
}

const NewsletterSubscribersScreen = () => {
  const cached = newsletterService.getCached();
  const [subscribers, setSubscribers] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | unsubscribed
  const [view, setView] = useState("list"); // grid | list
  const [currentPage, setCurrentPage] = useState(1);
  const [exportLoading, setExportLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Only hit the API when we don't already have the list cached.
    if (newsletterService.getCached()) return;
    const fetchSubscribers = async () => {
      try {
        setLoading(true);
        const data = await withMinDelay(newsletterService.list());
        setSubscribers(data);
      } catch {
        setError("Failed to fetch subscribers");
      } finally {
        setLoading(false);
      }
    };
    fetchSubscribers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const active = subscribers.filter(isActive).length;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const recent = subscribers.filter((s) => s.createdAt && new Date(s.createdAt) >= oneMonthAgo).length;
    return {
      total: subscribers.length,
      active,
      unsubscribed: subscribers.length - active,
      recent,
    };
  }, [subscribers]);

  const filtered = useMemo(
    () =>
      subscribers.filter((s) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch = !q || s.email?.toLowerCase().includes(q);
        const active = isActive(s);
        const matchesStatus =
          statusFilter === "all" || (statusFilter === "active" ? active : !active);
        return matchesSearch && matchesStatus;
      }),
    [subscribers, searchTerm, statusFilter],
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const toggleStatus = async (sub) => {
    const next = isActive(sub) ? "unsubscribed" : "active";
    setTogglingId(sub._id);
    try {
      await newsletterService.setStatus(sub._id, next);
      setSubscribers((prev) => prev.map((s) => (s._id === sub._id ? { ...s, status: next } : s)));
      toast.success(next === "unsubscribed" ? "Subscriber unsubscribed" : "Subscriber re-activated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update subscriber");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await newsletterService.remove(deleteTarget._id);
      setSubscribers((prev) => prev.filter((s) => s._id !== deleteTarget._id));
      toast.success("Subscriber deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete subscriber");
    } finally {
      setDeleting(false);
    }
  };

  const exportToCSV = () => {
    try {
      setExportLoading(true);
      const header = "Email,Joined Date,Status";
      const rows = filtered.map((s) => {
        const date = s.createdAt ? new Date(s.createdAt).toISOString().split("T")[0] : "";
        const status = isActive(s) ? "Active" : "Unsubscribed";
        return `"${s.email}","${date}","${status}"`;
      });
      const csv = [header, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      /* ignore */
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading subscribers…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-3 text-red-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-light"
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
          <h1 className="text-2xl font-bold text-primary">Newsletter</h1>
          <p className="mt-1 text-sm text-text-muted">Manage your email subscribers.</p>
        </div>
        <button
          type="button"
          onClick={exportToCSV}
          disabled={exportLoading || filtered.length === 0}
          className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
        >
          {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total subscribers" value={stats.total} tone="accent" />
        <StatCard icon={Mail} label="Active" value={stats.active} tone="accent" />
        <StatCard icon={UserX} label="Unsubscribed" value={stats.unsubscribed} tone="muted" />
        <StatCard icon={Clock} label="This month" value={stats.recent} tone="accent" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by email…"
            className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white"
          />
        </div>
        <CustomSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All status" },
            { value: "active", label: "Active" },
            { value: "unsubscribed", label: "Unsubscribed" },
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
            <Mail className="mx-auto mb-3 h-10 w-10 text-text-muted" />
            <p className="text-text-muted">
              {subscribers.length === 0
                ? "No subscribers yet."
                : "No subscribers match your filters."}
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
            {paginated.map((sub, i) => {
              const active = isActive(sub);
              return (
                <motion.div
                  key={sub._id || i}
                  variants={cardVariants}
                  className="group flex flex-col border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/10 text-sm font-bold uppercase text-accent">
                      {sub.email?.charAt(0) || "?"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-primary" title={sub.email}>
                        {sub.email}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-text-muted">
                        <CalendarDays className="h-3 w-3 shrink-0" /> {fmtDate(sub.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
                    <StatusBadge active={active} />
                    <RowActions
                      sub={sub}
                      toggling={togglingId === sub._id}
                      onToggle={toggleStatus}
                      onDelete={setDeleteTarget}
                    />
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
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={listContainer}>
                  {paginated.map((sub, i) => {
                    const active = isActive(sub);
                    return (
                      <motion.tr
                        key={sub._id || i}
                        variants={rowVariants}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-bold uppercase text-accent">
                              {sub.email?.charAt(0) || "?"}
                            </span>
                            <p className="truncate font-medium text-primary">{sub.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-text-muted">{fmtDate(sub.createdAt)}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge active={active} />
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end">
                            <RowActions
                              sub={sub}
                              toggling={togglingId === sub._id}
                              onToggle={toggleStatus}
                              onDelete={setDeleteTarget}
                              size="md"
                            />
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
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !deleting && setDeleteTarget(null)}
            />
            <motion.div
              className="relative w-full max-w-sm border border-gray-100 bg-white p-6 text-center shadow-2xl"
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
            >
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-50">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-primary">Delete subscriber?</h3>
              <p className="mt-1 break-words text-sm text-text-muted">
                <span className="font-medium text-primary">{deleteTarget.email}</span> will be permanently
                removed. This can't be undone.
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

// Top-level Newsletter screen: a tab switch between the subscribers list and the
// campaigns (compose/send) area.
function Newsletter() {
  const [tab, setTab] = useState("subscribers");
  const tabs = [
    { id: "subscribers", label: "Subscribers", icon: Users },
    { id: "campaigns", label: "Campaigns", icon: Send },
  ];
  return (
    <div className="w-full">
      <div className="mb-5 flex items-center gap-1 border-b border-gray-100 dark:border-white/10">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                active ? "text-accent" : "text-text-muted hover:text-primary",
              )}
            >
              <Icon className="h-4 w-4" /> {t.label}
              {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" /> : null}
            </button>
          );
        })}
      </div>
      {tab === "campaigns" ? (
        <NewsletterCampaigns />
      ) : (
        <NewsletterSubscribersScreen />
      )}
    </div>
  );
}

export default Newsletter;
