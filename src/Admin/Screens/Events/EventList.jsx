import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "../../../components/Portal";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Search,
  Plus,
  Calendar,
  CalendarCheck,
  Clock,
  CheckCircle,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Users,
  ImageOff,
} from "lucide-react";
import eventsService from "../../../services/events.service";
import { TabLoader } from "../../../components/TabLoader";
import { withMinDelay } from "../../../utils/minDelay";
import { cn } from "../../../utils/cn";
import { CustomSelect } from "../../../components/CustomSelect";
import {
  EVENT_TYPES,
  STATUS_OPTIONS,
  STATUS_BADGE,
  STATUS_LABELS,
  eventTypeDisplay,
} from "./eventConstants";

const ITEMS_PER_PAGE = 15;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const fadeWrap = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

// Staggered table-row entrance — replays on load, page change and sort.
const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

function StatCard({ icon: Icon, label, value, tone = "accent" }) {
  const tones = {
    accent: "bg-accent/10 text-accent",
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-600",
    green: "bg-green-100 text-green-600",
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

function EventThumb({ src }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setFailed(true)} />;
  }
  return (
    <div className="grid h-full w-full place-items-center bg-gray-50 text-gray-300">
      <ImageOff className="h-4 w-4" />
    </div>
  );
}

function regsDisplay(e) {
  if (e.registrationMode === "internal") {
    return `${e.registrationCount || 0}${e.capacity ? ` / ${e.capacity}` : ""}`;
  }
  if (e.registrationMode === "external") return "Link";
  return "—";
}

const EventList = () => {
  const navigate = useNavigate();
  const cached = eventsService.getCached();
  const [events, setEvents] = useState(cached?.events || []);
  const [loading, setLoading] = useState(!cached);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!eventsService.getCached()) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await withMinDelay(eventsService.getAll());
      setEvents(data.events || []);
    } catch {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await eventsService.remove(deleteTarget._id);
      setEvents((prev) => prev.filter((e) => e._id !== deleteTarget._id));
      toast.success("Event deleted");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete event");
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const by = (s) => events.filter((e) => e.status === s).length;
    return { total: events.length, upcoming: by("upcoming"), ongoing: by("ongoing"), completed: by("completed") };
  }, [events]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    let list = events.filter((e) => {
      const matchesSearch =
        !q ||
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        eventTypeDisplay(e).toLowerCase().includes(q) ||
        e.location?.city?.toLowerCase().includes(q) ||
        e.location?.venue?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      const matchesType = typeFilter === "all" || e.eventType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
    list = [...list].sort((a, b) => {
      let av, bv;
      switch (sortField) {
        case "title":
          av = (a.title || "").toLowerCase();
          bv = (b.title || "").toLowerCase();
          return av < bv ? (sortDir === "asc" ? -1 : 1) : av > bv ? (sortDir === "asc" ? 1 : -1) : 0;
        case "eventType":
          av = eventTypeDisplay(a).toLowerCase();
          bv = eventTypeDisplay(b).toLowerCase();
          return av < bv ? (sortDir === "asc" ? -1 : 1) : av > bv ? (sortDir === "asc" ? 1 : -1) : 0;
        case "status":
          av = a.status || "";
          bv = b.status || "";
          return av < bv ? (sortDir === "asc" ? -1 : 1) : av > bv ? (sortDir === "asc" ? 1 : -1) : 0;
        case "date":
        default:
          av = a.date ? new Date(a.date).getTime() : 0;
          bv = b.date ? new Date(b.date).getTime() : 0;
          return sortDir === "asc" ? av - bv : bv - av;
      }
    });
    return list;
  }, [events, searchTerm, statusFilter, typeFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-gray-300" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-accent" />
    ) : (
      <ChevronDown className="h-3 w-3 text-accent" />
    );
  };
  const Th = ({ field, children, className }) => (
    <th
      className={cn(
        "cursor-pointer select-none px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-current transition-colors hover:text-primary",
        className
      )}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <SortIcon field={field} />
      </span>
    </th>
  );

  const StatusBadge = ({ status }) => (
    <span className={cn("inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full", STATUS_BADGE[status] || "bg-gray-100 text-gray-700")}>
      {STATUS_LABELS[status] || status}
    </span>
  );

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading events…" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Events</h1>
          <p className="mt-1 text-sm text-text-muted">Create events, collect RSVPs, and track attendance.</p>
        </div>
        <Link
          to="/admin/events/new"
          className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
        >
          <Plus className="h-4 w-4" /> Add event
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Calendar} label="Total events" value={stats.total} tone="accent" />
        <StatCard icon={CalendarCheck} label="Upcoming" value={stats.upcoming} tone="blue" />
        <StatCard icon={Clock} label="Ongoing" value={stats.ongoing} tone="amber" />
        <StatCard icon={CheckCircle} label="Completed" value={stats.completed} tone="green" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, type, city…"
            className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white"
          />
        </div>
        <CustomSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ value: "all", label: "All status" }, ...STATUS_OPTIONS]}
          triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          className="sm:min-w-[150px]"
        />
        <CustomSelect
          value={typeFilter}
          onChange={setTypeFilter}
          options={[{ value: "all", label: "All types" }, ...EVENT_TYPES]}
          triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          className="sm:min-w-[150px]"
        />
      </div>

      {/* Table */}
      <AnimatePresence mode="wait">
        {paginated.length === 0 ? (
          <motion.div key="empty" variants={fadeWrap} initial="hidden" animate="show" exit="exit" className="border border-gray-100 bg-white p-12 text-center shadow-sm">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-text-muted" />
            <p className="text-text-muted">
              {events.length === 0 ? 'No events yet. Click "Add event" to get started.' : "No events match your filters."}
            </p>
          </motion.div>
        ) : (
          <motion.div key={`tbl-${currentPage}`} variants={fadeWrap} initial="hidden" animate="show" exit="exit" className="overflow-hidden border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-accent/10 bg-accent/5 text-left text-[11px] font-semibold uppercase tracking-wider text-accent">
                    <Th field="title">Event</Th>
                    <Th field="eventType">Type</Th>
                    <Th field="date">Date</Th>
                    <Th field="status">Status</Th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-current">Regs</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-current">Actions</th>
                  </tr>
                </thead>
                <motion.tbody
                  key={`${currentPage}-${sortField}-${sortDir}`}
                  variants={listContainer}
                  initial="hidden"
                  animate="show"
                >
                  {paginated.map((e) => (
                    <motion.tr
                      key={e._id}
                      variants={rowVariants}
                      className="cursor-pointer border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50/60"
                      onClick={() => navigate(`/admin/events/${e._id}`, { state: { event: e } })}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-12 shrink-0 overflow-hidden bg-gray-100">
                            <EventThumb src={e.imageUrl} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-primary">{e.title}</p>
                            <p className="max-w-[280px] truncate text-xs text-text-muted">
                              {[e.location?.venue, e.location?.city].filter(Boolean).join(", ") || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">{eventTypeDisplay(e)}</td>
                      <td className="px-4 py-2.5 text-text-muted">
                        {fmtDate(e.date)}
                        {e.startTime ? <span className="text-gray-400"> · {e.startTime}</span> : null}
                      </td>
                      <td className="px-4 py-2.5"><StatusBadge status={e.status} /></td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-text-muted">
                          {e.registrationMode === "internal" && <Users className="h-3.5 w-3.5 text-gray-400" />}
                          {regsDisplay(e)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/admin/events/${e._id}`} state={{ event: e }} title="View" className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent">
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link to={`/admin/events/edit/${e._id}`} state={{ event: e }} title="Edit" className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button type="button" onClick={() => setDeleteTarget(e)} title="Delete" className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
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
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} type="button" onClick={() => setCurrentPage(page)} className={cn("h-8 w-8 text-xs font-medium transition-colors", currentPage === page ? "bg-accent text-white" : "text-text-muted hover:bg-gray-100")}>
                {page}
              </button>
            ))}
            <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <Portal>
      <AnimatePresence>
        {deleteTarget && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
            <motion.div className="relative w-full max-w-sm border border-gray-100 bg-white p-6 text-center shadow-2xl" initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-50">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-primary">Delete “{deleteTarget.title}”?</h3>
              <p className="mt-1 text-sm text-text-muted">This also removes all its registrations. This can't be undone.</p>
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50">
                  Cancel
                </button>
                <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex flex-1 items-center justify-center gap-2 bg-red-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50">
                  {deleting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Trash2 className="h-4 w-4" />}
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

export default EventList;
