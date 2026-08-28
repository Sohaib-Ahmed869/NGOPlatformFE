import { memo, useState, useEffect, useLayoutEffect, useDeferredValue, useMemo, useReducer, useRef, useCallback } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
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
  ChevronDown,
  ChevronUp,
  Users as UsersIcon,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { CustomSelect } from "../../components/CustomSelect";
import { RichTextEditor, sanitizeRichText } from "../../components/RichTextEditor";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import superadminService from "../../services/superadmin.service";
import { scrollToTopOf } from "../utils/scrollTo";
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from "../utils/paging";
import { getSocketId } from "../../services/socketId";
import SAErrorState from "../components/SAErrorState";
import { useAuth } from "../../context/AuthContext";
import { useSARealtime } from "../context/SARealtimeContext";

import AnimatedNumberBase from "../components/AnimatedNumber";

// Kept this screen's original 0.7s pacing — deduplicating the
// implementation shouldn't silently restyle it.
const AnimatedNumber = (props) => <AnimatedNumberBase duration={0.7} {...props} />;
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
// Rows per page. The list is held client-side, so these are a slice, not a
// request — but the control offers the same choices as every other screen,
// which is the whole point of taking them from one place.
const DEFAULT_LIMIT = DEFAULT_PAGE_SIZE;

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

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
// Resolve a stored avatar path (relative upload, absolute URL or data-URI) —
// mirrors SATopbar/Settings, so operator photos load off the API host.
function resolveAvatar(path) {
  if (!path || path.includes("/api/placeholder")) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${API_BASE}/${String(path).replace(/\\/g, "/").replace(/^\/+/, "")}`;
}

function Avatar({ name, src, size = "md" }) {
  const s = size === "xs" ? "h-5 w-5 text-[9px]" : size === "sm" ? "h-7 w-7 text-[11px]" : "h-10 w-10 text-sm";
  const url = resolveAvatar(src);
  if (url) return <img src={url} alt={name || ""} className={cn("shrink-0 rounded-full object-cover", s)} />;
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

const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
// Brand hero gradient — resolves to the platform palette (same vars as the
// sidebar), mirroring the Organisations / Audit / Support-session hero.
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";

/* Stat cell in the attached strip under the hero banner (Organisations look). */
function HeaderStat({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl sm:h-9 sm:w-9" style={{ background: `${color}1a`, color }}>
        <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-base font-bold leading-none text-gray-900 dark:text-white sm:text-lg">{value}</p>
        <p className="mt-1 truncate text-[11px] text-gray-400 sm:text-xs">{label}</p>
        {/* The sub-line is the first thing to go when height is scarce. */}
        {sub ? <p className="hidden truncate text-[10px] text-gray-300 dark:text-white/30 sm:block">{sub}</p> : null}
      </div>
    </div>
  );
}

/* The composer's six pieces of state, which only ever move together: opening
   it picks a mode, sending clears the draft AND collapses AND remounts the
   editor (nonce). As separate useStates every transition was several setStates
   that could be observed half-applied. */
const COMPOSER_INIT = { body: "", kind: "note", mentions: [], nonce: 0, open: false, sending: false };
function composerReducer(state, action) {
  switch (action.type) {
    case "reset": // a different query opened
      return { ...COMPOSER_INIT, nonce: state.nonce + 1 };
    case "body":
      return { ...state, body: action.body };
    case "mentions":
      return { ...state, mentions: action.mentions };
    case "kind":
      return { ...state, kind: action.kind };
    case "open":
      return { ...state, kind: action.kind ?? state.kind, open: true };
    case "close":
      return { ...state, open: false };
    case "sending":
      return { ...state, sending: true };
    case "sent": // clears the draft, folds away, remounts the editor
      return { ...state, body: "", mentions: [], nonce: state.nonce + 1, open: false, sending: false };
    case "failed":
      return { ...state, sending: false };
    default:
      return state;
  }
}

/* ── main ────────────────────────────────────────────────────────────── */

export default function ContactQueries() {
  const { user } = useAuth();
  // `contactVersion` bumps whenever a contact event lands anywhere — the load
  // effect below uses it as its "something changed" signal.
  const { setContactUnread, contactVersion, socket } = useSARealtime();

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
  const [error, setError] = useState(null);
  const [staff, setStaff] = useState(cachedStaff || []);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // The editor is ~230px of chrome. Parked open it left the conversation a
  // sliver on a laptop — you couldn't read the message you were answering. It
  // now opens on demand and folds back down once the message is away.
  const [composer, dispatchComposer] = useReducer(composerReducer, COMPOSER_INIT);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const threadRef = useRef(null);
  const composerBoxRef = useRef(null);
  const railRef = useRef(null);
  const listScrollYRef = useRef(0);
  const openTokenRef = useRef(0); // guards against out-of-order conversation responses
  const selectedIdRef = useRef(null);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  /* data loading — force=true bypasses the cache (manual refresh, sockets, the
     background revalidate). Only ever spins the small refresh icon, never the
     full-page loader (that's owned by the first-visit path below). */
  const load = useCallback(
    async ({ force = false } = {}) => {
      if (force) setRefreshing(true);
      try {
        setQueries(await superadminService.loadContactQueries({ force }));
        setError(null);
      } catch (err) {
        toast.error(err?.response?.data?.error || "Failed to load contact queries");
      } finally {
        setRefreshing(false);
      }
    },
    [],
  );

  // One-time bootstrap. No unread-count request here: the realtime provider
  // already fetches it when the socket connects, and once the list below has
  // loaded THIS screen is the better source anyway (see the publish effect).
  useEffect(() => {
    superadminService.loadContactStaff().then(setStaff).catch(() => {});
  }, []);

  // The list. This used to force a request on EVERY mount, so the cache only
  // saved the loader flash. Contact events now flag the cache stale from the
  // realtime context (wherever you are) and bump `contactVersion`, so an
  // unchanged revisit costs no request while a mounted inbox still updates.
  useEffect(() => {
    const cachedNow = superadminService.getContactQueriesCached();
    if (cachedNow && !superadminService.areContactQueriesStale()) {
      setQueries(cachedNow);
      setLoading(false);
      return;
    }
    if (cachedNow) {
      load({ force: true }); // stale → keep showing it, revalidate quietly
      return;
    }
    // First, uncached visit → show the loader with a graceful minimum on-screen.
    (async () => {
      try {
        setQueries(await withMinDelay(superadminService.loadContactQueries()));
        setError(null);
      } catch (err) {
        // An empty inbox reads as "no one has written in" — say it failed.
        setError(err?.response?.data?.error || "Couldn't load the inbox.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactVersion]);

  // Mirror the list into the session cache so optimistic edits, sent messages,
  // status/assignment changes and socket refetches all survive to the next visit.
  useEffect(() => {
    superadminService.setContactQueriesCache(queries);
  }, [queries]);

  /* One write path for a single-field edit: the open conversation, the list row
     and the thread cache move together (the list cache follows via the
     write-through effect). Pure — callers capture the old value themselves from
     state they already hold, so rolling back is just patching it back. */
  const patchQuery = useCallback((id, patch) => {
    setDetail((d) => (d && d._id === id ? { ...d, ...patch } : d));
    setQueries((prev) => prev.map((c) => (c._id === id ? { ...c, ...patch } : c)));
    const cached = superadminService.getCachedContactQuery(id);
    if (cached) superadminService.setContactQueryCache({ ...cached, ...patch });
  }, []);

  /* real-time — THREAD-level only. The list refetch is driven by
     `contactVersion` from the realtime context; doing it here as well fired a
     second (redundant) request for every event, and could briefly flash the
     old cached rows back over an in-flight response. */
  useEffect(() => {
    if (!socket) return undefined;
    // A thread changed: if it's the one on screen, pull the fresh copy in (this
    // also refreshes its cache); otherwise just flag it so the next open knows
    // to revalidate instead of serving a stale cached conversation.
    // Our own actions come back to us on the same socket. We already hold the
    // server's response — re-fetching the thread we just wrote to was a second
    // round trip for a copy we had.
    const isEcho = (p) => p?.actorSocketId && p.actorSocketId === getSocketId();
    // A new message: the thread itself changed, so the open one is re-read.
    const onThreadChange = (p) => {
      if (!p?.id || isEcho(p)) return;
      if (selectedIdRef.current === p.id) {
        superadminService
          .loadContactQuery(p.id, { force: true })
          .then((q) => { if (selectedIdRef.current === p.id) setDetail(q); })
          .catch(() => {});
      } else {
        superadminService.markContactQueryStale(p.id);
      }
    };
    // A status change or a reassignment by another operator: exactly one field
    // moved and the event carries its new value, so this costs no request —
    // the row, the open conversation and the thread cache are patched in place.
    const onRowChange = (p) => {
      if (!p?.id || isEcho(p)) return;
      const patch = {};
      if (p.status !== undefined) patch.status = p.status;
      if (p.assignee !== undefined) patch.assignee = p.assignee || null;
      if (Object.keys(patch).length) patchQuery(p.id, patch);
    };
    const onDeleted = (p) => {
      if (!p?.id || isEcho(p)) return;
      superadminService.removeContactQueryCache(p.id);
      setQueries((prev) => prev.filter((c) => c._id !== p.id)); // another operator deleted it
      if (selectedIdRef.current === p.id) { setDetail(null); setSelectedId(null); }
    };
    socket.on("contactQuery:message", onThreadChange);
    socket.on("contactQuery:updated", onRowChange);
    socket.on("contactQuery:assigned", onRowChange);
    socket.on("contactQuery:deleted", onDeleted);
    return () => {
      socket.off("contactQuery:message", onThreadChange);
      socket.off("contactQuery:updated", onRowChange);
      socket.off("contactQuery:assigned", onRowChange);
      socket.off("contactQuery:deleted", onDeleted);
    };
  }, [socket, patchQuery]);

  // Leaving a conversation puts you back where you were in the list — losing
  // your place 400 rows down is the whole reason a full-screen detail view can
  // feel worse than a split pane.
  const closeQuery = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
  }, []);
  useLayoutEffect(() => {
    // Entering work mode the page shrinks to one viewport, so start at the top;
    // leaving it, put the overview back exactly where it was.
    if (selectedId) window.scrollTo({ top: 0 });
    else if (listScrollYRef.current) window.scrollTo({ top: listScrollYRef.current });
  }, [selectedId]);


  // Scroll the CONVERSATION column, not the element into view: scrollIntoView
  // walks up and scrolls every ancestor that can move, which yanked the whole
  // workspace. Opening a thread lands at the bottom instantly; a message that
  // arrives while you're there glides in.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [selectedId]);
  useEffect(() => {
    const el = threadRef.current;
    if (el && detail?.thread?.length) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [detail?.thread?.length]);

  /* selection */
  const openQuery = useCallback(
    async (c) => {
      listScrollYRef.current = window.scrollY;
      setSelectedId(c._id);
      dispatchComposer({ type: "reset" });
      setQueries((prev) => prev.map((x) => (x._id === c._id ? { ...x, unread: false } : x)));

      // Every response below is checked against this before it's applied. Walk
      // the queue quickly (j/k) and a slow response for query #3 could otherwise
      // land after #5 and put the wrong conversation on screen.
      const token = ++openTokenRef.current;
      const isCurrent = () => openTokenRef.current === token;

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
          superadminService
            .loadContactQuery(c._id, { force: true })
            .then((q) => { if (isCurrent()) setDetail(q); })
            .catch(() => {});
        }
      } else {
        setLoadingDetail(true);
        try {
          const q = await superadminService.loadContactQuery(c._id);
          if (isCurrent()) setDetail(q);
        } catch {
          if (isCurrent()) {
            toast.error("Failed to load conversation");
            setDetail(null);
          }
        } finally {
          if (isCurrent()) setLoadingDetail(false);
        }
      }
      // No unread-count request: the row was just marked read above, and the
      // publish effect pushes the new total to the badge.
    },
    [],
  );

  /* actions */
  const composerEmpty = useMemo(() => isRichEmpty(composer.body), [composer.body]);

  // Opening the composer should cost exactly what clicking into a textarea
  // costs — one click, caret already in it.
  const openComposer = useCallback((kind) => {
    dispatchComposer({ type: "open", kind });
    requestAnimationFrame(() => {
      const el = composerBoxRef.current?.querySelector('[contenteditable="true"]');
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false); // caret at the end, not in front of a draft
      const caret = window.getSelection(); // not `sel` — that's the open query
      caret?.removeAllRanges();
      caret?.addRange(range);
    });
  }, []);

  const handleSend = async () => {
    if (composerEmpty || !selectedId || composer.sending) return;
    const body = sanitizeRichText(composer.body);
    dispatchComposer({ type: "sending" });
    try {
      const res = await superadminService.addContactMessage(selectedId, {
        kind: composer.kind,
        body,
        mentions: composer.kind === "note" ? composer.mentions : [],
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
      dispatchComposer({ type: "sent" }); // clears + hands the height back to the thread
      if (composer.kind === "reply") {
        if (res.data.emailStatus === "failed") toast.error("Note saved, but the email to the submitter failed to send.");
        else toast.success("Reply sent to the submitter");
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to send message");
      dispatchComposer({ type: "failed" }); // keep the draft — it's the user's typing
    }
  };

  // ⌘/Ctrl+Enter sends; Escape folds an empty composer away (a draft is never
  // thrown away by a stray keypress — it just loses focus).
  const onComposerKeyDown = (e) => {
    // The editor's @mention menu handles its own Enter/Escape and marks them
    // handled — don't send a note or fold the box out from under it.
    if (e.defaultPrevented) return;
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      if (composerEmpty) dispatchComposer({ type: "close" });
      else e.currentTarget.querySelector('[contenteditable="true"]')?.blur();
    }
  };

  const handleSetStatus = async (status) => {
    const id = selectedId;
    // Optimistic, then undone locally if the server disagrees. Recovery used to
    // be a forced refetch of the WHOLE inbox to repair one field.
    const previous = detail?.status ?? queries.find((c) => c._id === id)?.status ?? "new";
    patchQuery(id, { status });
    try {
      await superadminService.updateContactQueryStatus(id, { status });
    } catch {
      toast.error("Failed to update status");
      patchQuery(id, { status: previous });
    }
  };

  const handleAssign = async (val) => {
    const id = selectedId;
    // Optimistic too, so the select doesn't sit on the old owner for a round
    // trip. The response is authoritative (its assignee is populated), so it's
    // applied on top rather than the local guess being trusted.
    const previous = detail?.assignee ?? queries.find((c) => c._id === id)?.assignee ?? null;
    const guess = val ? staff.find((s) => String(s._id) === String(val)) : null;
    patchQuery(id, { assignee: val ? { name: guess?.name || guess?.email || "…", userId: guess || val } : null });
    try {
      const res = await superadminService.assignContactQuery(id, val || null);
      patchQuery(id, { assignee: res.data.query.assignee });
    } catch {
      toast.error("Failed to assign");
      patchQuery(id, { assignee: previous });
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
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to delete query");
    } finally {
      setDeleting(false);
    }
  };

  /* derived list. The typed value drives the input; the DEFERRED value drives
     the filtering, so a keystroke paints immediately and the 1000-row re-filter
     + re-render happens at lower priority instead of blocking it. */
  const deferredSearch = useDeferredValue(searchTerm);
  const visible = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const rows = queries.filter((r) => {
      const matchesSearch =
        !q || r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.subject?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || (r.status || "new") === statusFilter;
      return matchesSearch && matchesStatus;
    });
    // Sort on a cached timestamp: the comparator ran `new Date()` twice per
    // comparison, i.e. ~2·n·log n Date parses per keystroke.
    return rows
      .map((r) => ({ r, t: new Date(r.lastMessageAt || r.createdAt || 0).getTime() }))
      .sort((a, b) => b.t - a.t)
      .map((x) => x.r);
  }, [queries, deferredSearch, statusFilter]);

  // One pass for every count on the screen — these were four separate scans of
  // `queries`, three of them re-running on every single render because they sat
  // in the render body (below the early returns, so they couldn't be memoised).
  const counts = useMemo(() => {
    let unread = 0;
    let neu = 0;
    let inProgress = 0;
    for (const c of queries) {
      if (c.unread) unread++;
      const status = c.status || "new";
      if (status === "new") neu++;
      else if (status === "in_progress") inProgress++;
    }
    return { unread, new: neu, inProgress, resolved: queries.length - neu - inProgress };
  }, [queries]);
  const unreadTotal = counts.unread;

  // While this screen is mounted it holds every query and its unread flag, so
  // it publishes the badge count instead of the console asking the server after
  // each open/send/delete. Sockets still refresh it from elsewhere.
  useEffect(() => {
    if (!loading) setContactUnread(unreadTotal);
  }, [unreadTotal, loading, setContactUnread]);

  // Big inboxes: one page of rows in the DOM at a time. The filters above are
  // the real answer to volume; this keeps the list cheap while you use them.
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const pageCount = Math.max(1, Math.ceil(visible.length / limit));
  const safePage = Math.min(page, pageCount);
  const listRows = useMemo(
    () => visible.slice((safePage - 1) * limit, safePage * limit),
    [visible, safePage, limit],
  );
  // Filtering re-shapes the set under you; start again at the top of it.
  useEffect(() => { setPage(1); }, [deferredSearch, statusFilter]);
  // Changing the page size moves the rows regardless, so go back to page 1.
  const changeLimit = useCallback((next) => {
    setLimit((cur) => (cur === next ? cur : next));
    setPage(1);
  }, []);

  // Paging from the bottom of a page otherwise drops you at the bottom of the
  // next one, reading its last rows first.
  const resultsTopRef = useRef(null);
  const lastPageRef = useRef(safePage);
  useEffect(() => {
    if (lastPageRef.current === safePage) return;
    lastPageRef.current = safePage;
    if (selectedId) railRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    else scrollToTopOf(resultsTopRef.current);
  }, [safePage, selectedId]);

  // Queue navigation. Triage is a queue, not a set of destinations — you should
  // be able to clear it front to back without returning to the list between
  // every message. Position is taken from the FILTERED list, so "4 of 12" means
  // what you're actually working through.
  const currentIndex = useMemo(() => visible.findIndex((q) => q._id === selectedId), [visible, selectedId]);
  const goRelative = useCallback(
    (delta) => {
      if (currentIndex < 0) return;
      const target = visible[currentIndex + delta];
      if (!target) return;
      // Walking off the end of a page turns it, so the rail keeps up with j/k.
      setPage(Math.floor((currentIndex + delta) / limit) + 1);
      openQuery(target);
    },
    [currentIndex, visible, limit, openQuery],
  );

  // Keep the open query visible in the rail as you move through the queue.
  useEffect(() => {
    if (!selectedId) return;
    railRef.current?.querySelector(`[data-row-id="${selectedId}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selectedId, listRows]);

  // Esc leaves the conversation — the way back out of a full-screen view has to
  // be reachable without aiming at the arrow. Ignored while the composer has a
  // draft: it owns Escape then (see onComposerKeyDown, which stops propagation).
  useEffect(() => {
    if (!selectedId) return undefined;
    const onKey = (e) => {
      if (e.defaultPrevented) return;
      // Escape belongs to whatever is layered on top first: the delete
      // confirmation, or an open dropdown (CustomSelect closes itself on the
      // same key without claiming the event).
      if (deleteTarget || document.querySelector('[role="listbox"]')) return;
      const t = e.target;
      const typing = t?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t?.tagName);
      if (e.key === "Escape") {
        // In the rail's search box Escape means "clear the filter" — leaving
        // the conversation from inside a field you're typing in is a surprise.
        if (typing) { if (searchTerm) { e.preventDefault(); setSearchTerm(""); } return; }
        closeQuery();
        return;
      }
      // j/k step through the queue — but never while someone is typing.
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "j" || e.key === "J") { e.preventDefault(); goRelative(1); }
      else if (e.key === "k" || e.key === "K") { e.preventDefault(); goRelative(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, deleteTarget, closeQuery, goRelative, searchTerm]);

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
  // An empty inbox and a failed load must not look the same — someone waiting
  // on a reply is exactly what this screen exists to surface.
  if (error) {
    return <SAErrorState message={error} onRetry={() => load({ force: true })} />;
  }

  const teamOptions = [{ value: "", label: "Unassigned" }, ...staff.map((t) => ({ value: t._id, label: t.name || t.email }))];
  const sel = detail;

  // Stat strip — the inbox loads the whole list client-side, so these counts are
  // exact (not page-scoped).
  const { new: newCount, inProgress: inProgressCount, resolved: resolvedCount } = counts;
  const statTiles = [
    { label: "Total queries", value: <AnimatedNumber value={queries.length} />, sub: `${resolvedCount} closed out`, icon: Inbox, color: "#6366f1" },
    { label: "Unread", value: <AnimatedNumber value={unreadTotal} />, sub: unreadTotal > 0 ? "waiting to be opened" : "all read", icon: Mail, color: unreadTotal > 0 ? "#ef4444" : "#9ca3af" },
    { label: "New", value: <AnimatedNumber value={newCount} />, sub: "not yet triaged", icon: MessageSquare, color: newCount > 0 ? "#f59e0b" : "#9ca3af" },
    { label: "In progress", value: <AnimatedNumber value={inProgressCount} />, sub: "being handled", icon: Clock, color: "#06b6d4" },
  ];

  return (
    // Sharp-corner variant: square every descendant's corners (cards, pills,
    // avatars, bubbles, inputs, modal) for an angular look — matches the
    // Organisations / Audit / Support-session screens — with a gradient hero on top.
    <MotionConfig reducedMotion="user">
    {/* TWO SEPARATE SECTIONS, never side by side.
        The inbox is a plain page-flow list — no box within a box to scroll —
        and opening a query swaps it for the conversation, which then owns the
        WHOLE workspace: no hero above it and no 320px rail beside it. That is
        what buys the thread enough height that opening the composer no longer
        squeezes it to a sliver. */}
    <div className="flex flex-col gap-3 [&_*]:!rounded-none sm:gap-4" style={{ "--radius-card": "0.75rem", "--radius-btn": "0.5rem" }}>
      {!selectedId ? (
      <>
      {/* Hero — gradient banner + attached stat strip (mirrors Organisations) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`${card} shrink-0 overflow-hidden`}
      >
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden px-5 py-4 sm:px-8 sm:py-6" style={{ background: HEADER_GRADIENT }}>
          {/* Editorial corner decoration — SVG circle (so the page-wide sharp-corner
              override can't square it) + dot grid. */}
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div aria-hidden className="pointer-events-none absolute bottom-4 right-12 h-10 w-24 opacity-[.20]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.95) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
          <div className="relative z-10 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Helpdesk</p>
            <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Contact Queries</h1>
            <p className="mt-1 hidden text-sm text-white/80 sm:block">Messages from your marketing site's contact form — triage, reply and assign.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-white/10 sm:grid-cols-4 sm:divide-y-0">
          {statTiles.map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.06, duration: 0.4, ease: "easeOut" }}
            >
              <HeaderStat {...t} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Section 1: the inbox ── full width, scrolls with the PAGE.
          No `overflow-hidden` here: it would make this box the sticky header's
          scrollport, and a box that never scrolls never sticks. */}
      <div className="flex w-full flex-col rounded-token border border-gray-100 bg-white shadow-sm dark:border-white/10">
        {/* Sticks under the topbar so search and filter stay reachable however
            far down the list you are. */}
        <div className="sticky top-16 z-10 border-b border-gray-100 bg-white p-3 dark:border-white/10 dark:bg-[var(--admin-card)] sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-primary"><Inbox className="h-4 w-4" /> Inbox</h2>
              <p className="text-[11px] text-text-muted">
                {visible.length} shown{unreadTotal > 0 ? ` · ${unreadTotal} unread` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => load({ force: true })} disabled={refreshing} aria-label="Refresh inbox" title="Refresh" className="grid h-9 w-9 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-50 dark:hover:bg-white/10">
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </button>
              <button type="button" onClick={exportToCSV} disabled={visible.length === 0} aria-label="Export queries as CSV" title="Export CSV" className="grid h-9 w-9 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-40 dark:hover:bg-white/10">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Full width now, so search and status sit side by side. */}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search name, email, subject…" className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white dark:border-white/10 dark:bg-white/5" />
            </div>
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[{ value: "all", label: "All status" }, ...STATUSES]}
              className="w-full sm:w-[190px] sm:shrink-0"
              triggerClassName="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]"
            />
          </div>
        </div>

        <div ref={resultsTopRef}>
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Inbox className="mb-3 h-9 w-9 text-text-muted" />
              <p className="text-sm text-text-muted">{queries.length === 0 ? "No contact queries yet." : "No queries match your filters."}</p>
            </div>
          ) : (
            <>
              {listRows.map((c) => (
                <QueryRow key={c._id} c={c} selected={selectedId === c._id} onOpen={openQuery} onDelete={setDeleteTarget} />
              ))}
              {/* The count shows whether or not there's more than one page —
                  "9 of 9" is the answer to "is that the whole inbox?" */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-50 px-3 py-2.5 dark:border-white/5 sm:px-4">
                <span className="font-mono text-[11px] text-text-muted">
                  {(safePage - 1) * limit + 1}–{(safePage - 1) * limit + listRows.length} of {visible.length}
                  {pageCount > 1 ? ` · page ${safePage} of ${pageCount}` : ""}
                </span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
                    <span className="hidden sm:inline">Rows</span>
                    <CustomSelect
                      value={limit}
                      onChange={(v) => changeLimit(Number(v))}
                      options={PAGE_SIZE_OPTIONS}
                      className="w-[68px]"
                      triggerClassName="w-full border border-gray-200 bg-white px-2 py-1 text-xs outline-none transition-colors hover:border-accent/60 focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]"
                    />
                  </span>
                  {pageCount > 1 ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        className="border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                        disabled={safePage >= pageCount}
                        className="border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      </>
      ) : (
      /* ── WORK MODE ── the list docks to a rail and the conversation opens
         beside it. The hero stays behind in the overview: in work mode those
         180px belong to the thread. Definite height on the split so both
         columns scroll inside themselves and the composer stays pinned;
         `max()` keeps a floor on a short window. Below lg there's no room for
         two columns, so the rail drops out and the back arrow carries you. */
      <div className="flex h-[max(calc(100dvh-7rem),560px)] flex-col gap-3 sm:gap-4">
      {/* Work-mode header. The full hero is an overview element — 180px is too
          much to pay while you're reading — but dropping it entirely took the
          page's identity and the list-level actions with it. This is the same
          header at a third of the height, and it keeps refresh/export reachable
          without going back. */}
      <div className="flex shrink-0 items-center gap-3 rounded-token border border-gray-100 bg-white px-3 py-2 shadow-sm dark:border-white/10 sm:px-4 sm:py-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center bg-accent/10 text-accent"><Inbox className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Helpdesk</p>
          <h1 className="truncate text-sm font-bold text-primary">Contact Queries</h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-3 text-[11px] text-text-muted sm:flex">
            <span><span className="font-semibold text-primary">{queries.length}</span> total</span>
            <span aria-hidden>·</span>
            <span><span className={cn("font-semibold", unreadTotal > 0 ? "text-accent" : "text-primary")}>{unreadTotal}</span> unread</span>
            <span aria-hidden>·</span>
            <span><span className="font-semibold text-primary">{newCount}</span> new</span>
          </span>
          <button type="button" onClick={() => load({ force: true })} disabled={refreshing} aria-label="Refresh inbox" title="Refresh" className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-50 dark:hover:bg-white/10">
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
          <button type="button" onClick={exportToCSV} disabled={visible.length === 0} aria-label="Export queries as CSV" title="Export CSV" className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-40 dark:hover:bg-white/10">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="hidden min-h-0 flex-col overflow-hidden rounded-token border border-gray-100 bg-white shadow-sm dark:border-white/10 lg:flex">
        <div className="shrink-0 border-b border-gray-100 p-2.5 dark:border-white/10">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">
              <Inbox className="h-3.5 w-3.5" /> Inbox · {visible.length}
            </h2>
            <button type="button" onClick={closeQuery} className="text-[11px] font-medium text-accent hover:underline">All queries</button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search…" aria-label="Search queries" className="w-full border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-2 text-xs outline-none transition-colors focus:border-accent focus:bg-white dark:border-white/10 dark:bg-white/5" />
          </div>
        </div>
        <div ref={railRef} className="scroll-slim min-h-0 flex-1 overflow-y-auto">
          {listRows.map((c) => (
            <QueryRow key={c._id} c={c} selected={selectedId === c._id} dense onOpen={openQuery} />
          ))}
        </div>
        {pageCount > 1 ? (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-100 px-2.5 py-2 dark:border-white/10">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
              className="grid h-6 w-6 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-30 dark:hover:bg-white/10"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-[10px] tabular-nums text-text-muted">{safePage} / {pageCount}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={safePage >= pageCount}
              aria-label="Next page"
              className="grid h-6 w-6 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-30 dark:hover:bg-white/10"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col">
        {!sel ? (
          <div className="flex h-full flex-col items-center justify-center rounded-token border border-dashed border-gray-200 bg-white/40 text-center dark:border-white/10 dark:bg-white/5">
            {loadingDetail ? (
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            ) : (
              <>
                <MessageSquare className="mb-3 h-10 w-10 text-text-muted" />
                <p className="text-sm font-medium text-primary">Opening…</p>
                <button type="button" onClick={closeQuery} className="mt-3 text-xs text-accent hover:underline">Back to inbox</button>
              </>
            )}
          </div>
        ) : (
          <motion.div key={sel._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex h-full flex-col overflow-hidden rounded-token border border-gray-100 bg-white shadow-sm dark:border-white/10">
            {/* header — WHO this is, and where you are in the queue. The two
                triage selects used to share this row and squeezed the name to
                "Zknfn F…"; they live on the facts strip below now, where the
                labels already are. */}
            <div className="shrink-0 border-b border-gray-100 p-3 dark:border-white/10 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <button type="button" onClick={closeQuery} aria-label="Back to inbox" title="Back to inbox (Esc)" className="grid h-9 w-9 shrink-0 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary dark:hover:bg-white/10">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <Avatar name={sel.name} size="sm" />
                {/* The SUBJECT is the thread's title — squeezed into a chip on
                    the strip below it was the first thing to truncate, while
                    the widest line on the screen said the sender's name twice
                    (here and in the rail). Sender moves to the sub-line. */}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-primary sm:text-base" title={sel.subject || ""}>
                    {sel.subject || "No subject"}
                  </h2>
                  <p className="flex min-w-0 items-center gap-1.5 text-xs">
                    <span className="max-w-[45%] shrink-0 truncate font-medium text-text-muted">{sel.name}</span>
                    <span className="text-text-muted/60" aria-hidden>·</span>
                    <a href={`mailto:${sel.email}`} className="min-w-0 truncate text-accent hover:underline" title={sel.email}>{sel.email}</a>
                  </p>
                </div>

                {/* Queue position + step. Clearing an inbox is a sequence; this
                    is what stops it being list → read → back → list → read. */}
                {currentIndex >= 0 ? (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button type="button" onClick={() => goRelative(-1)} disabled={currentIndex <= 0} aria-label="Previous query" title="Previous (K)" className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-30 dark:hover:bg-white/10">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <span className="min-w-[3.5rem] text-center text-[11px] tabular-nums text-text-muted">{currentIndex + 1} of {visible.length}</span>
                    <button type="button" onClick={() => goRelative(1)} disabled={currentIndex >= visible.length - 1} aria-label="Next query" title="Next (J)" className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-30 dark:hover:bg-white/10">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                <button type="button" onClick={() => setDeleteTarget(sel)} aria-label="Delete query" title="Delete query" className="grid h-9 w-9 shrink-0 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Toolbar strip: read-only facts on the left, the two fields you
                actually change on the right, tinted so it reads as a control
                bar rather than more content. Wraps instead of truncating. */}
            <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-100 bg-gray-50/60 px-3 py-2 text-xs dark:border-white/10 sm:px-4">
              <Meta icon={Clock} label="Received" value={fmtDateTime(sel.createdAt)} />
              <Meta icon={Mail} label="Replies" value={(sel.thread || []).filter((t) => t.kind === "reply").length} />
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden h-4 w-px bg-gray-200 dark:bg-white/10 sm:block" aria-hidden />
                <label className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  <UsersIcon className="h-3 w-3" /> <span className="hidden sm:inline">Assignee</span>
                </label>
                <CustomSelect
                  value={sel.assignee?.userId?._id || sel.assignee?.userId || ""}
                  onChange={handleAssign}
                  options={teamOptions}
                  searchable
                  searchPlaceholder="Search operators…"
                  placeholder="Unassigned"
                  className="w-[150px] shrink-0"
                  triggerClassName="w-full border border-gray-200 bg-white px-2.5 py-1 text-xs outline-none transition-colors hover:border-accent/60 focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]"
                />
                <label className="inline-flex shrink-0 items-center text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Status</label>
                <CustomSelect value={sel.status || "new"} onChange={handleSetStatus} options={STATUSES} className="w-[120px] shrink-0" triggerClassName="w-full border border-gray-200 bg-white px-2.5 py-1 text-xs outline-none transition-colors hover:border-accent/60 focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]" />
              </div>
            </div>

            <div ref={threadRef} className="scroll-slim min-h-0 flex-1 overflow-y-auto bg-gray-50/40 p-3 dark:bg-transparent sm:p-4">
              {/* Bottom-anchored, the way a conversation reads: a two-message
                  thread sits just above the composer instead of stranding a
                  screen of emptiness between them. min-h-full + justify-end
                  keeps a LONG thread scrolling normally from the top. */}
              <div className="flex min-h-full flex-col justify-end gap-4">
              {/* submitter's original message */}
              <div className="flex justify-start">
                <div className="max-w-[92%] sm:max-w-[88%]">
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
              </div>
            </div>

            {/* composer — folded to a single row until you actually write, so
                the conversation above keeps the height. Both entry points name
                what they do, so picking note-vs-reply is the same click that
                opens the editor: no mode to notice afterwards. */}
            <div ref={composerBoxRef} onKeyDown={onComposerKeyDown} className="shrink-0 border-t border-gray-100 p-3 dark:border-white/10">
              {!composer.open ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openComposer(composerEmpty ? "note" : composer.kind)}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 border px-3 py-2.5 text-left text-sm transition-colors",
                      composerEmpty
                        ? "border-gray-200 text-text-muted hover:border-accent/50 hover:text-primary dark:border-white/10"
                        : "border-accent/50 text-primary",
                    )}
                  >
                    {composerEmpty ? <Lock className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0 text-accent" />}
                    <span className="truncate">
                      {composerEmpty ? "Write an internal note…" : `Unsent ${composer.kind === "reply" ? "reply" : "note"} — pick up where you left off`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openComposer("reply")}
                    aria-label="Reply to submitter"
                    className="inline-flex shrink-0 items-center gap-2 bg-accent px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light sm:px-4"
                  >
                    <CornerUpLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Reply</span>
                  </button>
                </div>
              ) : (
                /* Mode switch, hint and send share ONE row under the editor —
                   it used to have a row of its own above, and every row here
                   comes straight off the thread's height. */
                <div>
                  <RichTextEditor
                    key={`${sel._id}-${composer.nonce}`}
                    value={composer.body}
                    onChange={(v) => dispatchComposer({ type: "body", body: v })}
                    mentionItems={composer.kind === "note" ? staff : null}
                    onMentions={(m) => dispatchComposer({ type: "mentions", mentions: m })}
                    placeholder={composer.kind === "reply" ? `Reply — this emails ${sel.email}` : "Write an internal note… use @ to mention an operator"}
                    editorClassName="min-h-[84px] max-h-[26vh] overflow-y-auto sm:min-h-[104px]"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="inline-flex overflow-hidden rounded-token-btn border border-gray-200 text-xs dark:border-white/10">
                      <button type="button" aria-pressed={composer.kind === "note"} onClick={() => dispatchComposer({ type: "kind", kind: "note" })} className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 font-medium transition-colors sm:px-3", composer.kind === "note" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50 dark:hover:bg-white/5")}>
                        <Lock className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Internal </span>note
                      </button>
                      <button type="button" aria-pressed={composer.kind === "reply"} onClick={() => dispatchComposer({ type: "kind", kind: "reply" })} className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 font-medium transition-colors sm:px-3", composer.kind === "reply" ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50 dark:hover:bg-white/5")}>
                        <CornerUpLeft className="h-3.5 w-3.5" /> Reply<span className="hidden sm:inline"> to submitter</span>
                      </button>
                    </div>
                    <p className="hidden items-center gap-1.5 text-[11px] text-text-muted lg:inline-flex">
                      {composer.kind === "reply" ? (<><Mail className="h-3.5 w-3.5 shrink-0" /> Emails the submitter</>) : (<><Lock className="h-3.5 w-3.5 shrink-0" /> Operators only</>)}
                      <span className="text-text-muted/70">· ⌘/Ctrl + Enter to send</span>
                    </p>
                    <button type="button" onClick={() => dispatchComposer({ type: "close" })} aria-label="Collapse composer" title="Collapse (Esc)" className="ml-auto grid h-9 w-9 shrink-0 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary dark:hover:bg-white/10">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={handleSend} disabled={composerEmpty || composer.sending} className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
                      {composer.sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {composer.kind === "reply" ? "Send reply" : "Add note"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
      </div>
      </div>
      )}

      {/* delete confirmation — rendered in a Portal (outside the sharp-corner
          wrapper), so it carries its own !rounded-none override. */}
      <Portal>
        <AnimatePresence>
          {deleteTarget && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 [&_*]:!rounded-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
    </MotionConfig>
  );
}

/* ── sub-components ───────────────────────────────────────────────────── */

/* One inbox row, in both places it appears: the full-width overview list and
   the 340px rail beside an open conversation. `dense` drops the e-mail (no
   room in the rail) and tightens the padding; the row keeps the same two-line
   shape either way, so docking the list doesn't re-teach it. */
const QueryRow = memo(function QueryRow({ c, selected, dense, onOpen, onDelete }) {
  return (
    <div className="group/row relative">
    <button
      type="button"
      data-row-id={c._id}
      onClick={() => onOpen(c)}
      title={c.email}
      aria-current={selected ? "true" : undefined}
      style={selected ? { backgroundColor: "rgba(var(--tenant-accent-rgb, 16, 185, 129), 0.14)" } : undefined}
      className={cn(
        "relative flex w-full items-center gap-3 border-b border-gray-50 text-left transition-colors dark:border-white/5",
        dense ? "px-2.5 py-2" : "px-3 py-2.5 sm:px-4",
        onDelete && "pr-11 sm:pr-12",
        !selected && "hover:bg-gray-50/70 dark:hover:bg-white/5",
      )}
    >
      {selected ? <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: "var(--tenant-accent, #10b981)" }} aria-hidden="true" /> : null}
      <Avatar name={c.name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn("flex min-w-0 items-center gap-1.5 text-[13px]", c.unread ? "font-bold" : "font-semibold", selected ? "text-accent" : "text-primary")}>
            {c.unread ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="Unread" /> : null}
            <span className={cn("truncate", !dense && "max-w-[16rem]")}>{c.name}</span>
          </p>
          {!dense ? <span className="hidden min-w-0 truncate text-[11px] text-text-muted sm:inline">{c.email}</span> : null}
          <span className="ml-auto shrink-0 text-[10px] text-text-muted">{timeAgo(c.lastMessageAt || c.createdAt)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[11px] text-text-muted">{c.subject || c.email}</p>
          {c.assignee?.name ? <Avatar name={c.assignee.name} src={c.assignee.userId?.profileImage} size="xs" /> : null}
          <StatusBadge status={c.status} />
        </div>
      </div>
    </button>
    {/* Delete lives OUTSIDE the row button — nesting one button inside another
        is invalid and the click would open the query on its way past. Hidden
        until hover/focus so a destructive action isn't the loudest thing in a
        list you're only reading, but always reachable by keyboard. */}
    {onDelete ? (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(c); }}
        aria-label={`Delete query from ${c.name}`}
        title="Delete query"
        className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 focus-visible:opacity-100 group-hover/row:opacity-100 dark:hover:bg-red-500/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    ) : null}
    </div>
  );
});

/* One fact on a single line — label then value — so the three of them wrap into
   a strip instead of a card. `grow` gives the subject the leftover width. */
function Meta({ icon: Icon, label, value, grow }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", grow && "min-w-[8rem] flex-1")}>
      <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        {Icon ? <Icon className="h-3 w-3" /> : null} {label}
      </span>
      <span className="truncate text-gray-800" title={value != null ? String(value) : ""}>{value || value === 0 ? value : "—"}</span>
    </span>
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
