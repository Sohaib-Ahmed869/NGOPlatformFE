import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "../../components/Portal";
import { toast } from "react-hot-toast";
import {
  Search,
  Download,
  RefreshCw,
  Inbox,
  Trash2,
  Phone,
  MapPin,
  CheckCircle2,
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
import contactsService from "../../services/contacts.service";
import { useAuth } from "../../context/AuthContext";
import { useAdminRealtime } from "../../context/AdminRealtimeContext";
import { getSocket } from "../../services/socket";

/* ── small utils ─────────────────────────────────────────────────────── */

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "responded", label: "Responded" },
];
const STATUS_BADGE = {
  pending: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70",
  reviewed: "bg-accent/10 text-accent",
  responded: "bg-primary/10 text-primary",
};

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
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
  const s =
    size === "xs"
      ? "h-5 w-5 text-[9px]"
      : size === "sm"
      ? "h-7 w-7 text-[11px]"
      : "h-10 w-10 text-sm";
  if (src) return <img src={src} alt={name || ""} className={cn("shrink-0 rounded-full object-cover", s)} />;
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full bg-accent/10 font-bold uppercase text-accent", s)}>
      {(name || "?").charAt(0)}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = status || "pending";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 text-[10px] font-semibold capitalize", STATUS_BADGE[s])}>
      {s}
    </span>
  );
}

// True when rich-text HTML has no visible text (e.g. "", "<p><br></p>").
const isRichEmpty = (html) =>
  !sanitizeRichText(html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;| /g, " ")
    .trim();

/* ── main ────────────────────────────────────────────────────────────── */

const ContactRequestsAdmin = () => {
  const { user } = useAuth();
  const { refreshUnread } = useAdminRealtime();

  const myEmail = (user?.email || "").toLowerCase();
  const myId = user?._id || user?.id || null;
  const isMine = useCallback(
    (author) =>
      !!author &&
      ((myId && author._id === myId) || (author.email && author.email.toLowerCase() === myEmail)),
    [myId, myEmail],
  );

  const cached = contactsService.getCached();
  const [contacts, setContacts] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [team, setTeam] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [composer, setComposer] = useState(""); // rich-text HTML
  const [composerKind, setComposerKind] = useState("note"); // note | reply
  const [composerMentions, setComposerMentions] = useState([]); // user ids
  const [composerNonce, setComposerNonce] = useState(0); // bump → remount editor (clears it)
  const [sending, setSending] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const selectedIdRef = useRef(null);
  const bottomRef = useRef(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const sel = useMemo(() => contacts.find((c) => c._id === selectedId) || null, [contacts, selectedId]);

  /* data loading */
  const load = useCallback(
    async ({ force = false } = {}) => {
      if (force) setRefreshing(true);
      try {
        const req = contactsService.list({ force });
        const data = await (force ? req : withMinDelay(req));
        setContacts(data);
      } catch {
        toast.error("Failed to load contacts");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  const loadTeam = useCallback(async () => {
    try {
      setTeam(await contactsService.team());
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    if (!contactsService.getCached()) load();
    else setLoading(false);
    loadTeam();
    refreshUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* real-time */
  useEffect(() => {
    const socket = getSocket();

    const onNew = ({ contact }) =>
      setContacts((prev) => (prev.some((c) => c._id === contact._id) ? prev : [{ ...contact, unread: true }, ...prev]));

    const onMessage = ({ contactId, message, status, lastMessageAt }) => {
      const open = selectedIdRef.current === contactId;
      setContacts((prev) =>
        prev.map((c) =>
          c._id === contactId
            ? {
                ...c,
                lastMessageAt: lastMessageAt || c.lastMessageAt,
                status: status || c.status,
                unread: open ? false : isMine(message.author) ? c.unread : true,
              }
            : c,
        ),
      );
      if (open) {
        setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
        if (!isMine(message.author)) contactsService.markRead(contactId).then(refreshUnread).catch(() => {});
      } else if (!isMine(message.author)) {
        refreshUnread();
      }
    };

    const onAssigned = ({ contactId, assignedTo }) =>
      setContacts((prev) => prev.map((c) => (c._id === contactId ? { ...c, assignedTo } : c)));
    const onUpdated = ({ contactId, status }) =>
      setContacts((prev) => prev.map((c) => (c._id === contactId ? { ...c, status } : c)));
    const onDeleted = ({ contactId }) => {
      setContacts((prev) => prev.filter((c) => c._id !== contactId));
      if (selectedIdRef.current === contactId) setSelectedId(null);
    };

    socket.on("contact:new", onNew);
    socket.on("contact:message", onMessage);
    socket.on("contact:assigned", onAssigned);
    socket.on("contact:updated", onUpdated);
    socket.on("contact:deleted", onDeleted);
    return () => {
      socket.off("contact:new", onNew);
      socket.off("contact:message", onMessage);
      socket.off("contact:assigned", onAssigned);
      socket.off("contact:updated", onUpdated);
      socket.off("contact:deleted", onDeleted);
    };
  }, [isMine, refreshUnread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedId]);

  /* selection */
  const openContact = useCallback(
    async (c) => {
      setSelectedId(c._id);
      setComposer("");
      setComposerKind("note");
      setComposerMentions([]);
      setContacts((prev) => prev.map((x) => (x._id === c._id ? { ...x, unread: false } : x)));
      setLoadingMessages(true);
      try {
        setMessages(await contactsService.messages(c._id));
      } catch {
        toast.error("Failed to load conversation");
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
      contactsService.markRead(c._id).then(refreshUnread).catch(() => {});
    },
    [refreshUnread],
  );

  /* actions */
  const composerEmpty = useMemo(() => isRichEmpty(composer), [composer]);

  const handleSend = async () => {
    if (composerEmpty || !selectedId || sending) return;
    const body = sanitizeRichText(composer);
    setSending(true);
    try {
      const msg = await contactsService.sendMessage(selectedId, {
        kind: composerKind,
        body,
        // Mentions only apply to internal notes, not emailed replies.
        mentions: composerKind === "note" ? composerMentions : [],
      });
      setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
      setContacts((prev) =>
        prev.map((c) =>
          c._id === selectedId
            ? {
                ...c,
                lastMessageAt: msg.createdAt,
                status: composerKind === "reply" ? "responded" : c.status,
                unread: false,
              }
            : c,
        ),
      );
      setComposer("");
      setComposerMentions([]);
      setComposerNonce((n) => n + 1); // remount the editor so it visibly clears
      if (composerKind === "reply") {
        if (msg.emailStatus === "failed") toast.error("Note saved, but the email to the submitter failed to send.");
        else toast.success("Reply sent to the submitter");
      }
      refreshUnread();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleSetStatus = async (status) => {
    const id = selectedId;
    setContacts((prev) => prev.map((c) => (c._id === id ? { ...c, status } : c)));
    try {
      await contactsService.setStatus(id, status);
    } catch {
      toast.error("Failed to update status");
      load({ force: true });
    }
  };

  const handleAssign = async (val) => {
    const id = selectedId;
    const prev = sel?.assignedTo || null;
    const member = team.find((t) => t._id === val) || null;
    setContacts((p) =>
      p.map((c) =>
        c._id === id
          ? {
              ...c,
              assignedTo: member
                ? { _id: member._id, name: member.name, email: member.email, profileImage: member.profileImage }
                : null,
            }
          : c,
      ),
    );
    try {
      await contactsService.assign(id, val || null);
    } catch {
      toast.error("Failed to assign");
      setContacts((p) => p.map((c) => (c._id === id ? { ...c, assignedTo: prev } : c)));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await contactsService.remove(deleteTarget._id);
      setContacts((prev) => prev.filter((c) => c._id !== deleteTarget._id));
      if (selectedId === deleteTarget._id) setSelectedId(null);
      toast.success("Request deleted");
      setDeleteTarget(null);
      refreshUnread();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to delete request");
    } finally {
      setDeleting(false);
    }
  };

  /* derived list */
  const visible = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return contacts
      .filter((r) => {
        const matchesSearch =
          !q ||
          r.fullName?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.hostCity?.toLowerCase().includes(q) ||
          r.purpose?.toLowerCase().includes(q);
        const matchesStatus = statusFilter === "all" || (r.status || "pending") === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt));
  }, [contacts, searchTerm, statusFilter]);

  const unreadTotal = useMemo(() => contacts.filter((c) => c.unread).length, [contacts]);

  const exportToCSV = () => {
    const header = ["Full Name", "Email", "Phone", "City", "Purpose", "Status", "Assigned To", "Received", "Message"].join(",");
    const esc = (v) => (v == null ? '""' : typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v);
    const rows = visible.map((r) =>
      [
        esc(r.fullName),
        esc(r.email),
        esc(r.phoneNumber),
        esc(r.hostCity),
        esc(r.purpose),
        esc(r.status || "pending"),
        esc(r.assignedTo?.name || ""),
        esc(r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : ""),
        esc(r.description),
      ].join(","),
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contact_requests_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading contacts…" />
      </div>
    );
  }

  const teamOptions = [
    { value: "", label: "Unassigned" },
    ...team.map((t) => ({ value: t._id, label: t.name || t.email })),
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[540px] gap-4">
      {/* ── Left: inbox list ── */}
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/10 lg:w-[360px] lg:shrink-0",
          selectedId && "hidden lg:flex",
        )}
      >
        <div className="shrink-0 border-b border-gray-100 p-4 dark:border-white/10">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold text-primary">Contacts</h1>
              <p className="text-[11px] text-text-muted">
                {contacts.length} total{unreadTotal > 0 ? ` · ${unreadTotal} unread` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => load({ force: true })}
                disabled={refreshing}
                title="Refresh"
                className="grid h-9 w-9 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-50 dark:hover:bg-white/10"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </button>
              <button
                type="button"
                onClick={exportToCSV}
                disabled={visible.length === 0}
                title="Export CSV"
                className="grid h-9 w-9 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-40 dark:hover:bg-white/10"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, email, city…"
              className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white dark:border-white/10 dark:bg-white/5"
            />
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
              <p className="text-sm text-text-muted">
                {contacts.length === 0 ? "No contact requests yet." : "No requests match your filters."}
              </p>
            </div>
          ) : (
            visible.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => openContact(c)}
                style={
                  selectedId === c._id
                    ? { backgroundColor: "rgba(var(--tenant-accent-rgb, 201, 168, 76), 0.16)" }
                    : undefined
                }
                className={cn(
                  "relative flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors dark:border-white/5",
                  selectedId !== c._id && "hover:bg-gray-50/70 dark:hover:bg-white/5",
                )}
              >
                {selectedId === c._id ? (
                  <span
                    className="absolute inset-y-0 left-0 w-[3px]"
                    style={{ backgroundColor: "var(--tenant-accent, #C9A84C)" }}
                    aria-hidden="true"
                  />
                ) : null}
                <Avatar name={c.fullName} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "truncate text-sm",
                        c.unread ? "font-bold" : "font-semibold",
                        selectedId === c._id ? "text-accent" : "text-primary",
                      )}
                    >
                      {c.fullName}
                    </p>
                    <span className="shrink-0 text-[10px] text-text-muted">{timeAgo(c.lastMessageAt || c.createdAt)}</span>
                  </div>
                  <p className="truncate text-xs text-text-muted">{c.email}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">{c.purpose || c.description}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <StatusBadge status={c.status} />
                    {c.assignedTo ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-text-muted">
                        <Avatar name={c.assignedTo.name} src={c.assignedTo.profileImage} size="xs" />
                        {(c.assignedTo.name || "").split(" ")[0]}
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
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/40 text-center dark:border-white/10 dark:bg-white/5">
            <MessageSquare className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm font-medium text-primary">Select a request</p>
            <p className="mt-1 max-w-xs text-xs text-text-muted">
              Open a contact to read it, leave internal notes for your team, reply to the sender and assign an owner.
            </p>
          </div>
        ) : (
          <motion.div
            key={sel._id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/10"
          >
            {/* header */}
            <div className="shrink-0 border-b border-gray-100 p-4 dark:border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="grid h-9 w-9 shrink-0 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary lg:hidden dark:hover:bg-white/10"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Avatar name={sel.fullName} />
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-primary">{sel.fullName}</h2>
                    <a href={`mailto:${sel.email}`} className="block truncate text-xs text-accent hover:underline">
                      {sel.email}
                    </a>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <CustomSelect
                    value={sel.status || "pending"}
                    onChange={handleSetStatus}
                    options={STATUSES}
                    className="min-w-[130px]"
                    triggerClassName="border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]"
                  />
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(sel)}
                    title="Delete request"
                    className="grid h-9 w-9 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                  >
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
                  value={sel.assignedTo?._id || ""}
                  onChange={handleAssign}
                  options={teamOptions}
                  searchable
                  searchPlaceholder="Search team…"
                  placeholder="Unassigned"
                  className="min-w-[170px]"
                  triggerClassName="border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]"
                />
              </div>
            </div>

            {/* conversation */}
            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/40 p-4 dark:bg-transparent">
              {/* request meta */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-gray-100 bg-white p-3 text-xs dark:border-white/10 sm:grid-cols-3">
                <Meta icon={Phone} label="Phone" value={sel.phoneNumber} />
                <Meta icon={MapPin} label="City" value={sel.hostCity} />
                <Meta icon={CheckCircle2} label="Purpose" value={sel.purpose} />
                {sel.numberOfGuests != null ? <Meta label="Guests" value={sel.numberOfGuests} /> : null}
                {sel.minimumDonation != null ? <Meta label="Min. donation" value={`$${sel.minimumDonation}`} /> : null}
                {typeof sel.wouldLikeToHostShahidAfridi === "boolean" ? (
                  <Meta label="Host speaker" value={sel.wouldLikeToHostShahidAfridi ? "Yes" : "No"} />
                ) : null}
              </div>

              {/* submitter's original message */}
              <div className="flex justify-start">
                <div className="max-w-[88%]">
                  <div className="mb-1 flex items-center gap-2 text-[11px] text-text-muted">
                    <Avatar name={sel.fullName} size="xs" />
                    <span className="font-medium text-primary">{sel.fullName}</span>
                    <span>· via contact form · {fmtDateTime(sel.createdAt)}</span>
                  </div>
                  <div className="whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-3.5 py-2.5 text-sm text-gray-800 dark:border-white/10">
                    {sel.description || "—"}
                  </div>
                </div>
              </div>

              {/* thread */}
              {loadingMessages ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-accent" />
                </div>
              ) : (
                messages.map((m) => <ThreadMessage key={m._id} m={m} mine={isMine(m.author)} />)
              )}
              <div ref={bottomRef} />
            </div>

            {/* composer */}
            <div className="shrink-0 border-t border-gray-100 p-3 dark:border-white/10">
              <div className="mb-2 inline-flex overflow-hidden rounded-lg border border-gray-200 text-xs dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setComposerKind("note")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors",
                    composerKind === "note" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50 dark:hover:bg-white/5",
                  )}
                >
                  <Lock className="h-3.5 w-3.5" /> Internal note
                </button>
                <button
                  type="button"
                  onClick={() => setComposerKind("reply")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors",
                    composerKind === "reply" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50 dark:hover:bg-white/5",
                  )}
                >
                  <CornerUpLeft className="h-3.5 w-3.5" /> Reply to submitter
                </button>
              </div>

              <div>
                <RichTextEditor
                  key={`${sel._id}-${composerNonce}`}
                  value={composer}
                  onChange={setComposer}
                  mentionItems={composerKind === "note" ? team : null}
                  onMentions={setComposerMentions}
                  placeholder={
                    composerKind === "reply"
                      ? `Reply — this emails ${sel.email}`
                      : "Write an internal note… use @ to mention a teammate"
                  }
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
                    {composerKind === "reply" ? (
                      <>
                        <Mail className="h-3.5 w-3.5" /> Sent to the submitter by email
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" /> Visible to your team only
                      </>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={composerEmpty || sending}
                    className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
                  >
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
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
            <motion.div
              className="relative w-full max-w-sm border border-gray-100 bg-white p-6 text-center shadow-2xl dark:border-white/10 dark:bg-[var(--admin-elevated)]"
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
            >
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-50 dark:bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-primary">Delete this request?</h3>
              <p className="mt-1 break-words text-sm text-text-muted">
                The request from <span className="font-medium text-primary">{deleteTarget.fullName}</span> and its entire
                internal thread will be permanently removed.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
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

/* ── sub-components ───────────────────────────────────────────────────── */

function Meta({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        {Icon ? <Icon className="h-3 w-3" /> : null} {label}
      </p>
      <p className="mt-0.5 truncate text-gray-800" title={value != null ? String(value) : ""}>
        {value || value === 0 ? value : "—"}
      </p>
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
          <span className="font-medium text-primary">{mine ? "You" : author.name || "Teammate"}</span>
          <span>· {fmtDateTime(m.createdAt)}</span>
          <Avatar name={author.name} src={author.profileImage} size="xs" />
        </div>
        <div
          className={cn(
            "rounded-2xl rounded-tr-sm border px-3.5 py-2.5 text-sm",
            isReply
              ? "border-accent/30 bg-accent/5 text-gray-800"
              : "border-gray-200 bg-gray-50 text-gray-800 dark:border-white/10 dark:bg-white/5",
          )}
        >
          <div
            className={cn(
              "mb-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
              isReply ? "text-accent" : "text-amber-600 dark:text-amber-400",
            )}
          >
            {isReply ? (
              <>
                <Mail className="h-3 w-3" /> Replied to {m.emailedTo || "submitter"}
                {m.emailStatus === "failed" ? (
                  <span className="ml-1 rounded bg-red-100 px-1 text-red-600 dark:bg-red-500/15">email failed</span>
                ) : null}
              </>
            ) : (
              <>
                <Lock className="h-3 w-3" /> Internal note
              </>
            )}
          </div>
          <div
            className="prose prose-sm max-w-none break-words text-gray-800 dark:prose-invert [&_p]:my-0 [&_a]:text-accent [&_blockquote]:my-1 [&_ul]:my-1 [&_ol]:my-1"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(m.body) }}
          />
        </div>
      </div>
    </div>
  );
}

export default ContactRequestsAdmin;
