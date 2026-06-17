import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Bug, Sparkles, ChevronLeft, ChevronRight, Building2, GripVertical, MessageSquare, Inbox } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SAPageHeader from "../components/SAPageHeader";
import SALoader from "../SALoader";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

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

export default function KanbanBoard() {
  // Hydrate from the session cache so revisits are instant (no loader flash) —
  // null cache = first visit (show the loader).
  const cachedBoard = superadminService.getTicketBoardCached();
  const [board, setBoard] = useState(cachedBoard || EMPTY);
  const [loading, setLoading] = useState(!cachedBoard);
  const [tab, setTab] = useState("bug"); // "bug" | "feature"
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const colRefs = useRef({});

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
  const total = ORDER.reduce((s, c) => s + (lanes[c]?.length || 0), 0);

  return (
    <div>
      <SAPageHeader
        eyebrow="Helpdesk"
        title="Kanban"
        subtitle="Triaged bugs and feature requests across all tenants."
        actions={
          <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10">
            <button onClick={() => setTab("bug")} className={cn("inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-colors", tab === "bug" ? "bg-accent text-white" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5")}><Bug className="h-4 w-4" /> Bugs</button>
            <button onClick={() => setTab("feature")} className={cn("inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-colors", tab === "feature" ? "bg-accent text-white" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5")}><Sparkles className="h-4 w-4" /> Features</button>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-400">
          Drag cards between columns, or hover a card for the arrows · <span className="font-semibold text-gray-500">{total}</span> {tab === "bug" ? "bug" : "feature"} ticket{total === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          {Object.values(PRIORITY).map((p) => (
            <span key={p.label} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: p.dot }} />{p.label}</span>
          ))}
        </div>
      </div>

      {loading ? (
        <SALoader />
      ) : total === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white py-20 text-center shadow-sm">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No {tab === "bug" ? "bugs" : "feature requests"} on the board yet</p>
          <p className="mt-1 text-xs text-gray-400">Classify tickets as “{tab}” on the Support Tickets screen to add them here.</p>
        </div>
      ) : (
        <LayoutGroup>
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
            {COLUMNS.map((col) => {
              const items = lanes[col.key] || [];
              const isOver = overCol === col.key && dragId && !items.some((t) => t._id === dragId);
              return (
                <div
                  key={col.key}
                  ref={(el) => (colRefs.current[col.key] = el)}
                  className={cn(
                    "relative overflow-hidden rounded-xl border transition-colors duration-200",
                    isOver ? "border-accent/50 bg-accent/[0.06]" : "border-gray-100 bg-gray-50/60 dark:border-white/10 dark:bg-white/5",
                  )}
                >
                  <div className="h-1 w-full" style={{ background: col.color }} />
                  <div className="p-3">
                    {/* Column header */}
                    <div className="mb-3 flex items-center justify-between px-0.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.color }} />
                        <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                      </div>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-500 shadow-sm dark:bg-white/10">{items.length}</span>
                    </div>

                    {/* Cards */}
                    <motion.div layout="position" transition={GLIDE} className="min-h-[80px] space-y-2.5">
                      <AnimatePresence initial={false}>
                        {isOver ? (
                          <motion.div
                            key="placeholder"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 68 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={GLIDE}
                            className="rounded-lg border-2 border-dashed border-accent/40 bg-accent/5"
                          />
                        ) : null}
                      </AnimatePresence>

                      {items.map((t) => {
                        const prio = PRIORITY[t.priority] || PRIORITY.low;
                        const idx = ORDER.indexOf(col.key);
                        const dragging = dragId === t._id;
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
                            onDragStart={() => setDragId(t._id)}
                            onDrag={(e, info) => { const { x, y } = pointXY(e, info); const k = colAtPoint(x, y); setOverCol((p) => (p === k ? p : k)); }}
                            onDragEnd={(e, info) => { const { x, y } = pointXY(e, info); const k = colAtPoint(x, y); setDragId(null); setOverCol(null); if (k && k !== t.kanbanStatus) moveTo(t, k); }}
                            whileDrag={{ scale: 1.03, boxShadow: "0 16px 30px -10px rgba(0,0,0,0.28)", cursor: "grabbing" }}
                            style={{ zIndex: dragging ? 50 : 1 }}
                            className={cn(
                              "group relative cursor-grab touch-none select-none rounded-lg border border-gray-100 bg-white p-3 pl-4 shadow-sm transition-shadow hover:shadow-md dark:border-white/10",
                              dragging && "shadow-xl",
                            )}
                          >
                            <span className="pointer-events-none absolute inset-y-2.5 left-1.5 w-1 rounded-full" style={{ background: prio.dot }} />

                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide", prio.badge)}>{prio.label}</span>
                              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                {t.comments?.length ? <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{t.comments.length}</span> : null}
                                <span>{timeAgo(t.createdAt)}</span>
                                <GripVertical className="h-3.5 w-3.5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
                              </div>
                            </div>

                            <p className="line-clamp-2 text-[13px] font-medium leading-snug text-gray-900">{t.summary}</p>

                            <div className="mt-2.5 flex items-center justify-between">
                              <span className="inline-flex min-w-0 items-center gap-1 font-mono text-[10px] text-gray-400"><Building2 className="h-3 w-3 shrink-0" /><span className="truncate">{t.organisationId?.slug || "—"}</span> · #{t.ticketNumber}</span>
                              <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => moveDir(t, -1)} disabled={idx === 0} title="Move left" className="grid h-6 w-6 place-items-center rounded-md text-gray-400 hover:bg-gray-100 disabled:opacity-0 dark:hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
                                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => moveDir(t, 1)} disabled={idx === ORDER.length - 1} title="Move right" className="grid h-6 w-6 place-items-center rounded-md text-gray-400 hover:bg-gray-100 disabled:opacity-0 dark:hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}

                      {items.length === 0 && !isOver ? (
                        <p className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-xs text-gray-300 dark:border-white/10">Empty</p>
                      ) : null}
                    </motion.div>
                  </div>
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
