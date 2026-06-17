import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "../../components/Portal";
import { toast } from "react-hot-toast";
import {
  Search,
  Download,
  RefreshCw,
  Inbox,
  Trash2,
  FileText,
  Clock,
  Send,
  Lock,
  Mail,
  ArrowLeft,
  Loader2,
  MessageSquare,
  CornerUpLeft,
  AlertTriangle,
  Users as UsersIcon,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { CustomSelect } from "../../components/CustomSelect";
import { RichTextEditor, sanitizeRichText } from "../../components/RichTextEditor";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import superadminService from "../../services/superadmin.service";
import { useAuth } from "../../context/AuthContext";
import { useSARealtime } from "../context/SARealtimeContext";

/* ── small utils ─────────────────────────────────────────────────────── */

const STATUSES = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Closed" },
];
const STATUS_BADGE = {
  new: "bg-accent/10 text-accent",
  read: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70",
  in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  replied: "bg-primary/10 text-primary",
  closed: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/60",
};
const statusLabel = (s) => STATUSES.find((x) => x.value === s)?.label || s;

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

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
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full bg-accent/10 font-bold uppercase text-accent", s)}>
      {(name || "?").charAt(0)}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = status || "new";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 text-[10px] font-semibold capitalize", STATUS_BADGE[s])}>
      {statusLabel(s)}
    </span>
  );
}

const isRichEmpty = (html) =>
  !sanitizeRichText(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;| /g, " ").trim();

/* ── main ────────────────────────────────────────────────────────────── */

export default function ContactQueries() {
  const { user } = useAuth();
  const { refreshContactUnread, socket } = useSARealtime();

  const myEmail = (user?.email || "").toLowerCase();
  const myId = user?._id || user?.id || null;
  const isMine = useCallback(
    (author) => !!author && ((myId && author._id === myId) || (author.email && author.email.toLowerCase() === myEmail)),
    [myId, myEmail],
  );

  // Hydrate from the session caches so revisits are instant (no loader flash) —
  // null cache = first visit (show the loader); an array = already loaded.
  const cachedQueries = superadminService.getContactQueriesCached();
  const cachedStaff = superadminService.getCachedContactStaff();
  const [queries, setQueries] = useState(cachedQueries || []);
  const [loading, setLoading] = useState(!cachedQueries);
  const [refreshing, setRefreshing] = useState(false);
  const [staff, setStaff] = useState(cachedStaff || []);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [composer, setComposer] = useState("");
  const [composerKind, setComposerKind] = useState("note");
  const [composerMentions, setComposerMentions] = useState([]);
  const [composerNonce, setComposerNonce] = useState(0);
  const [sending, setSending] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const bottomRef = useRef(null);
  const selectedIdRef = useRef(null);
  const fetchRef = useRef(null);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  /* data loading — force=true bypasses the cache (manual refresh, sockets, the
     background revalidate). Only ever spins the small refresh icon, never the
     full-page loader (that's owned by the first-visit path below). */
  const load = useCallback(
    async ({ force = false } = {}) => {
      if (force) setRefreshing(true);
      try {
        setQueries(await superadminService.loadContactQueries({ force }));
      } catch {
        toast.error("Failed to load contact queries");
      } finally {
        setRefreshing(false);
      }
    },
    [],
  );
  useEffect(() => { fetchRef.current = load; }, [load]);

  useEffect(() => {
    if (superadminService.getContactQueriesCached()) {
      // Cached → render instantly, then silently revalidate (the inbox is
      // real-time and may have moved on while we were on another screen).
      load({ force: true });
    } else {
      // First, uncached visit → show the loader with a graceful minimum on-screen.
      (async () => {
        try {
          setQueries(await withMinDelay(superadminService.loadContactQueries()));
        } catch {
          toast.error("Failed to load contact queries");
        } finally {
          setLoading(false);
        }
      })();
    }
    superadminService.loadContactStaff().then(setStaff).catch(() => {});
    refreshContactUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror the list into the session cache so optimistic edits, sent messages,
  // status/assignment changes and socket refetches all survive to the next visit.
  useEffect(() => {
    superadminService.setContactQueriesCache(queries);
  }, [queries]);

  /* real-time */
  useEffect(() => {
    if (!socket) return undefined;
    const refetch = () => fetchRef.current?.({ force: true });
    // A thread changed: if it's the one on screen, pull the fresh copy in (this
    // also refreshes its cache); otherwise just flag it so the next open knows
    // to revalidate instead of serving a stale cached conversation.
    const onThreadChange = (p) => {
      fetchRef.current?.({ force: true });
      if (!p?.id) return;
      if (selectedIdRef.current === p.id) {
        superadminService.loadContactQuery(p.id, { force: true }).then(setDetail).catch(() => {});
      } else {
        superadminService.markContactQueryStale(p.id);
      }
    };
    const onDeleted = (p) => {
      fetchRef.current?.({ force: true });
      if (p?.id) superadminService.removeContactQueryCache(p.id);
      if (p?.id && selectedIdRef.current === p.id) { setDetail(null); setSelectedId(null); }
    };
    socket.on("contactQuery:new", refetch);
    socket.on("contactQuery:message", onThreadChange);
    socket.on("contactQuery:updated", onThreadChange);
    socket.on("contactQuery:assigned", onThreadChange);
    socket.on("contactQuery:deleted", onDeleted);
    return () => {
      socket.off("contactQuery:new", refetch);
      socket.off("contactQuery:message", onThreadChange);
      socket.off("contactQuery:updated", onThreadChange);
      socket.off("contactQuery:assigned", onThreadChange);
      socket.off("contactQuery:deleted", onDeleted);
    };
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.thread?.length, selectedId]);

  /* selection */
  const openQuery = useCallback(
    async (c) => {
      setSelectedId(c._id);
      setComposer("");
      setComposerKind("note");
      setComposerMentions([]);
      setQueries((prev) => prev.map((x) => (x._id === c._id ? { ...x, unread: false } : x)));

      const cached = superadminService.getCachedContactQuery(c._id);
      // The thread is stale if a socket flagged it, OR the (freshly revalidated)
      // list row shows newer activity than the cached conversation reflects.
      const stale =
        !!cached &&
        (superadminService.isContactQueryStale(c._id) ||
          new Date(c.lastMessageAt || c.createdAt || 0) >
            new Date(cached.lastMessageAt || cached.createdAt || 0));

      if (cached) {
        // Instant from cache — no loader. Only hit the API when it changed.
        setDetail(cached);
        setLoadingDetail(false);
        if (stale) {
          superadminService.loadContactQuery(c._id, { force: true }).then(setDetail).catch(() => {});
        }
      } else {
        setLoadingDetail(true);
        try {
          setDetail(await superadminService.loadContactQuery(c._id));
        } catch {
          toast.error("Failed to load conversation");
          setDetail(null);
        } finally {
          setLoadingDetail(false);
        }
      }
      refreshContactUnread();
    },
    [refreshContactUnread],
  );

  /* actions */
  const composerEmpty = useMemo(() => isRichEmpty(composer), [composer]);

  const handleSend = async () => {
    if (composerEmpty || !selectedId || sending) return;
    const body = sanitizeRichText(composer);
    setSending(true);
    try {
      const res = await superadminService.addContactMessage(selectedId, {
        kind: composerKind,
        body,
        mentions: composerKind === "note" ? composerMentions : [],
      });
      setDetail(res.data.query);
      superadminService.setContactQueryCache(res.data.query); // keep the thread cache fresh
      setQueries((prev) =>
        prev.map((c) =>
          c._id === selectedId
            ? { ...c, lastMessageAt: new Date().toISOString(), status: res.data.query.status, unread: false }
            : c,
        ),
      );
      setComposer("");
      setComposerMentions([]);
      setComposerNonce((n) => n + 1);
      if (composerKind === "reply") {
        if (res.data.emailStatus === "failed") toast.error("Note saved, but the email to the submitter failed to send.");
        else toast.success("Reply sent to the submitter");
      }
      refreshContactUnread();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleSetStatus = async (status) => {
    const id = selectedId;
    setDetail((d) => (d ? { ...d, status } : d));
    setQueries((prev) => prev.map((c) => (c._id === id ? { ...c, status } : c)));
    const cached = superadminService.getCachedContactQuery(id);
    if (cached) superadminService.setContactQueryCache({ ...cached, status });
    try {
      await superadminService.updateContactQueryStatus(id, { status });
    } catch {
      toast.error("Failed to update status");
      superadminService.markContactQueryStale(id); // cache may be wrong → revalidate on reopen
      load({ force: true });
    }
  };

  const handleAssign = async (val) => {
    const id = selectedId;
    try {
      const res = await superadminService.assignContactQuery(id, val || null);
      const assignee = res.data.query.assignee;
      setDetail((d) => (d ? { ...d, assignee } : d));
      setQueries((prev) => prev.map((c) => (c._id === id ? { ...c, assignee } : c)));
      const cached = superadminService.getCachedContactQuery(id);
      if (cached) superadminService.setContactQueryCache({ ...cached, assignee });
    } catch {
      toast.error("Failed to assign");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await superadminService.deleteContactQuery(deleteTarget._id);
      superadminService.removeContactQueryCache(deleteTarget._id); // drop the stale thread cache
      setQueries((prev) => prev.filter((c) => c._id !== deleteTarget._id));
      if (selectedId === deleteTarget._id) { setSelectedId(null); setDetail(null); }
      toast.success("Query deleted");
      setDeleteTarget(null);
      refreshContactUnread();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to delete query");
    } finally {
      setDeleting(false);
    }
  };

  /* derived list */
  const visible = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return queries
      .filter((r) => {
        const matchesSearch =
          !q || r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.subject?.toLowerCase().includes(q);
        const matchesStatus = statusFilter === "all" || (r.status || "new") === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt));
  }, [queries, searchTerm, statusFilter]);

  const unreadTotal = useMemo(() => queries.filter((c) => c.unread).length, [queries]);

  const exportToCSV = () => {
    const header = ["Name", "Email", "Subject", "Status", "Assignee", "Received", "Message"].join(",");
    const esc = (v) => (v == null ? '""' : typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v);
    const rows = visible.map((r) =>
      [esc(r.name), esc(r.email), esc(r.subject), esc(r.status || "new"), esc(r.assignee?.name || ""), esc(r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : ""), esc("")].join(","),
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contact_queries_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading contact queries…" />
      </div>
    );
  }

  const teamOptions = [{ value: "", label: "Unassigned" }, ...staff.map((t) => ({ value: t._id, label: t.name || t.email }))];
  const sel = detail;

  return (
    // The platform subdomain applies no tenant design, so the shape tokens default
    // to 0. Set them locally so `rounded-token` matches the console's rounded cards.
    <div className="flex h-[calc(100vh-7rem)] min-h-[540px] gap-4" style={{ "--radius-card": "0.75rem", "--radius-btn": "0.5rem" }}>
      {/* ── Left: inbox list ── */}
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-token border border-gray-100 bg-white shadow-sm dark:border-white/10 lg:w-[360px] lg:shrink-0",
          selectedId && "hidden lg:flex",
        )}
      >
        <div className="shrink-0 border-b border-gray-100 p-4 dark:border-white/10">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold text-primary">Contact Queries</h1>
              <p className="text-[11px] text-text-muted">
                {queries.length} total{unreadTotal > 0 ? ` · ${unreadTotal} unread` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => load({ force: true })} disabled={refreshing} title="Refresh" className="grid h-9 w-9 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-50 dark:hover:bg-white/10">
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </button>
              <button type="button" onClick={exportToCSV} disabled={visible.length === 0} title="Export CSV" className="grid h-9 w-9 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-40 dark:hover:bg-white/10">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search name, email, subject…" className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white dark:border-white/10 dark:bg-white/5" />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[{ value: "all", label: "All status" }, ...STATUSES]}
            className="mt-2 w-full"
            triggerClassName="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <Inbox className="mb-3 h-9 w-9 text-text-muted" />
              <p className="text-sm text-text-muted">{queries.length === 0 ? "No contact queries yet." : "No queries match your filters."}</p>
            </div>
          ) : (
            visible.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => openQuery(c)}
                style={selectedId === c._id ? { backgroundColor: "rgba(var(--tenant-accent-rgb, 16, 185, 129), 0.16)" } : undefined}
                className={cn(
                  "relative flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors dark:border-white/5",
                  selectedId !== c._id && "hover:bg-gray-50/70 dark:hover:bg-white/5",
                )}
              >
                {selectedId === c._id ? <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: "var(--tenant-accent, #10b981)" }} aria-hidden="true" /> : null}
                <Avatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-sm", c.unread ? "font-bold" : "font-semibold", selectedId === c._id ? "text-accent" : "text-primary")}>{c.name}</p>
                    <span className="shrink-0 text-[10px] text-text-muted">{timeAgo(c.lastMessageAt || c.createdAt)}</span>
                  </div>
                  <p className="truncate text-xs text-text-muted">{c.email}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">{c.subject}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <StatusBadge status={c.status} />
                    {c.assignee?.name ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-text-muted">
                        <Avatar name={c.assignee.name} size="xs" />
                        {(c.assignee.name || "").split(" ")[0]}
                      </span>
                    ) : null}
                  </div>
                </div>
                {c.unread ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" /> : null}
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
                <MessageSquare className="mb-3 h-10 w-10 text-text-muted" />
                <p className="text-sm font-medium text-primary">Select a query</p>
                <p className="mt-1 max-w-xs text-xs text-text-muted">Open a message to read it, leave internal notes, reply to the sender and assign an owner.</p>
              </>
            )}
          </div>
        ) : (
          <motion.div key={sel._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex h-full flex-col overflow-hidden rounded-token border border-gray-100 bg-white shadow-sm dark:border-white/10">
            {/* header */}
            <div className="shrink-0 border-b border-gray-100 p-4 dark:border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" onClick={() => { setSelectedId(null); setDetail(null); }} className="grid h-9 w-9 shrink-0 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary lg:hidden dark:hover:bg-white/10">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Avatar name={sel.name} />
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-primary">{sel.name}</h2>
                    <a href={`mailto:${sel.email}`} className="block truncate text-xs text-accent hover:underline">{sel.email}</a>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <CustomSelect value={sel.status || "new"} onChange={handleSetStatus} options={STATUSES} className="min-w-[130px]" triggerClassName="border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]" />
                  <button type="button" onClick={() => setDeleteTarget(sel)} title="Delete query" className="grid h-9 w-9 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* assignment */}
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                  <UsersIcon className="h-3.5 w-3.5" /> Assignee
                </span>
                <CustomSelect
                  value={sel.assignee?.userId?._id || sel.assignee?.userId || ""}
                  onChange={handleAssign}
                  options={teamOptions}
                  searchable
                  searchPlaceholder="Search operators…"
                  placeholder="Unassigned"
                  className="min-w-[170px]"
                  triggerClassName="border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]"
                />
              </div>
            </div>

            {/* conversation */}
            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/40 p-4 dark:bg-transparent">
              {/* meta */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-token border border-gray-100 bg-white p-3 text-xs dark:border-white/10 sm:grid-cols-3">
                <Meta icon={FileText} label="Subject" value={sel.subject} />
                <Meta icon={Clock} label="Received" value={fmtDateTime(sel.createdAt)} />
                <Meta icon={Mail} label="Replies" value={(sel.thread || []).filter((t) => t.kind === "reply").length} />
              </div>

              {/* submitter's original message */}
              <div className="flex justify-start">
                <div className="max-w-[88%]">
                  <div className="mb-1 flex items-center gap-2 text-[11px] text-text-muted">
                    <Avatar name={sel.name} size="xs" />
                    <span className="font-medium text-primary">{sel.name}</span>
                    <span>· via contact form · {fmtDateTime(sel.createdAt)}</span>
                  </div>
                  <div className="whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-3.5 py-2.5 text-sm text-gray-800 dark:border-white/10">{sel.message || "—"}</div>
                </div>
              </div>

              {/* thread */}
              {loadingDetail ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
              ) : (
                (sel.thread || []).map((m, i) => <ThreadMessage key={m._id || i} m={m} mine={isMine(m.author)} />)
              )}
              <div ref={bottomRef} />
            </div>

            {/* composer */}
            <div className="shrink-0 border-t border-gray-100 p-3 dark:border-white/10">
              <div className="mb-2 inline-flex overflow-hidden rounded-token-btn border border-gray-200 text-xs dark:border-white/10">
                <button type="button" onClick={() => setComposerKind("note")} className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors", composerKind === "note" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50 dark:hover:bg-white/5")}>
                  <Lock className="h-3.5 w-3.5" /> Internal note
                </button>
                <button type="button" onClick={() => setComposerKind("reply")} className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors", composerKind === "reply" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50 dark:hover:bg-white/5")}>
                  <CornerUpLeft className="h-3.5 w-3.5" /> Reply to submitter
                </button>
              </div>

              <div>
                <RichTextEditor
                  key={`${sel._id}-${composerNonce}`}
                  value={composer}
                  onChange={setComposer}
                  mentionItems={composerKind === "note" ? staff : null}
                  onMentions={setComposerMentions}
                  placeholder={composerKind === "reply" ? `Reply — this emails ${sel.email}` : "Write an internal note… use @ to mention an operator"}
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
                    {composerKind === "reply" ? (<><Mail className="h-3.5 w-3.5" /> Sent to the submitter by email</>) : (<><Lock className="h-3.5 w-3.5" /> Visible to operators only</>)}
                  </p>
                  <button type="button" onClick={handleSend} disabled={composerEmpty || sending} className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {composerKind === "reply" ? "Send reply" : "Add note"}
                  </button>
                </div>
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
                <h3 className="text-base font-semibold text-primary">Delete this query?</h3>
                <p className="mt-1 break-words text-sm text-text-muted">
                  The message from <span className="font-medium text-primary">{deleteTarget.name}</span> and its entire internal thread will be permanently removed.
                </p>
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
    </div>
  );
}

/* ── sub-components ───────────────────────────────────────────────────── */

function Meta({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        {Icon ? <Icon className="h-3 w-3" /> : null} {label}
      </p>
      <p className="mt-0.5 truncate text-gray-800" title={value != null ? String(value) : ""}>{value || value === 0 ? value : "—"}</p>
    </div>
  );
}

function ThreadMessage({ m, mine }) {
  const isReply = m.kind === "reply";
  const author = m.author || {};
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%]">
        <div className="mb-1 flex items-center justify-end gap-2 text-[11px] text-text-muted">
          <span className="font-medium text-primary">{mine ? "You" : author.name || m.authorName || "Operator"}</span>
          <span>· {fmtDateTime(m.createdAt)}</span>
          <Avatar name={author.name || m.authorName} src={author.profileImage} size="xs" />
        </div>
        <div className={cn("rounded-2xl rounded-tr-sm border px-3.5 py-2.5 text-sm", isReply ? "border-accent/30 bg-accent/5 text-gray-800" : "border-gray-200 bg-gray-50 text-gray-800 dark:border-white/10 dark:bg-white/5")}>
          <div className={cn("mb-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]", isReply ? "text-accent" : "text-amber-600 dark:text-amber-400")}>
            {isReply ? (
              <>
                <Mail className="h-3 w-3" /> Replied to {m.emailedTo || "submitter"}
                {m.emailStatus === "failed" ? <span className="ml-1 rounded bg-red-100 px-1 text-red-600 dark:bg-red-500/15">email failed</span> : null}
              </>
            ) : (
              <><Lock className="h-3 w-3" /> Internal note</>
            )}
          </div>
          <div className="prose prose-sm max-w-none break-words text-gray-800 dark:prose-invert [&_p]:my-0 [&_a]:text-accent [&_blockquote]:my-1 [&_ul]:my-1 [&_ol]:my-1" dangerouslySetInnerHTML={{ __html: sanitizeRichText(m.body) }} />
        </div>
      </div>
    </div>
  );
}

// On a Vite hot-reload the service module survives, so its inbox cache would keep
// serving stale data. Drop it on dispose → the remounted screen re-fetches from
// the API and updates state. Dev-only: stripped from production builds.
if (import.meta.hot) {
  import.meta.hot.dispose(() => superadminService.clearContactQueriesCache());
}
