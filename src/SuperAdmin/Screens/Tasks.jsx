import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence, LayoutGroup, MotionConfig } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  ListChecks,
  Search,
  RefreshCw,
  Plus,
  Inbox,
  AlarmClock,
  CalendarDays,
  CheckCircle2,
  List as ListIcon,
  KanbanSquare,
  Trash2,
  X,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import { useSARealtime } from "../context/SARealtimeContext";
import { useAuth } from "../../context/AuthContext";
import { CustomSelect } from "../../components/CustomSelect";
import SAErrorState from "../components/SAErrorState";
import SATableHead from "../components/SATableHead";
import SAPagination from "../components/SAPagination";
import { useTableSort } from "../utils/tableSort";
import { DEFAULT_PAGE_SIZE } from "../utils/paging";
import SALoader from "../SALoader";
import { useConfirm } from "../components/ConfirmProvider";
import AnimatedNumberBase from "../components/AnimatedNumber";
import { cn } from "../../utils/cn";
import {
  TASK_STATUSES,
  TASK_TYPES,
  TASK_PRIORITIES,
  BOARD_STATUSES,
  isTerminal,
} from "../../config/taskOptions";
import {
  card,
  HEADER_GRADIENT,
  HeaderStat,
  StatusBadge,
  PriorityTag,
  TypeIcon,
  DueLabel,
  ChecklistProgress,
  AssigneeLabel,
  RelatedLead,
  TaskCard,
} from "../components/taskShared";

const AnimatedNumber = (props) => <AnimatedNumberBase duration={0.6} {...props} />;
const GLIDE = { type: "tween", duration: 0.26, ease: [0.22, 1, 0.36, 1] };

const TASK_TH = "px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400";
const TASK_COLUMNS = [
  { label: "", className: `${TASK_TH} w-10` }, // selection checkbox
  { label: "Task", key: "title", defaultDir: "asc", className: TASK_TH },
  { label: "Related", className: TASK_TH },
  { label: "Assignee", className: TASK_TH },
  { label: "Due", key: "due", defaultDir: "asc", className: TASK_TH },
  { label: "Priority", key: "priority", defaultDir: "desc", className: TASK_TH },
  { label: "Status", key: "status", className: TASK_TH },
  { label: "", className: TASK_TH },
];

/**
 * The same columns read off a loaded row, so a header click re-orders what is
 * on screen immediately rather than after a round trip. The server is still
 * asked — only it can order the tasks that aren't on this page.
 *
 * `due` sorts undated tasks LAST, matching NO_DUE_SENTINEL on the server. If
 * this returned null for them the browser would float them to the top for the
 * moment before the server's answer arrived, and the list would visibly jump.
 */
const TASK_SORT_ACCESSORS = {
  title: (t) => t.title,
  due: (t) => (t.dueAt ? new Date(t.dueAt).getTime() : Number.MAX_SAFE_INTEGER),
  priority: (t) => ["low", "normal", "high", "urgent"].indexOf(t.priority),
  status: (t) => t.status,
};

/** Triage chips — the axis an operator actually opens this screen on. */
const DUE_FILTERS = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "none", label: "No date" },
];

export default function Tasks() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { tasksVersion, refreshMyTasksDue } = useSARealtime();
  const [params, setParams] = useSearchParams();

  // The view and the filters live in the URL. A task list is something an
  // operator sends to a colleague ("look at the overdue ones") and comes back
  // to after opening a task — both of which lose the filter entirely if it only
  // exists in component state.
  const tab = params.get("view") === "board" ? "board" : "list";
  const statusFilter = params.get("status") || "open";
  const priorityFilter = params.get("priority") || "all";
  const typeFilter = params.get("type") || "all";
  const assigneeFilter = params.get("assignee") || "all";
  const dueFilter = params.get("due") || "all";

  const updateParams = useCallback(
    (patch) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([k, v]) => {
            if (v === null || v === undefined || v === "") next.delete(k);
            else next.set(k, v);
          });
          // Any filter change re-shapes the result set, so the page number
          // stops meaning anything.
          if (!("page" in patch)) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  const setTab = (next) => updateParams({ view: next === "board" ? "board" : null });

  const [staff, setStaff] = useState([]);
  useEffect(() => {
    superadminService.loadTaskStaff().then(setStaff).catch(() => {});
  }, []);

  /* ── stats ── */
  const [stats, setStats] = useState(superadminService.getTaskStatsCached());
  const loadStats = useCallback(async ({ force = false } = {}) => {
    try {
      setStats(await superadminService.loadTaskStats({ force }));
    } catch {
      /* the tiles are context, not the screen — a failure here shouldn't blank it */
    }
  }, []);
  useEffect(() => { loadStats({ force: true }); }, [loadStats, tasksVersion]);

  /* ── list ── */
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({});
  const [listLoading, setListLoading] = useState(true);
  const [revalidating, setRevalidating] = useState(false);
  const [listError, setListError] = useState(null);
  const [search, setSearch] = useState(params.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(params.get("search") || "");
  const page = Math.max(1, parseInt(params.get("page"), 10) || 1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState({ key: "due", dir: "asc" });
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState(() => new Set());
  const lastViewKeyRef = useRef(null);

  useEffect(() => {
    const next = search.trim();
    if (next === debouncedSearch) return undefined;
    const t = setTimeout(() => {
      setDebouncedSearch(next);
      updateParams({ search: next || null });
    }, 300);
    return () => clearTimeout(t);
  }, [search, debouncedSearch, updateParams]);

  const queryParams = useMemo(() => {
    const q = { page, limit, sort: sort.key, dir: sort.dir, status: statusFilter };
    if (debouncedSearch) q.search = debouncedSearch;
    if (priorityFilter !== "all") q.priority = priorityFilter;
    if (typeFilter !== "all") q.type = typeFilter;
    if (assigneeFilter !== "all") q.assignee = assigneeFilter;
    if (dueFilter !== "all") q.due = dueFilter;
    return q;
  }, [page, limit, sort, statusFilter, debouncedSearch, priorityFilter, typeFilter, assigneeFilter, dueFilter]);

  useEffect(() => {
    if (tab !== "list") return undefined;
    // Identity of the CONTENT, without the ordering or the window into it —
    // paging or re-sorting the same set is navigation within one view and must
    // not blank the table for the full-screen loader.
    const viewKey = JSON.stringify([debouncedSearch, statusFilter, priorityFilter, typeFilter, assigneeFilter, dueFilter]);
    const sameView = lastViewKeyRef.current === viewKey;
    const controller = new AbortController();
    let alive = true;
    (async () => {
      if (sameView) setRevalidating(true); else setListLoading(true);
      try {
        const data = await superadminService.loadTasks(queryParams, { signal: controller.signal });
        if (!alive) return;
        const { tasks: rows = [], pagination: pg = {} } = data || {};
        if (page > 1 && page > (pg.pages || 0)) {
          updateParams({ page: Math.max(1, pg.pages || 1) });
          return;
        }
        setTasks(rows);
        setPagination(pg);
        setListError(null);
        lastViewKeyRef.current = viewKey;
      } catch (err) {
        if (!alive || axios.isCancel(err)) return;
        const msg = err?.response?.data?.error || "Couldn't load tasks.";
        if (sameView) toast.error(msg); else setListError(msg);
      } finally {
        if (alive) { setListLoading(false); setRevalidating(false); }
      }
    })();
    return () => { alive = false; controller.abort(); };
  }, [tab, queryParams, page, debouncedSearch, statusFilter, priorityFilter, typeFilter, assigneeFilter, dueFilter, refreshKey, tasksVersion, updateParams]);

  const sortedTasks = useTableSort(tasks, sort, TASK_SORT_ACCESSORS);

  // Selecting a row and then filtering it away would leave it silently included
  // in the next bulk action. Anything no longer on screen drops out.
  useEffect(() => {
    setSelected((prev) => {
      if (!prev.size) return prev;
      const visible = new Set(tasks.map((t) => t._id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [tasks]);

  const changeSort = useCallback((next) => {
    setSort(next);
    updateParams({ page: null });
  }, [updateParams]);
  const changeLimit = useCallback((next) => {
    setLimit((cur) => (cur === next ? cur : next));
    updateParams({ page: null });
  }, [updateParams]);

  /* ── board ── */
  const [board, setBoard] = useState(superadminService.getTaskBoardCached() || {});
  const [boardLoading, setBoardLoading] = useState(!superadminService.getTaskBoardCached());
  const [boardError, setBoardError] = useState(null);
  const [boardRefreshing, setBoardRefreshing] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const colRefs = useRef({});
  const dragMovedRef = useRef(false);
  const movingRef = useRef(new Set());

  const boardParams = useMemo(() => {
    const q = {};
    if (assigneeFilter !== "all") q.assignee = assigneeFilter;
    if (priorityFilter !== "all") q.priority = priorityFilter;
    if (typeFilter !== "all") q.type = typeFilter;
    if (dueFilter !== "all") q.due = dueFilter;
    if (debouncedSearch) q.search = debouncedSearch;
    return q;
  }, [assigneeFilter, priorityFilter, typeFilter, dueFilter, debouncedSearch]);

  const fetchBoard = useCallback(async ({ force = true } = {}) => {
    try {
      setBoard((await superadminService.loadTaskBoard(boardParams, { force })) || {});
      setBoardError(null);
    } catch (err) {
      const msg = err?.response?.data?.error || "Couldn't load the task board.";
      if (superadminService.getTaskBoardCached()) toast.error(msg); else setBoardError(msg);
    }
  }, [boardParams]);

  useEffect(() => {
    if (tab !== "board") return;
    fetchBoard({ force: true }).finally(() => setBoardLoading(false));
  }, [tab, fetchBoard, refreshKey, tasksVersion]);

  const refreshBoard = async () => {
    setBoardRefreshing(true);
    await fetchBoard({ force: true });
    setBoardRefreshing(false);
  };

  const colAtPoint = (x, y) => {
    for (const [key, el] of Object.entries(colRefs.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return key;
    }
    return null;
  };
  const pointXY = (e, info) => {
    if (typeof e?.clientX === "number") return { x: e.clientX, y: e.clientY };
    const p = info?.point || { x: 0, y: 0 };
    return { x: p.x, y: p.y };
  };

  /** Move a task between board columns, rolling the card back if the write fails. */
  const handleDrop = async (task, toStatus) => {
    if (!toStatus || toStatus === task.status || movingRef.current.has(task._id)) return;
    movingRef.current.add(task._id);
    const from = task.status;
    // Optimistic: the card lands where it was dropped, then the server agrees.
    setBoard((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => (next[k] = (prev[k] || []).filter((t) => t._id !== task._id)));
      next[toStatus] = [{ ...task, status: toStatus }, ...(next[toStatus] || [])];
      return next;
    });
    try {
      await superadminService.changeTaskStatus(task._id, { status: toStatus });
      loadStats({ force: true });
      refreshMyTasksDue();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Couldn't move that task");
      setBoard((prev) => {
        const next = {};
        Object.keys(prev).forEach((k) => (next[k] = (prev[k] || []).filter((t) => t._id !== task._id)));
        next[from] = [{ ...task, status: from }, ...(next[from] || [])];
        return next;
      });
    } finally {
      movingRef.current.delete(task._id);
    }
  };

  const openTask = (t) => {
    if (dragMovedRef.current) { dragMovedRef.current = false; return; }
    navigate(`/tasks/${t._id}`);
  };

  /* ── mutations ── */
  const quickComplete = async (task, e) => {
    e?.stopPropagation();
    const next = isTerminal(task.status) ? "todo" : "done";
    setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, status: next } : t)));
    try {
      await superadminService.changeTaskStatus(task._id, { status: next });
      loadStats({ force: true });
      refreshMyTasksDue();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't update that task");
      setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, status: task.status } : t)));
    }
  };

  const del = async (task, e) => {
    e?.stopPropagation();
    const ok = await confirm({
      title: "Delete this task",
      message: `"${task.title}" and its comments and checklist will be permanently removed. This can't be undone.`,
      tone: "danger",
      confirmText: "Delete",
      icon: Trash2,
      onConfirm: async () => {
        await superadminService.deleteTask(task._id);
      },
    });
    if (ok) {
      toast.success("Task deleted");
      setTasks((prev) => prev.filter((t) => t._id !== task._id));
      loadStats({ force: true });
      refreshMyTasksDue();
    }
  };

  const runBulk = async (action, value, label) => {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      const res = await superadminService.bulkTasks({ ids, action, value });
      toast.success(res.data?.message || `${label} applied`);
      setSelected(new Set());
      setRefreshKey((k) => k + 1);
      loadStats({ force: true });
      refreshMyTasksDue();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Couldn't apply that");
    }
  };

  const bulkDelete = async () => {
    const ids = [...selected];
    const ok = await confirm({
      title: `Delete ${ids.length} task${ids.length === 1 ? "" : "s"}`,
      message: "The selected tasks, with their comments and checklists, will be permanently removed. This can't be undone.",
      tone: "danger",
      confirmText: "Delete",
      icon: Trash2,
      onConfirm: async () => { await superadminService.bulkTasks({ ids, action: "delete" }); },
    });
    if (ok) {
      toast.success("Tasks deleted");
      setSelected(new Set());
      setRefreshKey((k) => k + 1);
      loadStats({ force: true });
      refreshMyTasksDue();
    }
  };

  /* ── options ── */
  const statusOptions = [
    { value: "open", label: "Open" },
    { value: "all", label: "Any status" },
    ...TASK_STATUSES.map((s) => ({ value: s.value, label: s.label })),
  ];
  const priorityOptions = [{ value: "all", label: "Any priority" }, ...TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))];
  const typeOptions = [{ value: "all", label: "Any type" }, ...TASK_TYPES.map((t) => ({ value: t.value, label: t.label }))];
  const assigneeOptions = [
    { value: "all", label: "Anyone" },
    { value: "me", label: "Me" },
    { value: "unassigned", label: "Unassigned" },
    ...staff.filter((s) => String(s._id) !== String(user?._id)).map((s) => ({ value: s._id, label: s.name || s.email })),
  ];

  const statTiles = [
    { label: "Open tasks", value: <AnimatedNumber value={stats?.open || 0} />, sub: "across the team", icon: Inbox, color: "#6366f1" },
    {
      label: "Overdue",
      value: <AnimatedNumber value={stats?.overdue || 0} />,
      sub: stats?.overdue ? "needs attention" : "all clear",
      icon: AlarmClock,
      color: stats?.overdue > 0 ? "#ef4444" : "#9ca3af",
    },
    { label: "Due today", value: <AnimatedNumber value={stats?.dueToday || 0} />, sub: "on today's list", icon: CalendarDays, color: "#f59e0b" },
    { label: "Done this week", value: <AnimatedNumber value={stats?.completedWeek || 0} />, sub: "completed", icon: CheckCircle2, color: "#10b981" },
  ];

  const allVisibleSelected = tasks.length > 0 && tasks.every((t) => selected.has(t._id));
  const toggleAll = () => setSelected(allVisibleSelected ? new Set() : new Set(tasks.map((t) => t._id)));
  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  return (
    <MotionConfig reducedMotion="user">
    <div className="[&_*]:!rounded-none">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className={`${card} mb-6 overflow-hidden`}>
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div aria-hidden className="pointer-events-none absolute bottom-4 right-12 h-10 w-24 opacity-[.20]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.95) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
          <div className="relative z-10 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Sales</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Tasks</h1>
            <p className="mt-1 text-sm text-white/80">Every call, demo and follow-up the team owes — on a lead or standing alone.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/tasks/new")}
            className="relative z-10 inline-flex shrink-0 items-center gap-2 bg-white/95 px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-white"
          >
            <Plus className="h-4 w-4" /> New task
          </button>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-white/10 sm:grid-cols-4 sm:divide-y-0">
          {statTiles.map((t, i) => (
            <motion.div key={t.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.06, duration: 0.4, ease: "easeOut" }}>
              <HeaderStat {...t} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex overflow-hidden border border-gray-200 dark:border-white/10">
          <button type="button" onClick={() => setTab("list")} className={cn("inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-colors", tab === "list" ? "bg-accent text-white" : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-white/5 dark:text-white/70")}>
            <ListIcon className="h-4 w-4" /> List
          </button>
          <button type="button" onClick={() => setTab("board")} className={cn("inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-colors", tab === "board" ? "bg-accent text-white" : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-white/5 dark:text-white/70")}>
            <KanbanSquare className="h-4 w-4" /> Board
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks, tags…" className="w-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/85 sm:w-52" />
          </div>
          {tab === "list" ? (
            <CustomSelect value={statusFilter} onChange={(v) => updateParams({ status: v === "open" ? null : v })} options={statusOptions} className="min-w-[130px]" triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
          ) : null}
          <CustomSelect value={assigneeFilter} onChange={(v) => updateParams({ assignee: v === "all" ? null : v })} options={assigneeOptions} searchable searchPlaceholder="Search operators…" className="min-w-[140px]" triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
          <CustomSelect value={priorityFilter} onChange={(v) => updateParams({ priority: v === "all" ? null : v })} options={priorityOptions} className="min-w-[130px]" triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
          <CustomSelect value={typeFilter} onChange={(v) => updateParams({ type: v === "all" ? null : v })} options={typeOptions} className="min-w-[130px]" triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
          <button type="button" onClick={() => (tab === "board" ? refreshBoard() : setRefreshKey((k) => k + 1))} disabled={revalidating || boardRefreshing} title="Refresh" className="grid h-9 w-9 shrink-0 place-items-center border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5">
            <RefreshCw className={cn("h-4 w-4", (revalidating || boardRefreshing) && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Due-date triage. Chips rather than another dropdown: this is the axis
          the screen is opened on, and it should take one click, not two. */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {DUE_FILTERS.map((f) => {
          const active = dueFilter === f.value;
          const count = f.value === "overdue" ? stats?.overdue : f.value === "today" ? stats?.dueToday : f.value === "week" ? stats?.dueWeek : 0;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => updateParams({ due: f.value === "all" ? null : f.value })}
              className={cn(
                "inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-accent bg-accent text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-white/10 dark:bg-white/5 dark:text-white/70",
              )}
            >
              {f.label}
              {count ? (
                <span className={cn("tabular-nums", active ? "text-white/80" : f.value === "overdue" ? "text-red-500" : "text-gray-400")}>{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Bulk action bar — only present when there is a selection to act on. */}
      <AnimatePresence>
        {selected.size > 0 && tab === "list" ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={GLIDE}
            className="mb-3 overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 border border-accent/40 bg-accent/[0.06] px-4 py-2.5">
              <span className="text-sm font-semibold text-gray-800 dark:text-white/85">
                {selected.size} selected
              </span>
              <span className="mx-1 h-4 w-px bg-gray-200 dark:bg-white/10" />
              <CustomSelect
                value=""
                onChange={(v) => runBulk("status", v, "Status")}
                options={[{ value: "", label: "Set status…" }, ...TASK_STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
                className="min-w-[130px]"
                triggerClassName="border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
              />
              <CustomSelect
                value=""
                onChange={(v) => runBulk("assign", v === "__none" ? "" : v, "Assignee")}
                options={[
                  { value: "", label: "Assign to…" },
                  { value: "__none", label: "Unassigned" },
                  ...staff.map((s) => ({ value: s._id, label: s.name || s.email })),
                ]}
                searchable
                className="min-w-[140px]"
                triggerClassName="border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
              />
              <CustomSelect
                value=""
                onChange={(v) => runBulk("priority", v, "Priority")}
                options={[{ value: "", label: "Set priority…" }, ...TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))]}
                className="min-w-[130px]"
                triggerClassName="border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
              />
              <button type="button" onClick={bulkDelete} className="inline-flex items-center gap-1.5 border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:bg-transparent dark:hover:bg-red-500/10">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              <button type="button" onClick={() => setSelected(new Set())} title="Clear selection" className="ml-auto grid h-7 w-7 place-items-center text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {tab === "list" ? (
        listLoading ? (
          <SALoader />
        ) : listError ? (
          <SAErrorState message={listError} onRetry={() => setRefreshKey((k) => k + 1)} />
        ) : tasks.length === 0 ? (
          <div className={`${card} py-20 text-center`}>
            <ListChecks className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No tasks match your filters</p>
            <button type="button" onClick={() => navigate("/tasks/new")} className="mt-4 inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
              <Plus className="h-4 w-4" /> New task
            </button>
          </div>
        ) : (
          <>
            <div className={`${card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <SATableHead
                    columns={TASK_COLUMNS.map((c, i) =>
                      i === 0
                        ? {
                            ...c,
                            label: (
                              <input
                                type="checkbox"
                                checked={allVisibleSelected}
                                onChange={toggleAll}
                                aria-label="Select all tasks on this page"
                                className="h-3.5 w-3.5 cursor-pointer accent-[var(--tenant-accent,#10b981)]"
                              />
                            ),
                          }
                        : c,
                    )}
                    sort={sort}
                    onSort={changeSort}
                  />
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {sortedTasks.map((t) => {
                      const done = isTerminal(t.status);
                      return (
                        <tr key={t._id} onClick={() => navigate(`/tasks/${t._id}`)} className={cn("cursor-pointer transition-colors hover:bg-gray-50/70 dark:hover:bg-white/5", selected.has(t._id) && "bg-accent/[0.04]")}>
                          <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected.has(t._id)}
                              onChange={() => toggleOne(t._id)}
                              aria-label={`Select ${t.title}`}
                              className="h-3.5 w-3.5 cursor-pointer accent-[var(--tenant-accent,#10b981)]"
                            />
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-start gap-2.5">
                              <button
                                type="button"
                                onClick={(e) => quickComplete(t, e)}
                                title={done ? "Reopen this task" : "Mark done"}
                                className={cn(
                                  "mt-0.5 grid h-4 w-4 shrink-0 place-items-center border transition-colors",
                                  done ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 text-transparent hover:border-accent dark:border-white/20",
                                )}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                              </button>
                              <div className="min-w-0">
                                <p className={cn("truncate font-medium text-gray-900 dark:text-white", done && "text-gray-400 dark:text-white/40")}>{t.title}</p>
                                <div className="mt-0.5 flex items-center gap-2">
                                  <TypeIcon type={t.type} className="text-gray-300" />
                                  <ChecklistProgress done={t.checklistDone} total={t.checklistTotal} />
                                  {t.tags?.length ? <span className="truncate text-[11px] text-gray-400">{t.tags.join(" · ")}</span> : null}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            {t.leadRef?.orgName ? <RelatedLead lead={t.leadRef} /> : <span className="text-xs text-gray-300 dark:text-white/25">—</span>}
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 dark:text-white/70"><AssigneeLabel assignee={t.assignee} /></td>
                          <td className="px-5 py-3.5"><DueLabel dueAt={t.dueAt} status={t.status} /></td>
                          <td className="px-5 py-3.5"><PriorityTag priority={t.priority} showNormal /></td>
                          <td className="px-5 py-3.5"><StatusBadge status={t.status} /></td>
                          <td className="px-5 py-3.5 text-right">
                            <button type="button" onClick={(e) => del(t, e)} title="Delete" className="grid h-8 w-8 place-items-center text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <SAPagination
              className="mt-4"
              page={page}
              pages={pagination.pages}
              total={pagination.total || 0}
              limit={limit}
              shown={tasks.length}
              onPage={(p) => updateParams({ page: p > 1 ? p : null })}
              onLimit={changeLimit}
            />
          </>
        )
      ) : boardLoading ? (
        <SALoader />
      ) : boardError ? (
        <SAErrorState message={boardError} onRetry={refreshBoard} />
      ) : (
        <LayoutGroup>
          <div className="flex items-start gap-4 overflow-x-auto pb-2">
            {BOARD_STATUSES.map((col) => {
              const items = board[col.value] || [];
              const isOver = overCol === col.value && dragId && !items.some((t) => t._id === dragId);
              return (
                <div
                  key={col.value}
                  ref={(el) => (colRefs.current[col.value] = el)}
                  className={cn(
                    "relative flex w-[290px] shrink-0 flex-col overflow-hidden border transition-colors duration-200",
                    isOver ? "border-accent/60 bg-accent/[0.06]" : "border-gray-200 bg-gray-50/70 dark:border-white/10 dark:bg-white/[0.03]",
                  )}
                >
                  <div className="h-1 w-full" style={{ background: col.color }} />
                  <div className="flex items-center justify-between border-b border-gray-100 px-3.5 py-2.5 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.color }} />
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-white/80">{col.label}</h3>
                    </div>
                    <span className="px-2 py-0.5 text-[11px] font-bold tabular-nums" style={{ background: `${col.color}1f`, color: col.color }}>{items.length}</span>
                  </div>

                  <motion.div layout="position" transition={GLIDE} className="min-h-[140px] space-y-2.5 p-3">
                    <AnimatePresence initial={false}>
                      {isOver ? (
                        <motion.div key="placeholder" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 76 }} exit={{ opacity: 0, height: 0 }} transition={GLIDE} className="border-2 border-dashed border-accent/50 bg-accent/5" />
                      ) : null}
                    </AnimatePresence>

                    {items.map((t) => (
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
                        onDragEnd={(e, info) => { const { x, y } = pointXY(e, info); const k = colAtPoint(x, y); setDragId(null); setOverCol(null); handleDrop(t, k); requestAnimationFrame(() => { dragMovedRef.current = false; }); }}
                        whileDrag={{ scale: 1.03, boxShadow: "0 16px 30px -10px rgba(0,0,0,0.28)", cursor: "grabbing" }}
                        style={{ zIndex: dragId === t._id ? 50 : 1 }}
                        className={cn("touch-none select-none", dragId === t._id && "cursor-grabbing")}
                      >
                        <TaskCard task={t} onOpen={() => openTask(t)} />
                      </motion.div>
                    ))}

                    {items.length === 0 && !isOver ? (
                      <p className="border border-dashed border-gray-200 py-7 text-center text-xs text-gray-300 dark:border-white/10">Empty</p>
                    ) : null}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </LayoutGroup>
      )}
    </div>
    </MotionConfig>
  );
}

// On a Vite hot-reload the service module survives, so its caches would keep
// serving stale data. Dev-only: stripped from production builds.
if (import.meta.hot) {
  import.meta.hot.dispose(() => superadminService.clearTasksCache());
}
