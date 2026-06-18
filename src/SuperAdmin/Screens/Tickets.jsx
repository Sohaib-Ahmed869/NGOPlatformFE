import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Inbox, Building2, Star, RefreshCw, CircleDot, AlertCircle, UserRound, ChevronRight, MessageSquare } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import { supportCategoryLabel } from "../../config/supportCategories";
import { ticketSourceKey, ticketSourceMeta, TICKET_SOURCE_FILTER_OPTIONS } from "../../config/ticketSource";
import { useSARealtime } from "../context/SARealtimeContext";
import SAPageHeader from "../components/SAPageHeader";
import SASelect from "../components/SASelect";
import SALoader from "../SALoader";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

const card = "rounded-xl border border-gray-100 bg-white shadow-sm";
const inputCls =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-accent dark:border-white/10 dark:bg-white/5";

const STATUS = { new: "bg-blue-50 text-blue-700", in_progress: "bg-amber-50 text-amber-700", on_hold: "bg-gray-100 text-gray-600", solved: "bg-emerald-50 text-emerald-700", declined: "bg-red-50 text-red-700" };
const STATUS_DOT = { new: "#3b82f6", in_progress: "#f59e0b", on_hold: "#9ca3af", solved: "#10b981", declined: "#ef4444" };
const PRIORITY = { low: "bg-gray-100 text-gray-600", medium: "bg-sky-50 text-sky-700", high: "bg-orange-50 text-orange-700", critical: "bg-red-50 text-red-700" };
const PRIORITY_DOT = { low: "#9ca3af", medium: "#0ea5e9", high: "#f97316", critical: "#ef4444" };
const TRIAGE = { unclassified: "bg-gray-100 text-gray-500", bug: "bg-red-50 text-red-700", feature: "bg-violet-50 text-violet-700", invalid: "bg-gray-100 text-gray-500", duplicate: "bg-gray-100 text-gray-500" };
const label = (s) => String(s || "").replace(/_/g, " ");

const TRIAGE_OPTS = ["unclassified", "bug", "feature", "invalid", "duplicate"];
const STATUS_FILTERS = ["all", "new", "in_progress", "on_hold", "solved", "declined"];

function timeAgo(d) {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function Badge({ className, children }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", className)}>{children}</span>;
}
function StatusPill({ status }) {
  return <Badge className={STATUS[status]}><span className="mr-1 h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT[status] }} />{label(status)}</Badge>;
}
// "Who is this from" chip — tenant (NGO staff) vs tenant customer (donor) vs public.
function SourceBadge({ reporter, className }) {
  const m = ticketSourceMeta(reporter);
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", m.badge, className)} title={m.description}>
      <Icon className="h-2.5 w-2.5" />{m.label}
    </span>
  );
}
function Kpi({ icon: Icon, label: lbl, value, hint, chip }) {
  return (
    <div className={`${card} flex items-center gap-3 px-4 py-3.5`}>
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", chip)}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">{lbl}</p>
        <p className="text-xl font-bold leading-tight text-gray-900">{value}</p>
        {hint ? <p className="truncate text-[11px] text-gray-400">{hint}</p> : null}
      </div>
    </div>
  );
}

export default function Tickets() {
  const navigate = useNavigate();
  const { socket } = useSARealtime();
  // Hydrate from the session cache so revisits are instant (no loader flash) —
  // null cache = first visit (show the loader).
  const cachedTickets = superadminService.getTicketsCached();
  const [all, setAll] = useState(cachedTickets || []);
  const [loading, setLoading] = useState(!cachedTickets);
  const [filters, setFilters] = useState({ triage: "all", status: "all", priority: "all", source: "all", search: "" });
  const [, setTick] = useState(0);

  // Manual refresh / socket refresh / background revalidate — bypasses the cache
  // but never toggles the full-page loader (that's the first-visit path below).
  const fetchAll = useCallback(async () => {
    try {
      setAll(await superadminService.loadTickets({ force: true }));
    } catch {
      toast.error("Failed to load tickets");
    }
  }, []);

  useEffect(() => {
    if (superadminService.getTicketsCached()) {
      // Cached → render instantly, then silently revalidate (real-time list).
      fetchAll();
    } else {
      (async () => {
        try {
          setAll(await superadminService.loadTickets());
        } catch {
          toast.error("Failed to load tickets");
        } finally {
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror socket-driven refreshes into the cache for instant, fresh revisits.
  useEffect(() => {
    superadminService.setTicketsCache(all);
  }, [all]);

  // Keep relative "age" times live.
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(i);
  }, []);

  // Real-time: refresh the list when a ticket is created or changes anywhere.
  // Also flag the changed ticket's detail so reopening it revalidates.
  useEffect(() => {
    if (!socket) return undefined;
    let timer;
    const refresh = (p) => {
      if (p?.id) superadminService.markTicketStale(p.id);
      clearTimeout(timer);
      timer = setTimeout(fetchAll, 400);
    };
    socket.on("ticket:new", refresh);
    socket.on("ticket:update", refresh);
    return () => { clearTimeout(timer); socket.off("ticket:new", refresh); socket.off("ticket:update", refresh); };
  }, [socket, fetchAll]);

  const stats = useMemo(() => {
    const open = all.filter((t) => ["new", "in_progress", "on_hold"].includes(t.status));
    const rated = all.filter((t) => t.satisfactionRating);
    const csat = rated.length ? rated.reduce((s, t) => s + t.satisfactionRating, 0) / rated.length : 0;
    return {
      total: all.length,
      open: open.length,
      unassigned: open.filter((t) => !t.assignee?.userId).length,
      untriaged: all.filter((t) => (t.triage || "unclassified") === "unclassified").length,
      csat,
      ratedCount: rated.length,
    };
  }, [all]);

  const statusCounts = useMemo(() => {
    const c = { all: all.length };
    all.forEach((t) => { c[t.status] = (c[t.status] || 0) + 1; });
    return c;
  }, [all]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return all.filter((t) => {
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.priority !== "all" && t.priority !== filters.priority) return false;
      if (filters.triage !== "all" && (t.triage || "unclassified") !== filters.triage) return false;
      if (filters.source !== "all" && ticketSourceKey(t.reporter) !== filters.source) return false;
      if (q) {
        const hay = `${t.summary} ${t.description} ${t.reporter?.name} ${t.reporter?.email} ${t.organisationId?.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, filters]);

  return (
    <div>
      <SAPageHeader
        eyebrow="Helpdesk"
        title="Support Tickets"
        subtitle="Every support ticket across all tenants — triage, classify and route to the board."
        actions={
          <button onClick={fetchAll} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        }
      />

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icon={Inbox} label="Total" value={stats.total} chip="bg-gray-100 text-gray-500" />
        <Kpi icon={CircleDot} label="Open" value={stats.open} hint="new · in progress · hold" chip="bg-blue-50 text-blue-600" />
        <Kpi icon={UserRound} label="Unassigned" value={stats.unassigned} hint="open & no owner" chip="bg-orange-50 text-orange-600" />
        <Kpi icon={AlertCircle} label="Untriaged" value={stats.untriaged} hint="awaiting triage" chip="bg-violet-50 text-violet-600" />
        <Kpi icon={Star} label="CSAT" value={stats.csat ? `${stats.csat.toFixed(1)}★` : "—"} hint={`${stats.ratedCount} rated`} chip="bg-amber-50 text-amber-600" />
      </div>

      {/* Status quick-filter pills */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((s) => {
          const activePill = filters.status === s;
          return (
            <button
              key={s}
              onClick={() => setFilters((f) => ({ ...f, status: s }))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                activePill ? "bg-accent text-white shadow-sm" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-white/5 dark:ring-white/10",
              )}
            >
              {s !== "all" ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: activePill ? "#fff" : STATUS_DOT[s] }} /> : null}
              {s === "all" ? "All" : label(s)}
              <span className={cn("rounded-full px-1.5 text-[10px] font-bold", activePill ? "bg-white/25" : "bg-gray-100 text-gray-500 dark:bg-white/10")}>{statusCounts[s] || 0}</span>
            </button>
          );
        })}
      </div>

      {/* Search + secondary filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder="Search summary, reporter, tenant…" className={`${inputCls} w-full pl-9`} />
        </div>
        <SASelect
          value={filters.source}
          onChange={(v) => setFilters((p) => ({ ...p, source: v }))}
          options={TICKET_SOURCE_FILTER_OPTIONS}
        />
        {[
          { key: "priority", opts: ["all", "low", "medium", "high", "critical"] },
          { key: "triage", opts: ["all", ...TRIAGE_OPTS] },
        ].map((f) => (
          <SASelect
            key={f.key}
            value={filters[f.key]}
            onChange={(v) => setFilters((p) => ({ ...p, [f.key]: v }))}
            capitalize
            options={f.opts.map((o) => ({ value: o, label: o === "all" ? `All ${f.key}` : label(o) }))}
          />
        ))}
      </div>

      {loading ? (
        <SALoader />
      ) : filtered.length === 0 ? (
        <div className={`${card} py-20 text-center`}><Inbox className="mx-auto mb-3 h-10 w-10 text-gray-300" /><p className="text-gray-500">No tickets match your filters</p></div>
      ) : (
        <div className={`${card} overflow-hidden`}>
          <div className="hidden grid-cols-[1fr_120px_110px_130px_70px_90px] gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 lg:grid">
            <span>Ticket</span><span>Category</span><span>Priority</span><span>Status</span><span>CSAT</span><span className="text-right">Age</span>
          </div>
          <div className="divide-y divide-gray-100">
            {filtered.map((t) => (
              <button
                key={t._id}
                onClick={() => navigate(`/tickets/${t._id}`)}
                className="group grid w-full grid-cols-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/[0.04] lg:grid-cols-[1fr_120px_110px_130px_70px_90px]"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PRIORITY_DOT[t.priority] || "#9ca3af" }} title={`${t.priority} priority`} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{t.summary}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400">
                      <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-500 dark:bg-white/10"><Building2 className="h-2.5 w-2.5" />{t.organisationId?.name || "—"}</span>
                      <SourceBadge reporter={t.reporter} />
                      <span className="font-mono">#{t.ticketNumber}</span>
                      <span className="truncate">{t.reporter?.name || t.reporter?.email}</span>
                      {t.comments?.length ? <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{t.comments.length}</span> : null}
                    </div>
                  </div>
                </div>
                <span className="hidden text-xs text-gray-500 lg:block">{supportCategoryLabel(t.category)}</span>
                <div className="hidden lg:block"><Badge className={PRIORITY[t.priority]}>{t.priority}</Badge></div>
                <div className="hidden lg:block"><StatusPill status={t.status} /></div>
                <div className="hidden lg:block">{t.satisfactionRating ? <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-500"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{t.satisfactionRating}</span> : <span className="text-gray-300">—</span>}</div>
                <div className="hidden items-center justify-end gap-1 whitespace-nowrap text-xs text-gray-400 lg:flex">
                  {timeAgo(t.createdAt)}
                  <ChevronRight className="h-4 w-4 -translate-x-1 text-gray-300 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 lg:hidden">
                  <Badge className={PRIORITY[t.priority]}>{t.priority}</Badge>
                  <StatusPill status={t.status} />
                  <Badge className={TRIAGE[t.triage]}>{t.triage}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// On a Vite hot-reload the service module survives, so its ticket caches would
// keep serving stale data. Drop them on dispose → the remounted screen re-fetches
// from the API and updates state. Dev-only: stripped from production builds.
if (import.meta.hot) {
  import.meta.hot.dispose(() => superadminService.clearTicketsCache());
}
