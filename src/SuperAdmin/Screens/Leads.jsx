import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence, LayoutGroup, MotionConfig } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Target,
  Search,
  RefreshCw,
  Inbox,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  List as ListIcon,
  KanbanSquare,
  Trash2,
  Building2,
  Globe,
  Plus,
  AlarmClock,
  ListChecks,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import { useSARealtime } from "../context/SARealtimeContext";
import { CustomSelect } from "../../components/CustomSelect";
import SAErrorState from "../components/SAErrorState";
import SATableHead from "../components/SATableHead";
import SAPagination from "../components/SAPagination";
import { useTableSort } from "../utils/tableSort";
import { DEFAULT_PAGE_SIZE } from "../utils/paging";
import SALoader from "../SALoader";
import LostReasonModal from "../components/LostReasonModal";
import { useConfirm } from "../components/ConfirmProvider";
import { cn } from "../../utils/cn";
import { dueMeta } from "../../config/taskOptions";
import { fmtMoney } from "./leadShared";

import AnimatedNumberBase from "../components/AnimatedNumber";

const AnimatedNumber = (props) => <AnimatedNumberBase duration={0.6} {...props} />;
const card = "border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";

/**
 * Table columns. `key` names a column the SERVER sorts by (LEAD_SORTS in
 * leadController). Assignee is a populated User, so ordering by it would need
 * a $lookup — it stays a plain label rather than a control that does nothing.
 *
 * The default is "activity" (last message, newest first) because the question
 * this table answers is "who needs chasing".
 */
const LEAD_TH = "px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400";
const LEAD_COLUMNS = [
  { label: "Organisation", key: "org", className: LEAD_TH },
  { label: "Contact", key: "contact", className: LEAD_TH },
  { label: "Stage", key: "stage", className: LEAD_TH },
  { label: "Value", key: "value", defaultDir: "desc", className: LEAD_TH },
  // Joined server-side from the task collection (see taskSummaryForLeads), so
  // there is no path on the lead document to order by — a plain label.
  { label: "Follow-up", className: LEAD_TH },
  { label: "Assignee", className: LEAD_TH },
  { label: "Last activity", key: "activity", defaultDir: "desc", className: LEAD_TH },
  { label: "", className: LEAD_TH },
];

/**
 * The same columns read off a row in the browser, so a header click re-orders
 * the loaded leads on the spot rather than after a round trip. The server is
 * still asked — only it can order the leads that aren't on this page.
 */
const LEAD_SORT_ACCESSORS = {
  org: (l) => l.orgName,
  contact: (l) => l.contactName || l.contactEmail,
  stage: (l) => l.stage,
  activity: (l) => l.lastMessageAt || l.createdAt,
  // 0 rather than undefined: a lead with no value entered is worth nothing yet,
  // not "unknown", and useTableSort sinks blanks to the bottom in BOTH
  // directions — which would hide the un-priced leads when sorting ascending.
  value: (l) => Number(l.dealValue || 0),
};
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";

const STAGES = [
  { key: "new", label: "New", color: "#f59e0b" },
  { key: "contacted", label: "Contacted", color: "#0ea5e9" },
  { key: "qualified", label: "Qualified", color: "#8b5cf6" },
  { key: "demo_scheduled", label: "Demo Scheduled", color: "#6366f1" },
  { key: "proposal_sent", label: "Proposal Sent", color: "#ec4899" },
  { key: "won", label: "Won", color: "#10b981" },
  { key: "lost", label: "Lost", color: "#94a3b8" },
];
const ACTIVE_ORDER = ["new", "contacted", "qualified", "demo_scheduled", "proposal_sent"];
const stageMeta = (key) => STAGES.find((s) => s.key === key) || STAGES[0];
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

function StageBadge({ stage }) {
  const m = stageMeta(stage);
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${m.color}1a`, color: m.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

/**
 * What is outstanding on a lead, as one cell.
 *
 * The three states are genuinely different and must not read alike: nothing
 * scheduled (a gap in the pipeline — the row that needs a decision), something
 * scheduled and on time, and something already missed. "Nothing" is drawn as
 * plain grey text rather than an em dash, because an operator scanning this
 * column is looking for the leads that have gone quiet and a dash reads as
 * "not applicable".
 */
function FollowUp({ tasks }) {
  const open = tasks?.open || 0;
  const overdue = tasks?.overdue || 0;
  if (!open) return <span className="text-xs text-gray-400 dark:text-white/30">None scheduled</span>;
  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
        <AlarmClock className="h-3.5 w-3.5 shrink-0" />
        {overdue} overdue
      </span>
    );
  }
  const next = tasks?.nextDueAt;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-white/70">
      <ListChecks className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      {open} open{next ? ` · ${dueMeta(next).text}` : ""}
    </span>
  );
}

function HeaderStat({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${color}1a`, color }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none text-gray-900 dark:text-white">{value}</p>
        <p className="mt-1 truncate text-xs text-gray-400">{label}</p>
        {sub ? <p className="truncate text-[10px] text-gray-300 dark:text-white/30">{sub}</p> : null}
      </div>
    </div>
  );
}

export default function Leads() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { leadsVersion } = useSARealtime();
  const [tab, setTab] = useState("list"); // "list" | "pipeline"

  const [staff, setStaff] = useState([]);
  useEffect(() => {
    superadminService.loadLeadStaff().then(setStaff).catch(() => {});
  }, []);

  /* ── list ── */
  const cachedList = superadminService.getLeadsCached();
  const [leads, setLeads] = useState(cachedList?.leads || []);
  const [pagination, setPagination] = useState(cachedList?.pagination || {});
  const [newCount, setNewCount] = useState(cachedList?.newCount || 0);
  const [listLoading, setListLoading] = useState(!cachedList);
  const [revalidating, setRevalidating] = useState(false);
  const [listError, setListError] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState({ key: "activity", dir: "desc" });
  const [refreshKey, setRefreshKey] = useState(0);
  const lastParamsKeyRef = useRef(null);
  const lastViewKeyRef = useRef(null);

  useEffect(() => {
    const next = search.trim();
    if (next === debouncedSearch) return undefined;
    const t = setTimeout(() => { setDebouncedSearch(next); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);

  useEffect(() => {
    if (tab !== "list") return undefined;
    const params = { page, limit, sort: sort.key, dir: sort.dir };
    if (debouncedSearch) params.search = debouncedSearch;
    if (stageFilter !== "all") params.stage = stageFilter;
    if (assigneeFilter !== "all") params.assignee = assigneeFilter;
    const paramsKey = JSON.stringify(params);
    // Identity of the CONTENT, without the ordering or the window into it.
    const viewKey = JSON.stringify([debouncedSearch, stageFilter, assigneeFilter]);
    // Sorting or paging the same filtered set is navigation within one view —
    // it must not blank the table for the full-screen loader. That is what made
    // a header click look like a page reload.
    const sameView = lastViewKeyRef.current === viewKey || lastParamsKeyRef.current === paramsKey;
    const controller = new AbortController();
    let alive = true;
    (async () => {
      if (sameView) setRevalidating(true); else setListLoading(true);
      try {
        const data = await superadminService.loadLeads(params, { force: true, signal: controller.signal });
        if (!alive) return;
        const { leads: rows = [], pagination: pg = {}, newCount: nc = 0 } = data || {};
        if (page > 1 && page > (pg.pages || 0)) { setPage(Math.max(1, pg.pages || 1)); return; }
        setLeads(rows);
        setPagination(pg);
        setNewCount(nc);
        setListError(null);
        lastParamsKeyRef.current = paramsKey;
        lastViewKeyRef.current = viewKey;
      } catch (err) {
        if (!alive || axios.isCancel(err)) return;
        const msg = err?.response?.data?.error || "Couldn't load leads.";
        if (sameView) toast.error(msg); else setListError(msg);
      } finally {
        if (alive) { setListLoading(false); setRevalidating(false); }
      }
    })();
    return () => { alive = false; controller.abort(); };
  }, [tab, page, limit, sort, debouncedSearch, stageFilter, assigneeFilter, refreshKey, leadsVersion]);

  // Re-ordered in the browser the instant a header is clicked; the server's
  // answer for the same sort lands behind it.
  const sortedLeads = useTableSort(leads, sort, LEAD_SORT_ACCESSORS);

  // Both re-shape the result set, so the page number stops meaning anything.
  const changeSort = useCallback((next) => {
    setSort(next);
    setPage(1);
  }, []);
  const changeLimit = useCallback((next) => {
    setLimit((cur) => (cur === next ? cur : next));
    setPage(1);
  }, []);

  useEffect(() => {
    superadminService.setLeadsCache({ leads, pagination, newCount });
  }, [leads, pagination, newCount]);

  /* ── pipeline board ── */
  const cachedBoard = superadminService.getLeadBoardCached();
  const [board, setBoard] = useState(cachedBoard || {});
  const [boardLoading, setBoardLoading] = useState(!cachedBoard);
  const [boardError, setBoardError] = useState(null);
  const [boardRefreshing, setBoardRefreshing] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const colRefs = useRef({});
  const dragMovedRef = useRef(false);
  const movingRef = useRef(new Set());

  const fetchBoard = useCallback(async ({ force = true } = {}) => {
    try {
      const data = await superadminService.loadLeadBoard({ force });
      setBoard(data || {});
      setBoardError(null);
    } catch (err) {
      const msg = err?.response?.data?.error || "Couldn't load the pipeline.";
      if (superadminService.getLeadBoardCached()) toast.error(msg); else setBoardError(msg);
    }
  }, []);

  useEffect(() => {
    if (tab !== "pipeline") return undefined;
    const cachedNow = superadminService.getLeadBoardCached();
    if (cachedNow && !superadminService.isLeadBoardStale()) { setBoard(cachedNow); setBoardLoading(false); return; }
    if (cachedNow) { fetchBoard({ force: true }); return; }
    (async () => {
      try {
        setBoard((await superadminService.loadLeadBoard()) || {});
        setBoardError(null);
      } catch (err) {
        setBoardError(err?.response?.data?.error || "Couldn't load the pipeline.");
      } finally {
        setBoardLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, leadsVersion]);

  useEffect(() => { superadminService.setLeadBoardCache(board); }, [board]);

  const refreshBoard = async () => {
    setBoardRefreshing(true);
    try { await fetchBoard({ force: true }); } finally { setBoardRefreshing(false); }
  };

  /* ── shared mutation plumbing ── */
  const [lostTarget, setLostTarget] = useState(null);

  const patchLeadEverywhere = (id, patch) => {
    setLeads((prev) => prev.map((l) => (l._id === id ? { ...l, ...patch } : l)));
    setBoard((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => { next[k] = (prev[k] || []).map((l) => (l._id === id ? { ...l, ...patch } : l)); });
      return next;
    });
  };

  const moveLeadInBoard = (lead, targetStage) => {
    setBoard((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => { next[k] = (prev[k] || []).filter((l) => l._id !== lead._id); });
      next[targetStage] = [{ ...lead, stage: targetStage }, ...(next[targetStage] || [])];
      return next;
    });
  };

  const changeStage = async (lead, targetStage, extra = {}) => {
    if (!lead || lead.stage === targetStage) return;
    if (movingRef.current.has(lead._id)) return;
    movingRef.current.add(lead._id);
    const snapshot = board;
    moveLeadInBoard(lead, targetStage);
    patchLeadEverywhere(lead._id, { stage: targetStage });
    try {
      const res = await superadminService.changeLeadStage(lead._id, { stage: targetStage, ...extra });
      patchLeadEverywhere(lead._id, res.data.lead);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to move lead");
      setBoard(snapshot);
      fetchBoard();
    } finally {
      movingRef.current.delete(lead._id);
    }
  };

  const handleDrop = (lead, targetStage) => {
    if (!targetStage || targetStage === lead.stage) return;
    // Converting needs a full form (org/admin/plan/billing, payment) — not
    // something a drag-drop can express, so hand off to the dedicated page.
    // dragSnapToOrigin already returns the card to its column on release.
    if (targetStage === "won") { navigate(`/leads/${lead._id}/convert`); return; }
    if (targetStage === "lost") { setLostTarget(lead); return; }
    changeStage(lead, targetStage);
  };

  const moveDir = (lead, dir) => {
    const idx = ACTIVE_ORDER.indexOf(lead.stage);
    if (idx === -1) return;
    const next = ACTIVE_ORDER[idx + dir];
    if (next) changeStage(lead, next);
  };

  const colAtPoint = (x, y) => {
    for (const col of STAGES) {
      const el = colRefs.current[col.key];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return col.key;
    }
    return null;
  };
  const pointXY = (event, info) =>
    event && typeof event.clientX === "number" ? { x: event.clientX, y: event.clientY } : { x: info.point.x, y: info.point.y };

  const openLead = (l) => {
    if (dragMovedRef.current) { dragMovedRef.current = false; return; }
    navigate(`/leads/${l._id}`);
  };

  const removeLeadEverywhere = (id) => {
    setLeads((prev) => prev.filter((l) => l._id !== id));
    setBoard((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => { next[k] = (prev[k] || []).filter((l) => l._id !== id); });
      return next;
    });
  };

  const del = async (lead) => {
    const ok = await confirm({
      title: "Delete this lead",
      message: `The lead from ${lead.orgName} and its entire note thread will be permanently removed. This can't be undone.`,
      tone: "danger",
      confirmText: "Delete",
      icon: Trash2,
      onConfirm: async () => {
        await superadminService.deleteLead(lead._id);
        superadminService.removeLeadCache(lead._id);
        removeLeadEverywhere(lead._id);
      },
    });
    if (ok) toast.success("Lead deleted");
  };

  const handleLostConfirm = async (reason, note) => {
    const lead = lostTarget;
    await changeStage(lead, "lost", { lostReason: reason, lostReasonNote: note });
    setLostTarget(null);
  };

  /* ── stats ── */
  const boardTotals = useMemo(() => {
    const counts = {};
    STAGES.forEach((s) => { counts[s.key] = (board[s.key] || []).length; });
    return counts;
  }, [board]);
  const boardLoaded = Object.keys(board).length > 0;
  const totalLeads = boardLoaded ? Object.values(boardTotals).reduce((a, b) => a + b, 0) : pagination.total || leads.length;
  const wonCount = boardTotals.won || 0;
  const lostCount = boardTotals.lost || 0;
  const openCount = boardLoaded ? totalLeads - wonCount - lostCount : Math.max(0, totalLeads - newCount);

  /**
   * Annualised value of everything still in play.
   *
   * Only computable once the BOARD has loaded, because that is the only
   * response carrying every lead — the list is one page of 25, and summing a
   * page would report a pipeline that changes when you turn to page two. Left
   * out entirely until then rather than shown wrong.
   */
  const openPipelineValue = useMemo(() => {
    if (!boardLoaded) return null;
    return ACTIVE_ORDER.reduce(
      (sum, stage) => sum + (board[stage] || []).reduce((s, l) => s + Number(l.dealValue || 0), 0),
      0,
    );
  }, [board, boardLoaded]);

  const statTiles = [
    { label: "Total leads", value: <AnimatedNumber value={totalLeads} />, sub: "captured", icon: Inbox, color: "#6366f1" },
    { label: "New", value: <AnimatedNumber value={newCount} />, sub: "not yet triaged", icon: Target, color: newCount > 0 ? "#f59e0b" : "#9ca3af" },
    {
      label: "Open pipeline",
      value: <AnimatedNumber value={openCount} />,
      sub: openPipelineValue ? `${fmtMoney(openPipelineValue)} a year` : "in progress",
      icon: TrendingUp,
      color: "#0ea5e9",
    },
    { label: "Won", value: <AnimatedNumber value={wonCount} />, sub: "converted to tenants", icon: DollarSign, color: "#10b981" },
  ];

  const stageOptions = [{ value: "all", label: "All stages" }, ...STAGES.map((s) => ({ value: s.key, label: s.label }))];
  const assigneeOptions = [
    { value: "all", label: "Anyone" },
    { value: "unassigned", label: "Unassigned" },
    ...staff.map((s) => ({ value: s._id, label: s.name || s.email })),
  ];

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
            <h1 className="mt-1 text-2xl font-bold text-white">Leads</h1>
            <p className="mt-1 text-sm text-white/80">Every enquiry and every prospect you’ve added by hand, from first contact to converted tenant.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/leads/new")}
            className="relative z-10 inline-flex shrink-0 items-center gap-2 bg-white/95 px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-white"
          >
            <Plus className="h-4 w-4" /> New lead
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
          <button type="button" onClick={() => setTab("pipeline")} className={cn("inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-colors", tab === "pipeline" ? "bg-accent text-white" : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-white/5 dark:text-white/70")}>
            <KanbanSquare className="h-4 w-4" /> Pipeline
          </button>
        </div>

        {tab === "list" ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search org, contact, email…" className="w-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/85 sm:w-56" />
            </div>
            <CustomSelect value={stageFilter} onChange={(v) => { setStageFilter(v); setPage(1); }} options={stageOptions} className="min-w-[150px]" triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
            <CustomSelect value={assigneeFilter} onChange={(v) => { setAssigneeFilter(v); setPage(1); }} options={assigneeOptions} className="min-w-[150px]" triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
            <button type="button" onClick={() => setRefreshKey((k) => k + 1)} disabled={revalidating} title="Refresh" className="grid h-9 w-9 shrink-0 place-items-center border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5">
              <RefreshCw className={cn("h-4 w-4", revalidating && "animate-spin")} />
            </button>
          </div>
        ) : (
          <button type="button" onClick={refreshBoard} disabled={boardRefreshing} title="Refresh board" className="grid h-9 w-9 shrink-0 place-items-center border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5">
            <RefreshCw className={cn("h-4 w-4", boardRefreshing && "animate-spin")} />
          </button>
        )}
      </div>

      {tab === "list" ? (
        listLoading ? (
          <SALoader />
        ) : listError ? (
          <SAErrorState message={listError} onRetry={() => setRefreshKey((k) => k + 1)} />
        ) : leads.length === 0 ? (
          <div className={`${card} py-20 text-center`}>
            <Inbox className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No leads match your filters</p>
          </div>
        ) : (
          <>
            <div className={`${card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <SATableHead columns={LEAD_COLUMNS} sort={sort} onSort={changeSort} />
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {sortedLeads.map((l) => (
                      <tr key={l._id} onClick={() => navigate(`/leads/${l._id}`)} className="cursor-pointer transition-colors hover:bg-gray-50/70 dark:hover:bg-white/5">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="grid h-8 w-8 shrink-0 place-items-center bg-accent/10 text-accent"><Building2 className="h-4 w-4" /></span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-900 dark:text-white">{l.orgName}</p>
                              {l.orgWebsite ? <p className="flex items-center gap-1 truncate text-xs text-gray-400"><Globe className="h-3 w-3" />{l.orgWebsite}</p> : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="truncate text-gray-800 dark:text-white/85">{l.contactName}</p>
                          <p className="truncate text-xs text-gray-400">{l.contactEmail}</p>
                        </td>
                        <td className="px-5 py-3.5"><StageBadge stage={l.stage} /></td>
                        <td className="px-5 py-3.5 tabular-nums text-gray-700 dark:text-white/80">
                          {l.dealValue > 0 ? fmtMoney(l.dealValue, l.currency) : <span className="text-gray-300 dark:text-white/25">—</span>}
                        </td>
                        <td className="px-5 py-3.5"><FollowUp tasks={l.tasks} /></td>
                        <td className="px-5 py-3.5 text-gray-600 dark:text-white/70">{l.assignee?.name || <span className="text-gray-300">Unassigned</span>}</td>
                        <td className="px-5 py-3.5 text-xs text-gray-400">{timeAgo(l.lastMessageAt || l.createdAt)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button type="button" onClick={(e) => { e.stopPropagation(); del(l); }} title="Delete" className="grid h-8 w-8 place-items-center text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Shared footer — the count and the rows control read the same
                here as on every other list screen. */}
            <SAPagination
              className="mt-4"
              page={page}
              pages={pagination.pages}
              total={pagination.total || 0}
              limit={limit}
              shown={leads.length}
              onPage={setPage}
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
            {STAGES.map((col) => {
              const items = board[col.key] || [];
              const isOver = overCol === col.key && dragId && !items.some((l) => l._id === dragId);
              const terminal = col.key === "won" || col.key === "lost";
              return (
                <div
                  key={col.key}
                  ref={(el) => (colRefs.current[col.key] = el)}
                  className={cn(
                    "relative flex w-[270px] shrink-0 flex-col overflow-hidden border transition-colors duration-200",
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

                  <motion.div layout="position" transition={GLIDE} className="min-h-[120px] space-y-2.5 p-3">
                    <AnimatePresence initial={false}>
                      {isOver ? (
                        <motion.div key="placeholder" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 64 }} exit={{ opacity: 0, height: 0 }} transition={GLIDE} className="border-2 border-dashed border-accent/50 bg-accent/5" />
                      ) : null}
                    </AnimatePresence>

                    {items.map((l) => {
                      const dragging = dragId === l._id;
                      const idx = ACTIVE_ORDER.indexOf(l.stage);
                      return (
                        <motion.div
                          key={l._id}
                          layoutId={l._id}
                          layout
                          initial={false}
                          transition={{ layout: GLIDE }}
                          drag={!terminal}
                          dragSnapToOrigin
                          dragElastic={0.16}
                          onDragStart={() => { dragMovedRef.current = true; setDragId(l._id); }}
                          onDrag={(e, info) => { const { x, y } = pointXY(e, info); const k = colAtPoint(x, y); setOverCol((p) => (p === k ? p : k)); }}
                          onDragEnd={(e, info) => { const { x, y } = pointXY(e, info); const k = colAtPoint(x, y); setDragId(null); setOverCol(null); handleDrop(l, k); requestAnimationFrame(() => { dragMovedRef.current = false; }); }}
                          onClick={() => openLead(l)}
                          whileDrag={{ scale: 1.03, boxShadow: "0 16px 30px -10px rgba(0,0,0,0.28)", cursor: "grabbing" }}
                          style={{ zIndex: dragging ? 50 : 1 }}
                          title="Open lead"
                          className={cn(
                            "group relative cursor-pointer touch-none select-none border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-accent/50 hover:shadow-md dark:border-white/10 dark:bg-[var(--admin-card)]",
                            dragging && "cursor-grabbing shadow-xl",
                          )}
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <p className="truncate text-[13px] font-semibold text-gray-900 dark:text-white">{l.orgName}</p>
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
                          </div>
                          <p className="truncate text-xs text-gray-500 dark:text-white/60">{l.contactName}</p>
                          {l.dealValue > 0 || l.tasks?.overdue ? (
                            <div className="mt-1.5 flex items-center gap-2">
                              {l.dealValue > 0 ? (
                                <span className="text-[11px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtMoney(l.dealValue, l.currency)}</span>
                              ) : null}
                              {l.tasks?.overdue ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500" title={`${l.tasks.overdue} overdue task(s)`}>
                                  <AlarmClock className="h-3 w-3" />
                                  {l.tasks.overdue}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-gray-100 pt-2 text-[10px] text-gray-400 dark:border-white/10">
                            <span>{timeAgo(l.lastMessageAt || l.createdAt)}</span>
                            {l.assignee?.name ? <span className="truncate">{l.assignee.name.split(" ")[0]}</span> : null}
                          </div>
                          {!terminal ? (
                            <div className="absolute right-1.5 top-7 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); moveDir(l, -1); }} disabled={idx <= 0} title="Move back" className="grid h-6 w-6 place-items-center bg-white text-gray-400 shadow-sm ring-1 ring-gray-200 transition-colors hover:text-gray-700 disabled:opacity-0 dark:bg-white/10 dark:ring-white/10 dark:hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
                              <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); moveDir(l, 1); }} disabled={idx === -1 || idx === ACTIVE_ORDER.length - 1} title="Move forward" className="grid h-6 w-6 place-items-center bg-white text-gray-400 shadow-sm ring-1 ring-gray-200 transition-colors hover:text-gray-700 disabled:opacity-0 dark:bg-white/10 dark:ring-white/10 dark:hover:text-white"><ChevronRight className="h-4 w-4" /></button>
                            </div>
                          ) : null}
                        </motion.div>
                      );
                    })}

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

      {lostTarget ? <LostReasonModal lead={lostTarget} onClose={() => setLostTarget(null)} onConfirm={handleLostConfirm} /> : null}
    </div>
    </MotionConfig>
  );
}

// On a Vite hot-reload the service module survives, so its caches would keep
// serving stale data. Dev-only: stripped from production builds.
if (import.meta.hot) {
  import.meta.hot.dispose(() => superadminService.clearLeadsCache());
}
