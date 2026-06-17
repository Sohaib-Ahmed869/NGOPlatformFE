import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "../../components/Portal";
import { toast } from "react-hot-toast";
import {
  Search,
  RefreshCw,
  Inbox,
  Plus,
  X,
  Trash2,
  Paperclip,
  Tag,
  Flag,
  Clock,
  Send,
  Lock,
  Mail,
  ArrowLeft,
  Loader2,
  LifeBuoy,
  CornerUpLeft,
  AlertTriangle,
  Users as UsersIcon,
  Star,
  Sparkles,
  FileText,
  MessageCircle,
  HandHeart,
  KeyRound,
  Wrench,
  ThumbsUp,
  HelpCircle,
  Bug,
  Lightbulb,
  ShieldCheck,
  Database,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { CustomSelect } from "../../components/CustomSelect";
import { RichTextEditor, sanitizeRichText } from "../../components/RichTextEditor";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import supportService from "../../services/support.service";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../services/socket";
import TicketAttachments from "../../components/TicketAttachments";
import { ADMIN_SUPPORT_CATEGORIES, supportCategoryLabel } from "../../config/supportCategories";

/* ── config ──────────────────────────────────────────────────────────── */

const STATUSES = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "on_hold", label: "On hold" },
  { value: "solved", label: "Solved" },
  { value: "declined", label: "Declined" },
];
const STATUS_BADGE = {
  new: "bg-accent/10 text-accent",
  in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  on_hold: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70",
  solved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  declined: "bg-red-500/10 text-red-600 dark:text-red-400",
};
const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];
const PRIORITY_BADGE = {
  low: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/60",
  medium: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  critical: "bg-red-500/10 text-red-600 dark:text-red-400",
};
const label = (s) => String(s || "").replace(/_/g, " ");
const CATEGORIES = ADMIN_SUPPORT_CATEGORIES; // friendly labels, full enum (shared)
const statusLabel = (s) => STATUSES.find((x) => x.value === s)?.label || label(s);

// Icon per category — powers the tile picker in the New-ticket modal.
const CATEGORY_ICONS = {
  general: MessageCircle,
  billing: HandHeart,
  account: KeyRound,
  technical: Wrench,
  feedback: ThumbsUp,
  other: HelpCircle,
  bug_report: Bug,
  feature_request: Lightbulb,
  access: ShieldCheck,
  data: Database,
};
// Accent colour per priority — coloured dot on the segmented pill row.
const PRIORITY_DOT = {
  low: "bg-gray-400",
  medium: "bg-sky-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};
// Underline field style — shared with the public/customer support forms.
const fieldCls =
  "w-full border-b border-gray-200 bg-transparent py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent dark:border-white/10 dark:text-white";
const MAX_FILE_MB = 10;

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
function timeAgo(d) {
  if (!d) return "";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Avatar({ name, src, size = "md" }) {
  const s = size === "xs" ? "h-5 w-5 text-[9px]" : size === "sm" ? "h-7 w-7 text-[11px]" : "h-10 w-10 text-sm";
  if (src) return <img src={src} alt={name || ""} className={cn("shrink-0 rounded-full object-cover", s)} />;
  return <span className={cn("grid shrink-0 place-items-center rounded-full bg-accent/10 font-bold uppercase text-accent", s)}>{(name || "?").charAt(0)}</span>;
}
const Badge = ({ cls, children }) => <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", cls)}>{children}</span>;
const isRichEmpty = (html) => !sanitizeRichText(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;| /g, " ").trim();

/* ── main ────────────────────────────────────────────────────────────── */

export default function SupportTickets() {
  const { user } = useAuth();
  const myId = user?._id || user?.id || null;
  const myEmail = (user?.email || "").toLowerCase();
  const isMine = useCallback(
    (author) => !!author && ((myId && author._id === myId) || (author.email && author.email.toLowerCase() === myEmail)),
    [myId, myEmail],
  );

  const cached = supportService.getCached();
  const [tickets, setTickets] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [team, setTeam] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [composer, setComposer] = useState("");
  const [composerKind, setComposerKind] = useState("note"); // note | reply
  const [composerMentions, setComposerMentions] = useState([]);
  const [composerNonce, setComposerNonce] = useState(0);
  const [sending, setSending] = useState(false);
  const [attaching, setAttaching] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ summary: "", description: "", priority: "medium", category: "general" });
  const [creating, setCreating] = useState(false);
  const [createFile, setCreateFile] = useState(null);
  const [createDrag, setCreateDrag] = useState(false);
  const createFileRef = useRef(null);

  const bottomRef = useRef(null);
  const selectedIdRef = useRef(null);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  /* data loading */
  const load = useCallback(async ({ force = false } = {}) => {
    if (force) setRefreshing(true);
    try {
      setTickets(await supportService.list({ force }));
    } catch {
      toast.error("Failed to load tickets");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (supportService.getCached()) {
      load({ force: true }); // instant cache render + silent revalidate
    } else {
      (async () => {
        try {
          setTickets(await withMinDelay(supportService.list()));
        } catch {
          toast.error("Failed to load tickets");
        } finally {
          setLoading(false);
        }
      })();
    }
    supportService.team().then(setTeam).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the session cache in step with optimistic/socket updates.
  useEffect(() => { if (supportService.getCached()) supportService.setCache(tickets); }, [tickets]);

  /* real-time */
  useEffect(() => {
    const socket = getSocket();
    const refetch = () => load({ force: true });
    const onUpdate = (p) => {
      load({ force: true });
      if (p?.id && selectedIdRef.current === p.id) {
        supportService.get(p.id).then((r) => setDetail(r.data.ticket)).catch(() => {});
      }
    };
    socket.on("ticket:new", refetch);
    socket.on("ticket:update", onUpdate);
    return () => {
      socket.off("ticket:new", refetch);
      socket.off("ticket:update", onUpdate);
    };
  }, [load]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [detail?.comments?.length, selectedId]);

  /* selection */
  const openTicket = useCallback(async (t) => {
    setSelectedId(t._id);
    setComposer("");
    setComposerKind("note");
    setComposerMentions([]);
    setLoadingDetail(true);
    try {
      const res = await supportService.get(t._id);
      setDetail(res.data.ticket);
    } catch {
      toast.error("Failed to open ticket");
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const patchTicketInList = (id, patch) => setTickets((prev) => prev.map((t) => (t._id === id ? { ...t, ...patch } : t)));

  /* actions */
  const composerEmpty = useMemo(() => isRichEmpty(composer), [composer]);

  const handleSend = async () => {
    if (composerEmpty || !selectedId || sending) return;
    const message = sanitizeRichText(composer);
    setSending(true);
    try {
      const res = await supportService.comment(selectedId, { message, isInternal: composerKind === "note" });
      setDetail(res.data.ticket);
      patchTicketInList(selectedId, { status: res.data.ticket.status });
      setComposer("");
      setComposerMentions([]);
      setComposerNonce((n) => n + 1);
      if (composerKind === "reply") {
        res.data.emailStatus === "failed"
          ? toast.error("Note saved, but the email to the reporter failed to send.")
          : toast.success("Reply sent to the reporter");
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const setField = async (field, value) => {
    const id = selectedId;
    setDetail((d) => (d ? { ...d, [field]: value } : d));
    patchTicketInList(id, { [field]: value });
    try {
      if (field === "status") await supportService.setStatus(id, { status: value });
      else await supportService.update(id, { [field]: value });
    } catch {
      toast.error("Failed to update");
      load({ force: true });
    }
  };

  const handleAssign = async (val) => {
    const id = selectedId;
    try {
      const res = await supportService.assign(id, val || null);
      setDetail((d) => (d ? { ...d, assignee: res.data.ticket.assignee } : d));
      patchTicketInList(id, { assignee: res.data.ticket.assignee });
    } catch {
      toast.error("Failed to assign");
    }
  };

  const uploadAttachment = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setAttaching(true);
    try {
      const fd = new FormData();
      fd.append("attachment", f);
      const res = await supportService.addAttachment(detail._id, fd);
      setDetail(res.data.ticket);
      toast.success("Attached");
    } catch {
      toast.error("Failed to attach");
    } finally {
      setAttaching(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supportService.remove(deleteTarget._id);
      setTickets((prev) => prev.filter((t) => t._id !== deleteTarget._id));
      if (selectedId === deleteTarget._id) { setSelectedId(null); setDetail(null); }
      toast.success("Ticket deleted");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const pickCreateFile = (f) => {
    if (!f) return;
    if (f.size > MAX_FILE_MB * 1024 * 1024) return toast.error(`File must be under ${MAX_FILE_MB}MB`);
    setCreateFile(f);
  };

  const handleCreate = async () => {
    if (!createForm.summary.trim()) return toast.error("A summary is required");
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append("summary", createForm.summary);
      fd.append("description", createForm.description);
      fd.append("priority", createForm.priority);
      fd.append("category", createForm.category);
      if (createFile) fd.append("attachment", createFile);
      const res = await supportService.create(fd);
      toast.success("Ticket created");
      setCreateOpen(false);
      setCreateForm({ summary: "", description: "", priority: "medium", category: "general" });
      setCreateFile(null);
      await load({ force: true });
      openTicket(res.data.ticket);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to create ticket");
    } finally {
      setCreating(false);
    }
  };

  /* derived */
  const visible = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return tickets
      .filter((t) => {
        const matchesSearch = !q || t.summary?.toLowerCase().includes(q) || t.reporter?.name?.toLowerCase().includes(q) || t.reporter?.email?.toLowerCase().includes(q);
        const matchesStatus = statusFilter === "all" || (t.status || "new") === statusFilter;
        const matchesPriority = priorityFilter === "all" || (t.priority || "medium") === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }, [tickets, searchTerm, statusFilter, priorityFilter]);

  const openCount = useMemo(() => tickets.filter((t) => ["new", "in_progress", "on_hold"].includes(t.status)).length, [tickets]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading tickets…" />
      </div>
    );
  }

  const teamOptions = [{ value: "", label: "Unassigned" }, ...team.map((t) => ({ value: t._id, label: t.name || t.email }))];
  const sel = detail;

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[540px] gap-4">
      {/* ── Left: inbox list ── */}
      <div className={cn("flex w-full flex-col overflow-hidden rounded-token border border-gray-100 bg-white shadow-sm dark:border-white/10 lg:w-[360px] lg:shrink-0", selectedId && "hidden lg:flex")}>
        <div className="shrink-0 border-b border-gray-100 p-4 dark:border-white/10">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-bold text-primary"><LifeBuoy className="h-5 w-5" /> Support Tickets</h1>
              <p className="text-[11px] text-text-muted">{tickets.length} total{openCount > 0 ? ` · ${openCount} open` : ""}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1 rounded-token-btn bg-accent px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-light"><Plus className="h-3.5 w-3.5" /> New</button>
              <button type="button" onClick={() => load({ force: true })} disabled={refreshing} title="Refresh" className="grid h-9 w-9 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-50 dark:hover:bg-white/10">
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </button>
            </div>
          </div>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search summary, reporter…" className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white dark:border-white/10 dark:bg-white/5" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <CustomSelect value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All status" }, ...STATUSES]} triggerClassName="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]" />
            <CustomSelect value={priorityFilter} onChange={setPriorityFilter} options={[{ value: "all", label: "All priority" }, ...PRIORITIES]} triggerClassName="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <Inbox className="mb-3 h-9 w-9 text-text-muted" />
              <p className="text-sm text-text-muted">{tickets.length === 0 ? "No tickets yet." : "No tickets match your filters."}</p>
            </div>
          ) : (
            visible.map((t) => (
              <button
                key={t._id}
                type="button"
                onClick={() => openTicket(t)}
                style={selectedId === t._id ? { backgroundColor: "rgba(var(--tenant-accent-rgb, 201, 168, 76), 0.16)" } : undefined}
                className={cn("relative flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors dark:border-white/5", selectedId !== t._id && "hover:bg-gray-50/70 dark:hover:bg-white/5")}
              >
                {selectedId === t._id ? <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: "var(--tenant-accent, #C9A84C)" }} aria-hidden="true" /> : null}
                <Avatar name={t.reporter?.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-sm font-semibold", selectedId === t._id ? "text-accent" : "text-primary")}>
                      <span className="font-mono text-[11px] font-normal text-text-muted">#{t.ticketNumber} </span>{t.summary}
                    </p>
                    <span className="shrink-0 text-[10px] text-text-muted">{timeAgo(t.updatedAt || t.createdAt)}</span>
                  </div>
                  <p className="truncate text-xs text-text-muted">{t.reporter?.name || "Unknown"}{t.reporter?.isExternal ? " · external" : ""}{t.attachments?.length ? ` · 📎${t.attachments.length}` : ""}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Badge cls={PRIORITY_BADGE[t.priority] || ""}>{t.priority}</Badge>
                    <Badge cls={STATUS_BADGE[t.status] || ""}>{statusLabel(t.status)}</Badge>
                    {t.assignee?.userId?.name ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-text-muted"><Avatar name={t.assignee.userId.name} size="xs" />{(t.assignee.userId.name || "").split(" ")[0]}</span>
                    ) : null}
                  </div>
                </div>
                {t.status === "new" ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" /> : null}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right: conversation ── */}
      <div className={cn("min-w-0 flex-1 flex-col", selectedId ? "flex" : "hidden lg:flex")}>
        {!sel ? (
          <div className="flex h-full flex-col items-center justify-center rounded-token border border-dashed border-gray-200 bg-white/40 text-center dark:border-white/10 dark:bg-white/5">
            {loadingDetail ? (
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            ) : (
              <>
                <LifeBuoy className="mb-3 h-10 w-10 text-text-muted" />
                <p className="text-sm font-medium text-primary">Select a ticket</p>
                <p className="mt-1 max-w-xs text-xs text-text-muted">Open a ticket to read it, leave internal notes, reply to the reporter (by email) and set its status.</p>
              </>
            )}
          </div>
        ) : (
          <motion.div key={sel._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex h-full flex-col overflow-hidden rounded-token border border-gray-100 bg-white shadow-sm dark:border-white/10">
            {/* header */}
            <div className="shrink-0 border-b border-gray-100 p-4 dark:border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" onClick={() => { setSelectedId(null); setDetail(null); }} className="grid h-9 w-9 shrink-0 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary lg:hidden dark:hover:bg-white/10"><ArrowLeft className="h-4 w-4" /></button>
                  <Avatar name={sel.reporter?.name} />
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-primary"><span className="font-mono text-xs font-normal text-text-muted">#{sel.ticketNumber} </span>{sel.summary}</h2>
                    {sel.reporter?.email ? <a href={`mailto:${sel.reporter.email}`} className="block truncate text-xs text-accent hover:underline">{sel.reporter.name ? `${sel.reporter.name} · ` : ""}{sel.reporter.email}</a> : <p className="truncate text-xs text-text-muted">{sel.reporter?.name || "Unknown reporter"}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <CustomSelect value={sel.status || "new"} onChange={(v) => setField("status", v)} options={STATUSES} className="min-w-[130px]" triggerClassName="border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]" />
                  <button type="button" onClick={() => setDeleteTarget(sel)} title="Delete ticket" className="grid h-9 w-9 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              {/* controls row */}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Control icon={Flag} label="Priority">
                  <CustomSelect value={sel.priority || "medium"} onChange={(v) => setField("priority", v)} options={PRIORITIES} className="min-w-[120px]" triggerClassName="border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]" />
                </Control>
                <Control icon={Tag} label="Category">
                  <CustomSelect value={sel.category || "general"} onChange={(v) => setField("category", v)} options={CATEGORIES} className="min-w-[150px]" triggerClassName="border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]" />
                </Control>
                <Control icon={UsersIcon} label="Assignee">
                  <CustomSelect value={sel.assignee?.userId?._id || sel.assignee?.userId || ""} onChange={handleAssign} options={teamOptions} searchable searchPlaceholder="Search team…" placeholder="Unassigned" className="min-w-[160px]" triggerClassName="border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]" />
                </Control>
              </div>
            </div>

            {/* conversation */}
            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/40 p-4 dark:bg-transparent">
              {/* meta + CSAT */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-token border border-gray-100 bg-white p-3 text-xs dark:border-white/10 sm:grid-cols-3">
                <Meta icon={Tag} label="Category" value={supportCategoryLabel(sel.category)} />
                <Meta icon={Clock} label="Created" value={fmtDateTime(sel.createdAt)} />
                {sel.satisfactionRating ? (
                  <Meta icon={Star} label="Rating" value={`${sel.satisfactionRating} / 5`} />
                ) : (
                  <Meta label="Reporter" value={sel.reporter?.isExternal ? "External" : "Internal"} />
                )}
              </div>

              {/* original message */}
              <div className="flex justify-start">
                <div className="max-w-[88%]">
                  <div className="mb-1 flex items-center gap-2 text-[11px] text-text-muted">
                    <Avatar name={sel.reporter?.name} size="xs" />
                    <span className="font-medium text-primary">{sel.reporter?.name || "Reporter"}</span>
                    <span>· {sel.reporter?.isExternal ? "via support form" : "raised"} · {fmtDateTime(sel.createdAt)}</span>
                  </div>
                  <div className="whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-3.5 py-2.5 text-sm text-gray-800 dark:border-white/10">{sel.description || sel.summary || "—"}</div>
                  <TicketAttachments attachments={sel.attachments} className="mt-3" />
                </div>
              </div>

              {/* thread */}
              {loadingDetail ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
              ) : (
                (sel.comments || []).map((m, i) => <CommentMessage key={m._id || i} m={m} mine={isMine(m.createdBy)} />)
              )}
              <div ref={bottomRef} />
            </div>

            {/* composer */}
            <div className="shrink-0 border-t border-gray-100 p-3 dark:border-white/10">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="inline-flex overflow-hidden rounded-token-btn border border-gray-200 text-xs dark:border-white/10">
                  <button type="button" onClick={() => setComposerKind("note")} className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors", composerKind === "note" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50 dark:hover:bg-white/5")}><Lock className="h-3.5 w-3.5" /> Internal note</button>
                  <button type="button" onClick={() => setComposerKind("reply")} className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors", composerKind === "reply" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50 dark:hover:bg-white/5")}><CornerUpLeft className="h-3.5 w-3.5" /> Reply to reporter</button>
                </div>
                <label className={cn("inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-token-btn border border-dashed border-gray-300 px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:border-gray-400 dark:border-white/15", attaching && "opacity-50")}>
                  {attaching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />} Attach
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={uploadAttachment} disabled={attaching} />
                </label>
              </div>

              <RichTextEditor
                key={`${sel._id}-${composerNonce}`}
                value={composer}
                onChange={setComposer}
                mentionItems={composerKind === "note" ? team : null}
                onMentions={setComposerMentions}
                placeholder={composerKind === "reply" ? `Reply — this emails ${sel.reporter?.email || "the reporter"}` : "Write an internal note… use @ to mention a teammate"}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
                  {composerKind === "reply" ? (<><Mail className="h-3.5 w-3.5" /> Emailed to the reporter</>) : (<><Lock className="h-3.5 w-3.5" /> Visible to your team only</>)}
                </p>
                <button type="button" onClick={handleSend} disabled={composerEmpty || sending} className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {composerKind === "reply" ? "Send reply" : "Add note"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* delete confirmation */}
      <Portal>
        <AnimatePresence>
          {deleteTarget && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
              <motion.div className="relative w-full max-w-sm border border-gray-100 bg-white p-6 text-center shadow-2xl dark:border-white/10 dark:bg-[var(--admin-elevated)]" initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-50 dark:bg-red-500/10"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
                <h3 className="text-base font-semibold text-primary">Delete this ticket?</h3>
                <p className="mt-1 break-words text-sm text-text-muted">Ticket <span className="font-medium text-primary">#{deleteTarget.ticketNumber}</span> and its entire thread will be permanently removed.</p>
                <div className="mt-5 flex gap-3">
                  <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5">Cancel</button>
                  <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex flex-1 items-center justify-center gap-2 bg-red-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50">
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>

      {/* New ticket modal */}
      <Portal>
        <AnimatePresence>
          {createOpen && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !creating && setCreateOpen(false)} />
              <motion.div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-token border border-gray-100 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[var(--admin-elevated)] sm:p-7" initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <p className="mb-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">New request</p>
                    <h3 className="font-heading text-xl font-bold text-primary">Create a ticket</h3>
                  </div>
                  <button onClick={() => { setCreateOpen(false); setCreateFile(null); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-token text-text-muted hover:bg-gray-100 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
                </div>

                {/* Summary */}
                <div className="mb-6">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-white/80">Summary <span className="text-red-500">*</span></label>
                  <input value={createForm.summary} onChange={(e) => setCreateForm((f) => ({ ...f, summary: e.target.value }))} className={fieldCls} placeholder="Short summary of the issue" autoFocus />
                </div>

                {/* Priority — segmented pills */}
                <div className="mb-6">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Priority</p>
                  <div className="flex gap-2">
                    {PRIORITIES.map((p) => {
                      const on = createForm.priority === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setCreateForm((f) => ({ ...f, priority: p.value }))}
                          className={cn(
                            "flex flex-1 items-center justify-center gap-1.5 rounded-token-btn border px-2 py-2 text-xs font-semibold capitalize transition-all duration-200",
                            on ? "border-accent bg-accent text-white shadow-md shadow-accent/25" : "border-gray-200 bg-white text-gray-600 hover:-translate-y-0.5 hover:border-accent/60 hover:text-primary dark:border-white/10 dark:bg-white/5",
                          )}
                        >
                          <span className={cn("h-2 w-2 rounded-full", on ? "bg-white" : PRIORITY_DOT[p.value])} />
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Category — tile grid */}
                <div className="mb-6">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500"><Sparkles className="h-3.5 w-3.5 text-accent" /> Category</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {CATEGORIES.map((c) => {
                      const on = createForm.category === c.value;
                      const Icon = CATEGORY_ICONS[c.value] || HelpCircle;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setCreateForm((f) => ({ ...f, category: c.value }))}
                          className={cn(
                            "flex items-center gap-2 rounded-token border px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                            on ? "border-accent bg-accent text-white shadow-md shadow-accent/25" : "border-gray-200 bg-white text-gray-600 hover:-translate-y-0.5 hover:border-accent/60 hover:text-primary dark:border-white/10 dark:bg-white/5",
                          )}
                        >
                          <Icon className={cn("h-4 w-4 shrink-0", on ? "text-white" : "text-accent")} />
                          <span className="leading-tight">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-white/80">Description <span className="font-normal text-gray-400">(optional)</span></label>
                  <textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} rows={4} className={fieldCls} placeholder="Add any detail that helps…" />
                </div>

                {/* Attachment */}
                <div className="mb-6">
                  <p className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white/80">Attachment <span className="font-normal text-gray-400">(optional · image or PDF, max {MAX_FILE_MB}MB)</span></p>
                  {createFile ? (
                    <div className="flex items-center gap-3 rounded-token border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><FileText className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800 dark:text-white">{createFile.name}</p>
                        <p className="text-xs text-gray-400">{(createFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button type="button" onClick={() => setCreateFile(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500" aria-label="Remove attachment"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => createFileRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setCreateDrag(true); }}
                      onDragLeave={() => setCreateDrag(false)}
                      onDrop={(e) => { e.preventDefault(); setCreateDrag(false); pickCreateFile(e.dataTransfer.files?.[0]); }}
                      className={cn("flex w-full items-center justify-center gap-2 rounded-token border-2 border-dashed px-4 py-5 text-sm transition-colors", createDrag ? "border-accent bg-accent/5 text-accent" : "border-gray-300 text-gray-500 hover:border-accent/60 hover:text-primary dark:border-white/15")}
                    >
                      <Paperclip className="h-4 w-4" /> Click or drag &amp; drop a file
                    </button>
                  )}
                  <input ref={createFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { pickCreateFile(e.target.files?.[0]); if (createFileRef.current) createFileRef.current.value = ""; }} />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setCreateOpen(false); setCreateFile(null); }} className="flex-1 rounded-token border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white/80">Cancel</button>
                  <button onClick={handleCreate} disabled={creating} className="inline-flex flex-1 items-center justify-center gap-2 rounded-token bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-50">{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create ticket</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}

/* ── sub-components ───────────────────────────────────────────────────── */

function Control({ icon: Icon, label: lbl, children }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null} {lbl}
      </span>
      {children}
    </div>
  );
}

function Meta({ icon: Icon, label: lbl, value }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">{Icon ? <Icon className="h-3 w-3" /> : null} {lbl}</p>
      <p className="mt-0.5 truncate capitalize text-gray-800" title={value != null ? String(value) : ""}>{value || value === 0 ? value : "—"}</p>
    </div>
  );
}

function CommentMessage({ m, mine }) {
  const isReply = !m.isInternal;
  const author = m.createdBy || {};
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%]">
        <div className="mb-1 flex items-center justify-end gap-2 text-[11px] text-text-muted">
          <span className="font-medium text-primary">{mine ? "You" : author.name || m.authorName || "Teammate"}</span>
          <span>· {fmtDateTime(m.createdAt)}</span>
          <Avatar name={author.name || m.authorName} src={author.profileImage} size="xs" />
        </div>
        <div className={cn("rounded-2xl rounded-tr-sm border px-3.5 py-2.5 text-sm", isReply ? "border-accent/30 bg-accent/5 text-gray-800" : "border-gray-200 bg-gray-50 text-gray-800 dark:border-white/10 dark:bg-white/5")}>
          <div className={cn("mb-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]", isReply ? "text-accent" : "text-amber-600 dark:text-amber-400")}>
            {isReply ? (
              <>
                <Mail className="h-3 w-3" /> Reply to reporter
                {m.emailStatus === "failed" ? <span className="ml-1 rounded bg-red-100 px-1 text-red-600 dark:bg-red-500/15">email failed</span> : null}
              </>
            ) : (
              <><Lock className="h-3 w-3" /> Internal note</>
            )}
          </div>
          <div className="prose prose-sm max-w-none break-words text-gray-800 dark:prose-invert [&_p]:my-0 [&_a]:text-accent [&_blockquote]:my-1 [&_ul]:my-1 [&_ol]:my-1" dangerouslySetInnerHTML={{ __html: sanitizeRichText(m.message) }} />
        </div>
      </div>
    </div>
  );
}
