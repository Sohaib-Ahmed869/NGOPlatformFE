import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Bug, Sparkles, ChevronLeft, ChevronRight, Building2, MessageSquare, Inbox, Search, RefreshCw, ArrowUpRight, Layers, Clock } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import { ticketSourceMeta } from "../../config/ticketSource";
import SALoader from "../SALoader";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

const card = "border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
// Brand hero gradient — the platform palette (same vars as the sidebar),
// mirroring the Organisations / Audit / Support-session / Contact hero.
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";

// Resolve a stored avatar path (relative upload, absolute URL or data-URI).
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const resolveAvatar = (p) =>
  !p || String(p).includes("/api/placeholder")
    ? ""
    : /^https?:\/\//i.test(p) || String(p).startsWith("data:")
      ? p
      : `${API_BASE}/${String(p).replace(/\\/g, "/").replace(/^\/+/, "")}`;
const initials = (n) => (n || "?").trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();

const COLUMNS = [
  { key: "todo", label: "To do", color: "#94a3b8" },
  { key: "in_progress", label: "In progress", color: "#f59e0b" },
  { key: "done", label: "Done", color: "#10b981" },
];
const ORDER = ["todo", "in_progress", "done"];
const PRIORITY = {
  low: { dot: "#9ca3af", label: "Low", badge: "bg-gray-100 text-gray-500" },
  medium: { dot: "#0ea5e9", label: "Medium", badge: "bg-sky-50 text-sky-700" },
  high: { dot: "#f97316", label: "High", badge: "bg-orange-50 text-orange-700" },
  critical: { dot: "#ef4444", label: "Critical", badge: "bg-red-50 text-red-700" },
};
const EMPTY = { bug: { todo: [], in_progress: [], done: [] }, feature: { todo: [], in_progress: [], done: [] } };
// Smooth, no-bounce easing for the card reflow when the board changes.
const GLIDE = { type: "tween", duration: 0.26, ease: [0.22, 1, 0.36, 1] };

function timeAgo(d) {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24); if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

/* Stat cell in the attached strip under the hero banner (Organisations look). */
function HeaderStat({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${color}1a`, color }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none text-gray-900 dark:text-white">{value}</p>
        <p className="mt-1 text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const navigate = useNavigate();
  // Hydrate from the session cache so revisits are instant (no loader flash) —
  // null cache = first visit (show the loader).
  const cachedBoard = superadminService.getTicketBoardCached();
  const [board, setBoard] = useState(cachedBoard || EMPTY);
  const [loading, setLoading] = useState(!cachedBoard);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("bug"); // "bug" | "feature"
  const [search, setSearch] = useState("");
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const colRefs = useRef({});
  // Set true while a drag is in flight so the click that follows a drop doesn't
  // also navigate to the ticket (drag-vs-click disambiguation).
  const dragMovedRef = useRef(false);

  // Background/forced refresh (failed-move fallback + revalidate on revisit) —
  // never toggles the full-page loader; that's owned by the first-visit path.
  const fetchBoard = useCallback(async ({ force = true } = {}) => {
    try {
      const data = await superadminService.loadTicketBoard({ force });
      setBoard(data || EMPTY);
    } catch {
      toast.error("Failed to load board");
    }
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await fetchBoard({ force: true });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (superadminService.getTicketBoardCached()) {
      // Cached → render instantly, then silently revalidate (the board can change
      // on the Support Tickets screen while we're away).
      fetchBoard({ force: true });
    } else {
      // First, uncached visit → show the loader.
      (async () => {
        try {
          setBoard((await superadminService.loadTicketBoard()) || EMPTY);
        } catch {
          toast.error("Failed to load board");
        } finally {
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror optimistic drag-moves into the session cache so a revisit shows the
  // latest board instantly (then the background revalidate confirms it).
  useEffect(() => {
    superadminService.setTicketBoardCache(board);
  }, [board]);

  const moveTo = async (ticket, targetCol) => {
    if (!ticket || ticket.kanbanStatus === targetCol) return;
    const lane = ticket.triage; // "bug" | "feature"
    setBoard((prev) => {
      if (!prev[lane]) return prev;
      const next = { bug: { ...prev.bug }, feature: { ...prev.feature } };
      ORDER.forEach((c) => { next[lane][c] = (prev[lane][c] || []).filter((t) => t._id !== ticket._id); });
      next[lane][targetCol] = [{ ...ticket, kanbanStatus: targetCol }, ...next[lane][targetCol]];
      return next;
    });
    try {
      await superadminService.triageTicket(ticket._id, { kanbanStatus: targetCol });
    } catch {
      toast.error("Failed to move");
      fetchBoard();
    }
  };

  const moveDir = (ticket, dir) => {
    const next = ORDER[ORDER.indexOf(ticket.kanbanStatus) + dir];
    if (next) moveTo(ticket, next);
  };

  // Which column is under this viewport point? (pointer drag hit-test)
  const colAtPoint = (x, y) => {
    for (const col of COLUMNS) {
      const el = colRefs.current[col.key];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return col.key;
    }
    return null;
  };
  const pointXY = (event, info) =>
    event && typeof event.clientX === "number" ? { x: event.clientX, y: event.clientY } : { x: info.point.x, y: info.point.y };

  const lanes = board[tab] || EMPTY.bug;
  const laneCount = (lane) => ORDER.reduce((s, c) => s + (board[lane]?.[c]?.length || 0), 0);
  const bugCount = laneCount("bug");
  const featureCount = laneCount("feature");
  const total = ORDER.reduce((s, c) => s + (lanes[c]?.length || 0), 0);

  // Board-wide overview (both lanes) for the hero stat strip — stable across tabs.
  const inProgressAll = (board.bug?.in_progress?.length || 0) + (board.feature?.in_progress?.length || 0);
  const statTiles = [
    { label: "Total tickets", value: bugCount + featureCount, icon: Layers, color: "#6366f1" },
    { label: "Bugs", value: bugCount, icon: Bug, color: "#ef4444" },
    { label: "Feature requests", value: featureCount, icon: Sparkles, color: "#8b5cf6" },
    { label: "In progress", value: inProgressAll, icon: Clock, color: "#f59e0b" },
  ];

  // Free-text board filter (client-side over the loaded lane).
  const q = search.trim().toLowerCase();
  const matches = (t) =>
    !q ||
    `${t.summary || ""} ${t.ticketNumber || ""} ${t.organisationId?.slug || ""} ${t.organisationId?.name || ""}`
      .toLowerCase()
      .includes(q);

  // A clean click opens the ticket; a drag-then-release does not (see dragMovedRef).
  const openTicket = (t) => {
    if (dragMovedRef.current) { dragMovedRef.current = false; return; }
    navigate(`/tickets/${t._id}`);
  };

  return (
    // Sharp-corner variant: square every descendant's corners for an angular look.
    <div className="[&_*]:!rounded-none">
      {/* Hero — gradient banner + attached stat strip (matches the other screens) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`${card} mb-6 overflow-hidden`}
      >
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          {/* Editorial corner decoration — SVG circle (so the page-wide sharp-corner
              override can't square it) + dot grid. */}
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div aria-hidden className="pointer-events-none absolute bottom-4 right-12 h-10 w-24 opacity-[.20]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.95) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
          <div className="relative z-10 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Helpdesk</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Kanban board</h1>
            <p className="mt-1 text-sm text-white/80">Triage bugs and feature requests across every tenant.</p>
          </div>
        </div>
        {!loading && (
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-white/10 sm:grid-cols-4 sm:divide-y-0">
            {statTiles.map((t) => (
              <HeaderStat key={t.label} {...t} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Toolbar — lane tabs (with live counts) + priority key, search and refresh */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {[
            { key: "bug", icon: Bug, label: "Bugs", count: bugCount },
            { key: "feature", icon: Sparkles, label: "Features", count: featureCount },
          ].map(({ key, icon: Icon, label, count }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "inline-flex items-center gap-2 border px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-accent bg-accent text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70",
                )}
              >
                <Icon className="h-4 w-4" /> {label}
                <span className={cn("min-w-[1.25rem] px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums", active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/60")}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden items-center gap-3 text-[11px] text-gray-400 lg:flex">
            {Object.values(PRIORITY).map((p) => (
              <span key={p.label} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: p.dot }} />{p.label}</span>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the board…"
              className="w-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/85 sm:w-52"
            />
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            title="Refresh board"
            className="grid h-9 w-9 shrink-0 place-items-center border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {loading ? (
        <SALoader />
      ) : total === 0 ? (
        <div className={`${card} py-20 text-center`}>
          <Inbox className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No {tab === "bug" ? "bugs" : "feature requests"} on the board yet</p>
          <p className="mt-1 text-xs text-gray-400">Classify tickets as “{tab}” on the Support Tickets screen to add them here.</p>
        </div>
      ) : (
        <LayoutGroup>
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
            {COLUMNS.map((col) => {
              const items = (lanes[col.key] || []).filter(matches);
              const isOver = overCol === col.key && dragId && !items.some((t) => t._id === dragId);
              return (
                <div
                  key={col.key}
                  ref={(el) => (colRefs.current[col.key] = el)}
                  className={cn(
                    "relative flex flex-col overflow-hidden border transition-colors duration-200",
                    isOver ? "border-accent/60 bg-accent/[0.06]" : "border-gray-200 bg-gray-50/70 dark:border-white/10 dark:bg-white/[0.03]",
                  )}
                >
                  <div className="h-1 w-full" style={{ background: col.color }} />
                  {/* Column header */}
                  <div className="flex items-center justify-between border-b border-gray-100 px-3.5 py-2.5 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.color }} />
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-white/80">{col.label}</h3>
                    </div>
                    <span className="px-2 py-0.5 text-[11px] font-bold tabular-nums" style={{ background: `${col.color}1f`, color: col.color }}>{items.length}</span>
                  </div>

                  {/* Cards */}
                  <motion.div layout="position" transition={GLIDE} className="min-h-[120px] space-y-2.5 p-3">
                    <AnimatePresence initial={false}>
                      {isOver ? (
                        <motion.div
                          key="placeholder"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 76 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={GLIDE}
                          className="border-2 border-dashed border-accent/50 bg-accent/5"
                        />
                      ) : null}
                    </AnimatePresence>

                    {items.map((t) => {
                      const prio = PRIORITY[t.priority] || PRIORITY.low;
                      const src = ticketSourceMeta(t.reporter);
                      const SrcIcon = src.icon;
                      const idx = ORDER.indexOf(col.key);
                      const dragging = dragId === t._id;
                      const assignee = t.assignee?.userId;
                      return (
                        <motion.div
                          key={t._id}
                          layoutId={t._id}
                          layout
                          initial={false}
                          transition={{ layout: GLIDE }}
                          drag
                          dragSnapToOrigin
                          dragElastic={0.16}
                          onDragStart={() => { dragMovedRef.current = true; setDragId(t._id); }}
                          onDrag={(e, info) => { const { x, y } = pointXY(e, info); const k = colAtPoint(x, y); setOverCol((p) => (p === k ? p : k)); }}
                          onDragEnd={(e, info) => { const { x, y } = pointXY(e, info); const k = colAtPoint(x, y); setDragId(null); setOverCol(null); if (k && k !== t.kanbanStatus) moveTo(t, k); requestAnimationFrame(() => { dragMovedRef.current = false; }); }}
                          onClick={() => openTicket(t)}
                          whileDrag={{ scale: 1.03, boxShadow: "0 16px 30px -10px rgba(0,0,0,0.28)", cursor: "grabbing" }}
                          style={{ zIndex: dragging ? 50 : 1 }}
                          title="Open ticket"
                          className={cn(
                            "group relative cursor-pointer touch-none select-none border border-gray-200 bg-white p-3 pl-4 shadow-sm transition-all hover:border-accent/50 hover:shadow-md dark:border-white/10 dark:bg-[var(--admin-card)]",
                            dragging && "cursor-grabbing shadow-xl",
                          )}
                        >
                          {/* priority spine */}
                          <span className="pointer-events-none absolute inset-y-0 left-0 w-1" style={{ background: prio.dot }} title={`${prio.label} priority`} />

                          {/* identity row: #id + source, open affordance */}
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="font-mono text-[11px] font-semibold text-gray-400">#{t.ticketNumber}</span>
                              <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold", src.badge)} title={src.description}><SrcIcon className="h-2.5 w-2.5" />{src.label}</span>
                            </div>
                            <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
                          </div>

                          <p className="line-clamp-2 text-[13px] font-medium leading-snug text-gray-900 dark:text-white">{t.summary}</p>

                          {/* footer: tenant + meta + assignee */}
                          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-gray-100 pt-2 dark:border-white/10">
                            <span className="inline-flex min-w-0 items-center gap-1 font-mono text-[10px] text-gray-400"><Building2 className="h-3 w-3 shrink-0" /><span className="truncate">{t.organisationId?.slug || "—"}</span></span>
                            <div className="flex shrink-0 items-center gap-2 text-[10px] text-gray-400">
                              {t.comments?.length ? <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{t.comments.length}</span> : null}
                              <span>{timeAgo(t.createdAt)}</span>
                              {assignee ? (
                                resolveAvatar(assignee.profileImage) ? (
                                  <img src={resolveAvatar(assignee.profileImage)} alt={assignee.name} title={`Assigned to ${assignee.name}`} className="h-5 w-5 object-cover ring-1 ring-gray-200 dark:ring-white/10" />
                                ) : (
                                  <span title={`Assigned to ${assignee.name}`} className="grid h-5 w-5 place-items-center bg-accent/10 text-[8px] font-bold uppercase text-accent">{initials(assignee.name)}</span>
                                )
                              ) : null}
                            </div>
                          </div>

                          {/* hover move controls (top-right; don't trigger open/drag) */}
                          <div className="absolute right-1.5 top-7 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); moveDir(t, -1); }} disabled={idx === 0} title="Move to previous column" className="grid h-6 w-6 place-items-center bg-white text-gray-400 shadow-sm ring-1 ring-gray-200 transition-colors hover:text-gray-700 disabled:opacity-0 dark:bg-white/10 dark:ring-white/10 dark:hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
                            <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); moveDir(t, 1); }} disabled={idx === ORDER.length - 1} title="Move to next column" className="grid h-6 w-6 place-items-center bg-white text-gray-400 shadow-sm ring-1 ring-gray-200 transition-colors hover:text-gray-700 disabled:opacity-0 dark:bg-white/10 dark:ring-white/10 dark:hover:text-white"><ChevronRight className="h-4 w-4" /></button>
                          </div>
                        </motion.div>
                      );
                    })}

                    {items.length === 0 && !isOver ? (
                      <p className="border border-dashed border-gray-200 py-7 text-center text-xs text-gray-300 dark:border-white/10">{q ? "No matches" : "Empty"}</p>
                    ) : null}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </LayoutGroup>
      )}
    </div>
  );
}

// On a Vite hot-reload the service module survives, so its board cache would keep
// serving stale data. Drop it on dispose → the remounted screen re-fetches from
// the API and updates state. Dev-only: stripped from production builds.
if (import.meta.hot) {
  import.meta.hot.dispose(() => superadminService.clearTicketBoardCache());
}
