import React, { useState, useEffect, useRef, useMemo } from "react";
import Portal from "../../components/Portal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  MessageSquare,
  Image as ImageIcon,
  X,
  UploadCloud,
  Star,
  Bell,
  Check,
  Users,
  Target,
  Search,
  LayoutGrid,
  List,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  DollarSign,
  ExternalLink,
  Calendar,
  Mail,
} from "lucide-react";
import programService from "../../services/program.service";
import toast from "react-hot-toast";
import { TabLoader } from "../../components/TabLoader";
import { withMinDelay } from "../../utils/minDelay";
import { CustomSelect } from "../../components/CustomSelect";
import { cn } from "../../utils/cn";

const ITEMS_PER_PAGE = 12;
const money = (n) => `$${Number(n || 0).toLocaleString()}`;

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

const STATUS_BADGE = {
  published: "bg-accent text-white",
  hidden: "bg-gray-900/70 text-white",
  completed: "bg-primary text-white",
};

// Match the profile/settings underline "line" field aesthetic.
const labelCls = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500";
const lineInput =
  "w-full border-b border-gray-200 bg-transparent py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent";

// Cover image with a graceful empty state for missing OR broken-URL images.
function ProgramImage({ src, alt, compact = false }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="grid h-full w-full place-items-center bg-gray-50 text-gray-300">
      {compact ? (
        <ImageOff className="h-4 w-4" />
      ) : (
        <div className="flex flex-col items-center gap-1">
          <ImageOff className="h-7 w-7" />
          <span className="text-[10px] font-medium uppercase tracking-wide">No image</span>
        </div>
      )}
    </div>
  );
}

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

// Compact progress meter shared by grid + list.
function Progress({ raised, goal }) {
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-primary">{money(raised)}</span>
        <span className="text-text-muted">
          {pct}% of {money(goal)}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden bg-gray-100">
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Image Upload Zone (multi-image + cover) ────────────
function ImageUploadZone({ images, onAdd, onRemove, onSetCover, coverIndex, maxImages = 5, showCover = true }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const pick = () => inputRef.current?.click();
  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length) onAdd(files);
  };
  const dragProps = {
    onDragOver: (e) => {
      e.preventDefault();
      setDrag(true);
    },
    onDragLeave: () => setDrag(false),
    onDrop: handleDrop,
  };

  return (
    <div>
      {images.length === 0 ? (
        <button
          type="button"
          onClick={pick}
          {...dragProps}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1.5 border-2 border-dashed py-8 transition-colors",
            drag ? "border-accent bg-accent/5" : "border-gray-200 bg-gray-50 hover:border-accent/50",
          )}
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-accent shadow-sm ring-1 ring-gray-100">
            <UploadCloud className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium text-primary">Click or drag &amp; drop images</span>
          <span className="text-[11px] text-text-muted">PNG, JPG or WebP · up to {maxImages}</span>
        </button>
      ) : (
        <div {...dragProps} className={cn("grid grid-cols-5 gap-2", drag && "ring-2 ring-accent/40")}>
          {images.map((img, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden border border-gray-200">
              <img src={img.preview || img.url} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                {showCover && (
                  <button
                    type="button"
                    onClick={() => onSetCover(i)}
                    title="Set as cover"
                    className={cn(
                      "grid h-6 w-6 place-items-center text-white transition-colors",
                      coverIndex === i ? "bg-accent" : "bg-white/30 hover:bg-white/50",
                    )}
                  >
                    <Star className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  title="Remove"
                  className="grid h-6 w-6 place-items-center bg-red-500/80 text-white transition-colors hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {showCover && coverIndex === i && (
                <span className="absolute left-1 top-1 bg-accent px-1.5 py-0.5 text-[9px] font-medium text-white">
                  Cover
                </span>
              )}
            </div>
          ))}
          {images.length < maxImages && (
            <button
              type="button"
              onClick={pick}
              className="flex aspect-square flex-col items-center justify-center gap-0.5 border-2 border-dashed border-gray-300 text-text-muted transition-colors hover:border-accent/50 hover:text-accent"
            >
              <Plus className="h-4 w-4" />
              <span className="text-[10px]">Add</span>
            </button>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onAdd(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      <p className="mt-2 text-[11px] text-text-muted">
        {images.length}/{maxImages} added
        {showCover ? " · the starred image is the cover (hover a thumbnail to set it)." : "."}
      </p>
    </div>
  );
}

// ── Modal Wrapper ──────────────────────────────────────
function Modal({ children, onClose, title, subtitle, size = "md" }) {
  const widths = { md: "max-w-lg", lg: "max-w-2xl" };
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className={cn(
          "relative flex max-h-[90vh] w-full flex-col overflow-hidden border border-gray-100 bg-white shadow-2xl",
          widths[size],
        )}
        initial={{ scale: 0.96, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 16 }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-primary">{title}</h3>
            {subtitle && <p className="mt-0.5 truncate text-xs text-text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}

// ── Main ───────────────────────────────────────────────
export default function Programs() {
  // Start from the cached admin list if present — the loader only shows on the
  // very first, uncached open; cached revisits render instantly.
  const cached = programService.getCached();
  const [programs, setPrograms] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [requests, setRequests] = useState([]);

  // Toolbar
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState("grid"); // grid | list
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [followUpModal, setFollowUpModal] = useState(null);
  const [requestsPanel, setRequestsPanel] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // View (read-only details) — `viewModal` holds the clicked summary, `viewData`
  // the full program fetched on open (donors, updates, requests).
  const [viewModal, setViewModal] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewImageIdx, setViewImageIdx] = useState(0);

  // Row-level async
  const [togglingId, setTogglingId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Create / edit form
  const [form, setForm] = useState({ title: "", description: "", goalAmount: "", status: "published" });
  const [formImages, setFormImages] = useState([]);
  const [formCover, setFormCover] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Follow-up form
  const [fuText, setFuText] = useState("");
  const [fuImages, setFuImages] = useState([]);

  const fetchPrograms = async ({ force = false } = {}) => {
    try {
      const req = programService.listCached({ force });
      const data = await (loading ? withMinDelay(req) : req);
      setPrograms(data);
    } catch {
      toast.error("Failed to load programs");
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await programService.getFollowUpRequests();
      setRequests(res.data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!programService.getCached()) fetchPrograms();
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const pendingCount = requests.length;

  const stats = useMemo(() => {
    const published = programs.filter((p) => p.status === "published").length;
    const hidden = programs.filter((p) => p.status === "hidden").length;
    const raised = programs.reduce((s, p) => s + (p.raisedAmount || 0), 0);
    return { total: programs.length, published, hidden, raised };
  }, [programs]);

  const filtered = useMemo(
    () =>
      programs.filter((p) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !q || p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
        const matchesStatus = statusFilter === "all" || p.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [programs, searchTerm, statusFilter],
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── Image helpers ────────────────────────────────────
  const addLocalImages = (files, setter) => {
    const newImgs = files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setter((prev) => [...prev, ...newImgs].slice(0, 5));
  };

  const removeLocalImage = (idx, setter) => {
    setter((prev) => {
      const copy = [...prev];
      if (copy[idx]?.preview) URL.revokeObjectURL(copy[idx].preview);
      copy.splice(idx, 1);
      return copy;
    });
  };

  // ── Create ───────────────────────────────────────────
  const resetForm = () => {
    setForm({ title: "", description: "", goalAmount: "", status: "published" });
    setFormImages([]);
    setFormCover(0);
  };

  const handleCreate = async () => {
    if (!form.title || !form.goalAmount) return toast.error("Title and goal amount are required");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("goalAmount", form.goalAmount);
      fd.append("status", form.status);
      formImages.forEach((img) => fd.append("images", img.file));
      await programService.create(fd);
      toast.success("Program created");
      setCreateModal(false);
      resetForm();
      fetchPrograms({ force: true });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────
  const openEdit = (prog) => {
    setEditModal(prog);
    setForm({
      title: prog.title,
      description: prog.description || "",
      goalAmount: String(prog.goalAmount),
      status: prog.status,
    });
    setFormImages((prog.images || []).map((img) => ({ url: img.url, key: img.key })));
    setFormCover(prog.coverImageIndex || 0);
  };

  const handleEdit = async () => {
    if (!form.title || !form.goalAmount) return toast.error("Title and goal amount are required");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("goalAmount", form.goalAmount);
      fd.append("status", form.status);
      fd.append("coverImageIndex", String(formCover));

      const existingKeys = (editModal.images || []).map((i) => i.key);
      const currentKeys = formImages.filter((i) => i.key).map((i) => i.key);
      const removed = existingKeys.filter((k) => !currentKeys.includes(k));
      if (removed.length) fd.append("removedImageKeys", JSON.stringify(removed));

      formImages.filter((i) => i.file).forEach((img) => fd.append("images", img.file));

      await programService.update(editModal._id, fd);
      toast.success("Program updated");
      setEditModal(null);
      setFormImages([]);
      fetchPrograms({ force: true });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  // ── View details ─────────────────────────────────────
  const openView = async (prog) => {
    setViewModal(prog);
    setViewData(null);
    setViewImageIdx(prog.coverImageIndex || 0);
    setViewLoading(true);
    try {
      // admin=true so hidden programs are returned too.
      const res = await programService.getById(prog._id, { admin: "true" });
      setViewData(res.data);
      setViewImageIdx(res.data.coverImageIndex || 0);
    } catch {
      toast.error("Failed to load program details");
    } finally {
      setViewLoading(false);
    }
  };

  // ── Quick publish / hide toggle ──────────────────────
  const toggleStatus = async (prog) => {
    if (prog.status === "completed") return;
    const next = prog.status === "published" ? "hidden" : "published";
    setTogglingId(prog._id);
    try {
      const fd = new FormData();
      fd.append("status", next);
      await programService.update(prog._id, fd);
      setPrograms((prev) => prev.map((p) => (p._id === prog._id ? { ...p, status: next } : p)));
      programService.patchCache(prog._id, { status: next });
      toast.success(next === "published" ? "Program published" : "Program hidden");
    } catch {
      toast.error("Failed to update");
    } finally {
      setTogglingId(null);
    }
  };

  // ── Delete ───────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await programService.remove(deleteTarget._id);
      setPrograms((prev) => prev.filter((p) => p._id !== deleteTarget._id));
      toast.success("Program deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete program");
    } finally {
      setDeleting(false);
    }
  };

  // Hide the program instead of deleting it (offered from the delete dialog as
  // the safer choice for programs that already have donors).
  const hideFromDeleteModal = async () => {
    const prog = deleteTarget;
    setDeleteTarget(null);
    if (prog) await toggleStatus(prog);
  };

  // ── Follow-up ────────────────────────────────────────
  const handleFollowUp = async () => {
    if (!fuText.trim()) return toast.error("Update text is required");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("text", fuText);
      fuImages.forEach((img) => fd.append("images", img.file));
      await programService.postFollowUp(followUpModal._id, fd);
      toast.success("Update posted & donors notified");
      setFollowUpModal(null);
      setFuText("");
      setFuImages([]);
      fetchPrograms({ force: true });
      fetchRequests();
    } catch {
      toast.error("Failed to post update");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (programId, requestId) => {
    try {
      await programService.acknowledgeRequest(programId, requestId);
      toast.success("Request acknowledged");
      fetchRequests();
    } catch {
      toast.error("Failed");
    }
  };

  if (loading)
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading programs…" />
      </div>
    );

  // Small reusable icon-action button.
  const IconAction = ({ title, onClick, disabled, children, danger }) => (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      disabled={disabled}
      className={cn(
        "grid h-7 w-7 place-items-center text-gray-400 transition-colors disabled:opacity-50",
        danger ? "hover:bg-red-50 hover:text-red-500" : "hover:bg-gray-100 hover:text-primary",
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Programs</h1>
          <p className="mt-1 text-sm text-text-muted">Manage your fundraising programs.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRequestsPanel(true)}
            className="relative inline-flex items-center gap-2 border border-gray-200 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-gray-50"
          >
            <Bell className="h-4 w-4" /> Requests
            {pendingCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              resetForm();
              setCreateModal(true);
            }}
            className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
          >
            <Plus className="h-4 w-4" /> New program
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Target} label="Total programs" value={stats.total} tone="accent" />
        <StatCard icon={Eye} label="Published" value={stats.published} tone="accent" />
        <StatCard icon={EyeOff} label="Hidden" value={stats.hidden} tone="muted" />
        <StatCard icon={DollarSign} label="Total raised" value={money(stats.raised)} tone="accent" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search programs…"
            className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white"
          />
        </div>
        <CustomSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All status" },
            { value: "published", label: "Published" },
            { value: "hidden", label: "Hidden" },
            { value: "completed", label: "Completed" },
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
            <Target className="mx-auto mb-3 h-10 w-10 text-text-muted" />
            <p className="text-text-muted">
              {programs.length === 0
                ? 'No programs yet. Click "New program" to get started.'
                : "No programs match your filters."}
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
            {paginated.map((prog) => {
            const cover = prog.images?.[prog.coverImageIndex || 0];
            const isCompleted = prog.status === "completed";
            return (
              <motion.div
                key={prog._id}
                variants={cardVariants}
                onClick={() => openView(prog)}
                title="View details"
                className="group flex cursor-pointer flex-col overflow-hidden border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative h-40 shrink-0 overflow-hidden bg-gray-50">
                  <ProgramImage src={cover?.url} alt={prog.title} />
                  <span
                    className={cn(
                      "absolute left-1.5 top-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                      STATUS_BADGE[prog.status],
                    )}
                  >
                    {prog.status}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-3">
                  <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-primary">{prog.title}</h3>
                  <p className="mt-1 line-clamp-2 min-h-[30px] text-[11px] leading-snug text-text-muted">
                    {prog.description || "No description"}
                  </p>

                  <div className="mt-2.5">
                    <Progress raised={prog.raisedAmount} goal={prog.goalAmount} />
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-2.5">
                    <div className="flex items-center gap-2.5 text-[11px] text-text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {prog.donorCount ?? prog.donors?.length ?? 0}
                      </span>
                      {prog.images?.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {prog.images.length}
                        </span>
                      )}
                      {prog.pendingRequests > 0 && (
                        <span className="inline-flex items-center gap-1 font-medium text-accent">
                          <Bell className="h-3 w-3" />
                          {prog.pendingRequests}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {!isCompleted && (
                        <IconAction
                          title={prog.status === "published" ? "Hide program" : "Publish program"}
                          onClick={() => toggleStatus(prog)}
                          disabled={togglingId === prog._id}
                        >
                          {togglingId === prog._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : prog.status === "published" ? (
                            <Eye className="h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" />
                          )}
                        </IconAction>
                      )}
                      {!isCompleted && (
                        <IconAction
                          title="Post an update"
                          onClick={() => {
                            setFollowUpModal(prog);
                            setFuText("");
                            setFuImages([]);
                          }}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </IconAction>
                      )}
                      <IconAction title="Edit" onClick={() => openEdit(prog)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </IconAction>
                      <IconAction title="Delete" danger onClick={() => setDeleteTarget(prog)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconAction>
                    </div>
                  </div>
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
                  <tr className="border-b border-accent/10 bg-accent/5 text-left text-[11px] font-semibold uppercase tracking-wider text-accent">
                    <th className="px-4 py-3">Program</th>
                    <th className="w-56 px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Donors</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={listContainer}>
                  {paginated.map((prog) => {
                  const cover = prog.images?.[prog.coverImageIndex || 0];
                  const isCompleted = prog.status === "completed";
                  return (
                    <motion.tr
                      key={prog._id}
                      variants={rowVariants}
                      onClick={() => openView(prog)}
                      className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 shrink-0 overflow-hidden bg-gray-100">
                            <ProgramImage src={cover?.url} alt="" compact />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-primary">{prog.title}</p>
                            <p className="max-w-[320px] truncate text-xs text-text-muted">
                              {prog.description || "No description"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Progress raised={prog.raisedAmount} goal={prog.goalAmount} />
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">
                        {prog.donorCount ?? prog.donors?.length ?? 0}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-1 text-xs font-semibold capitalize",
                            prog.status === "published"
                              ? "bg-accent/10 text-accent"
                              : prog.status === "completed"
                                ? "bg-primary/10 text-primary"
                                : "bg-gray-100 text-gray-500",
                          )}
                        >
                          {prog.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {!isCompleted && (
                            <button
                              type="button"
                              title={prog.status === "published" ? "Hide program" : "Publish program"}
                              onClick={() => toggleStatus(prog)}
                              disabled={togglingId === prog._id}
                              className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-50"
                            >
                              {togglingId === prog._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : prog.status === "published" ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          {!isCompleted && (
                            <button
                              type="button"
                              title="Post an update"
                              onClick={() => {
                                setFollowUpModal(prog);
                                setFuText("");
                                setFuImages([]);
                              }}
                              className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => openEdit(prog)}
                            className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => setDeleteTarget(prog)}
                            className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "h-8 w-8 text-xs font-medium transition-colors",
                  currentPage === page ? "bg-accent text-white" : "text-text-muted hover:bg-gray-100",
                )}
              >
                {page}
              </button>
            ))}
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

      <Portal>
        <AnimatePresence>
        {/* ── Create / Edit Modal ──────────────────────── */}
        {(createModal || editModal) && (
          <Modal
            size="lg"
            title={editModal ? "Edit program" : "New program"}
            subtitle={editModal ? editModal.title : "Add a new fundraising program."}
            onClose={() => {
              setCreateModal(false);
              setEditModal(null);
            }}
          >
            <div className="space-y-6">
              <div>
                <label className={labelCls}>Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={lineInput}
                  placeholder="e.g., Build a Well"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Goal amount (USD) *</label>
                  <div className="flex items-center border-b border-gray-200 transition-colors focus-within:border-accent">
                    <span className="text-sm text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      value={form.goalAmount}
                      onChange={(e) => setForm((f) => ({ ...f, goalAmount: e.target.value }))}
                      className="w-full bg-transparent py-2.5 pl-1.5 text-sm text-gray-800 outline-none placeholder:text-gray-400"
                      placeholder="5000"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <CustomSelect
                    variant="line"
                    className="w-full"
                    value={form.status}
                    onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                    disabled={editModal?.status === "completed"}
                    options={
                      editModal
                        ? [
                            { value: "published", label: "Published" },
                            { value: "hidden", label: "Hidden" },
                            { value: "completed", label: "Completed" },
                          ]
                        : [
                            { value: "published", label: "Published" },
                            { value: "hidden", label: "Hidden" },
                          ]
                    }
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={cn(lineInput, "resize-none")}
                  placeholder="Describe your program…"
                />
              </div>

              <div>
                <label className={labelCls}>Images</label>
                <ImageUploadZone
                  images={formImages}
                  coverIndex={formCover}
                  onAdd={(files) => addLocalImages(files, setFormImages)}
                  onRemove={(idx) => {
                    removeLocalImage(idx, setFormImages);
                    if (formCover >= formImages.length - 1) setFormCover(0);
                  }}
                  onSetCover={setFormCover}
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                onClick={() => {
                  setCreateModal(false);
                  setEditModal(null);
                }}
                className="border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editModal ? handleEdit : handleCreate}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {submitting
                  ? editModal
                    ? "Saving…"
                    : "Creating…"
                  : editModal
                    ? "Save changes"
                    : "Create program"}
              </button>
            </div>
          </Modal>
        )}

        {/* ── Follow-Up Modal ──────────────────────────── */}
        {followUpModal && (
          <Modal
            title="Post an update"
            subtitle={`${followUpModal.title} · emailed to ${followUpModal.donorCount ?? followUpModal.donors?.length ?? 0} donors`}
            onClose={() => setFollowUpModal(null)}
          >
            <div className="space-y-6">
              <div>
                <label className={labelCls}>Update</label>
                <textarea
                  rows={4}
                  value={fuText}
                  onChange={(e) => setFuText(e.target.value)}
                  className={cn(lineInput, "resize-none")}
                  placeholder="Share progress with your donors…"
                />
              </div>
              <div>
                <label className={labelCls}>Attach images (optional)</label>
                <ImageUploadZone
                  images={fuImages}
                  coverIndex={-1}
                  showCover={false}
                  onAdd={(files) => addLocalImages(files, setFuImages)}
                  onRemove={(idx) => removeLocalImage(idx, setFuImages)}
                  onSetCover={() => {}}
                />
              </div>
            </div>
            <div className="mt-7 flex gap-3">
              <button
                onClick={() => setFollowUpModal(null)}
                className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFollowUp}
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center gap-2 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                {submitting ? "Posting…" : "Post & notify donors"}
              </button>
            </div>
          </Modal>
        )}

        {/* ── Follow-Up Requests Panel ─────────────────── */}
        {requestsPanel && (
          <Modal
            title="Follow-up requests"
            subtitle={`${pendingCount} pending`}
            onClose={() => setRequestsPanel(false)}
          >
            {requests.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-text-muted" />
                <p className="text-sm text-text-muted">No pending requests</p>
              </div>
            ) : (
              <div className="max-h-[60vh] space-y-3 overflow-y-auto">
                {requests.map((r) => (
                  <div key={r.requestId} className="border border-gray-100 bg-background p-3">
                    <div className="mb-1.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-primary">
                          {r.user?.name || r.user?.email || "Donor"}
                        </p>
                        <p className="truncate text-[11px] text-text-muted">{r.programTitle}</p>
                      </div>
                      <button
                        onClick={() => handleAcknowledge(r.programId, r.requestId)}
                        className="inline-flex shrink-0 items-center gap-1 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20"
                      >
                        <Check className="h-3 w-3" /> Acknowledge
                      </button>
                    </div>
                    {r.message && <p className="text-xs italic text-text-muted">"{r.message}"</p>}
                    <p className="mt-1 text-[10px] text-text-muted">
                      {new Date(r.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        )}

        {/* ── Program details (view) ───────────────────── */}
        {viewModal &&
          (() => {
            const p = viewData || viewModal;
            const images = p.images || [];
            const goal = p.goalAmount || 0;
            const raised = p.raisedAmount || 0;
            const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
            const donors = p.donors || [];
            const updates = viewData?.followUpUpdates || [];
            const pendingReqs = (viewData?.followUpRequests || []).filter((r) => r.status === "pending");
            const isCompleted = p.status === "completed";
            return (
              <Modal
                size="lg"
                title={p.title}
                subtitle={`${money(raised)} of ${money(goal)} · ${donors.length} ${donors.length === 1 ? "donor" : "donors"}`}
                onClose={() => setViewModal(null)}
              >
                {viewLoading && !viewData ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* status + public link */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-1 text-xs font-semibold capitalize",
                          p.status === "published"
                            ? "bg-accent/10 text-accent"
                            : p.status === "completed"
                              ? "bg-primary/10 text-primary"
                              : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {p.status}
                      </span>
                      <a
                        href={`/programs/${p._id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Open public page
                      </a>
                    </div>

                    {/* gallery */}
                    {images.length > 0 && (
                      <div>
                        <div className="h-56 w-full overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                          <ProgramImage src={images[viewImageIdx]?.url} alt={p.title} />
                        </div>
                        {images.length > 1 && (
                          <div className="mt-2 flex gap-2 overflow-x-auto">
                            {images.map((img, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setViewImageIdx(i)}
                                className={cn(
                                  "h-14 w-14 shrink-0 overflow-hidden rounded border-2 transition-all",
                                  viewImageIdx === i ? "border-accent" : "border-transparent opacity-70 hover:opacity-100",
                                )}
                              >
                                <img src={img.url} alt="" className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* progress + quick stats */}
                    <div className="border border-gray-100 bg-background p-4">
                      <div className="mb-2 flex items-end justify-between">
                        <div>
                          <p className="text-xl font-bold text-primary">{money(raised)}</p>
                          <p className="text-xs text-text-muted">raised of {money(goal)} goal</p>
                        </div>
                        <span className="text-lg font-bold text-accent">{pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                        <div>
                          <Users className="mx-auto mb-1 h-4 w-4 text-accent" />
                          <p className="text-sm font-semibold text-primary">{donors.length}</p>
                          <p className="text-[10px] text-text-muted">Donors</p>
                        </div>
                        <div>
                          <DollarSign className="mx-auto mb-1 h-4 w-4 text-accent" />
                          <p className="text-sm font-semibold text-primary">{money(Math.max(0, goal - raised))}</p>
                          <p className="text-[10px] text-text-muted">Remaining</p>
                        </div>
                        <div>
                          <Calendar className="mx-auto mb-1 h-4 w-4 text-accent" />
                          <p className="text-sm font-semibold text-primary">
                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                          </p>
                          <p className="text-[10px] text-text-muted">Created</p>
                        </div>
                      </div>
                    </div>

                    {/* description */}
                    {p.description && (
                      <div>
                        <h4 className={labelCls}>Description</h4>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{p.description}</p>
                      </div>
                    )}

                    {/* donors */}
                    <div>
                      <h4 className={labelCls}>Donors ({donors.length})</h4>
                      {donors.length === 0 ? (
                        <p className="text-sm text-text-muted">No donors yet.</p>
                      ) : (
                        <div className="max-h-44 space-y-1 overflow-y-auto">
                          {donors.map((d, i) => (
                            <div key={i} className="flex items-center gap-2 border border-gray-100 px-3 py-1.5 text-sm">
                              <Mail className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                              <span className="truncate text-gray-700">{d.email || "—"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* updates */}
                    {updates.length > 0 && (
                      <div>
                        <h4 className={labelCls}>Updates ({updates.length})</h4>
                        <div className="space-y-2">
                          {[...updates]
                            .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
                            .map((u, i) => (
                              <div key={i} className="border-l-2 border-accent/30 bg-background/50 py-2 pl-3 pr-2">
                                <p className="text-sm text-gray-700">{u.text}</p>
                                {u.images?.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {u.images.map((src, k) => (
                                      <img key={k} src={src} alt="" className="h-16 w-16 rounded border border-gray-200 object-cover" />
                                    ))}
                                  </div>
                                )}
                                <p className="mt-1 text-[11px] text-text-muted">{new Date(u.sentAt).toLocaleDateString()}</p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* pending requests */}
                    {pendingReqs.length > 0 && (
                      <div>
                        <h4 className={labelCls}>Pending follow-up requests ({pendingReqs.length})</h4>
                        <div className="space-y-1.5">
                          {pendingReqs.map((r, i) => (
                            <div key={i} className="border border-gray-100 bg-background px-3 py-2 text-sm">
                              <p className="text-gray-700">
                                {r.message || <span className="italic text-text-muted">No message</span>}
                              </p>
                              <p className="mt-0.5 text-[11px] text-text-muted">
                                {r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* footer actions */}
                <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
                  {!isCompleted && (
                    <button
                      onClick={() => {
                        const prog = p;
                        setViewModal(null);
                        setFollowUpModal(prog);
                        setFuText("");
                        setFuImages([]);
                      }}
                      className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <MessageSquare className="h-4 w-4" /> Post update
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const prog = p;
                      setViewModal(null);
                      openEdit(prog);
                    }}
                    className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
                  >
                    <Pencil className="h-4 w-4" /> Edit program
                  </button>
                </div>
              </Modal>
            );
          })()}

        {/* ── Delete confirmation ──────────────────────── */}
        {deleteTarget && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
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
              <h3 className="text-base font-semibold text-primary">Delete “{deleteTarget.title}”?</h3>
              <p className="mt-1 text-sm text-text-muted">
                This permanently removes the program and its images. This can't be undone.
              </p>

              {(deleteTarget.donorCount ?? deleteTarget.donors?.length ?? 0) > 0 && (
                <div className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2 text-left">
                  <p className="text-xs font-medium text-amber-700">
                    {deleteTarget.donorCount ?? deleteTarget.donors?.length}{" "}
                    {(deleteTarget.donorCount ?? deleteTarget.donors?.length) === 1 ? "donor has" : "donors have"}{" "}
                    contributed{deleteTarget.raisedAmount ? ` (${money(deleteTarget.raisedAmount)} raised)` : ""}.
                    Deleting drops this campaign from your records.
                    {deleteTarget.status === "published" && " Hiding keeps it but removes it from your public site."}
                  </p>
                </div>
              )}

              <div className="mt-5 space-y-2.5">
                {deleteTarget.status === "published" && (
                  <button
                    type="button"
                    onClick={hideFromDeleteModal}
                    disabled={deleting || togglingId === deleteTarget._id}
                    className="inline-flex w-full items-center justify-center gap-2 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
                  >
                    <EyeOff className="h-4 w-4" /> Hide instead
                  </button>
                )}
                <div className="flex gap-3">
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
                    className="inline-flex flex-1 items-center justify-center gap-2 border border-red-200 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}
