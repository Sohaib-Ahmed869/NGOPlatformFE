import { useState, useEffect, useCallback } from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Building2,
  Trash2,
  Pencil,
  Sparkles,
  XCircle,
  CheckCircle2,
  ExternalLink,
  DollarSign,
  CalendarClock,
  Flag,
  Tag as TagIcon,
  FileText,
  ListChecks,
  History,
} from "lucide-react";
import { CustomSelect } from "../../components/CustomSelect";
import superadminService from "../../services/superadmin.service";
import { useSARealtime } from "../context/SARealtimeContext";
import { useConfirm } from "../components/ConfirmProvider";
import LostReasonModal from "../components/LostReasonModal";
import { leadPriorityMeta } from "../../config/taskOptions";
import { cn } from "../../utils/cn";

/**
 * Everything the three lead pages (detail, tasks, timeline) share.
 *
 * They are separate routes rather than tabs in one component because each is a
 * genuinely different view of the record and each deserves its own URL — an
 * operator links a colleague to a lead's timeline, not to "the lead, then click
 * the third tab". What they must NOT differ on is the identity strip at the
 * top: the same name, stage, owner and deal value, in the same place, on all
 * three. That is what lives here.
 */

export const card = "border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";

/** Pipeline stages an operator can move a lead between by hand. */
export const STAGES = [
  { key: "new", label: "New", color: "#f59e0b" },
  { key: "contacted", label: "Contacted", color: "#0ea5e9" },
  { key: "qualified", label: "Qualified", color: "#8b5cf6" },
  { key: "demo_scheduled", label: "Demo Scheduled", color: "#6366f1" },
  { key: "proposal_sent", label: "Proposal Sent", color: "#ec4899" },
];
export const stageMeta = (key) =>
  STAGES.find((s) => s.key === key) ||
  (key === "won" ? { key, label: "Won", color: "#10b981" } : key === "lost" ? { key, label: "Lost", color: "#94a3b8" } : { key, label: key, color: "#94a3b8" });

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

/** Annualised deal value. AUD is the catalogue's currency; the field carries its own. */
export function fmtMoney(value, currency = "aud") {
  const n = Number(value || 0);
  if (!n) return "—";
  try {
    return n.toLocaleString("en-AU", { style: "currency", currency: (currency || "aud").toUpperCase(), maximumFractionDigits: 0 });
  } catch {
    // An unknown currency code would otherwise throw inside a render.
    return `${(currency || "").toUpperCase()} ${n.toLocaleString("en-AU")}`;
  }
}

/**
 * Load one lead, keep it fresh, and hand back the pieces every lead page needs.
 *
 * Reads through the session cache first so moving between the three tabs is
 * instant rather than three separate loads of the same document.
 */
export function useLeadRecord(id) {
  const navigate = useNavigate();
  const { socket } = useSARealtime();
  const cached = superadminService.getCachedLead(id);

  const [lead, setLead] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [staff, setStaff] = useState([]);
  // Open-task count for the Tasks tab badge. One cheap counting request — the
  // rows themselves are only fetched by the tab that shows them.
  const [openTasks, setOpenTasks] = useState(null);

  const apply = useCallback((next) => {
    setLead(next);
    superadminService.setLeadCache(next);
  }, []);

  const load = useCallback(async ({ force = false } = {}) => {
    try {
      setLead(await superadminService.loadLead(id, { force }));
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't load this lead.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const countTasks = useCallback(async () => {
    try {
      // limit 1 — only the total is wanted, not the page.
      const data = await superadminService.loadTasks({ lead: id, status: "open", limit: 1 });
      setOpenTasks(data?.pagination?.total || 0);
    } catch {
      /* the badge is a nicety; its absence must not break the page */
    }
  }, [id]);

  useEffect(() => {
    superadminService.loadLeadStaff().then(setStaff).catch(() => {});
  }, []);

  useEffect(() => {
    const c = superadminService.getCachedLead(id);
    if (c && !superadminService.isLeadStale(id)) {
      setLead(c);
      setLoading(false);
    } else {
      setLoading(!c);
      load();
    }
    countTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!socket) return undefined;
    const onChange = (p) => { if (p?.id === id) load({ force: true }); };
    const onTask = (p) => { if (!p?.leadId || p.leadId === id) countTasks(); };
    const onDeleted = (p) => { if (p?.id === id) navigate("/leads"); };
    socket.on("lead:message", onChange);
    socket.on("lead:updated", onChange);
    socket.on("lead:converted", onChange);
    socket.on("lead:deleted", onDeleted);
    socket.on("task:updated", onTask);
    return () => {
      socket.off("lead:message", onChange);
      socket.off("lead:updated", onChange);
      socket.off("lead:converted", onChange);
      socket.off("lead:deleted", onDeleted);
      socket.off("task:updated", onTask);
    };
  }, [socket, id, load, countTasks, navigate]);

  return { lead, setLead, apply, loading, error, reload: load, staff, openTasks, refreshTaskCount: countTasks };
}

/** One number in the header's deal strip. */
function DealStat({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", tone || "text-gray-400")} />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">{label}</p>
        <p className="truncate text-sm font-medium text-gray-800 dark:text-white/85">{value}</p>
      </div>
    </div>
  );
}

const TABS = [
  { to: "", label: "Overview", icon: FileText, end: true },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/timeline", label: "Timeline", icon: History },
];

/**
 * The identity strip: who this lead is, where they are in the pipeline, what
 * the deal is worth, and the three views of them.
 *
 * `apply` takes the server's updated lead so the page and the session cache
 * move together — every mutation here goes through it.
 */
export function LeadHeader({ lead, apply, staff, openTasks }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [stageBusy, setStageBusy] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);

  const closed = lead.stage === "won" || lead.stage === "lost";
  const currentIdx = STAGES.findIndex((s) => s.key === lead.stage);
  const teamOptions = [{ value: "", label: "Unassigned" }, ...staff.map((s) => ({ value: s._id, label: s.name || s.email }))];
  const priority = leadPriorityMeta(lead.priority);

  const handleAssign = async (val) => {
    try {
      apply((await superadminService.assignLead(lead._id, val || null)).data.lead);
    } catch {
      toast.error("Failed to assign");
    }
  };

  const jumpStage = async (targetStage) => {
    if (lead.stage === targetStage || stageBusy) return;
    setStageBusy(true);
    try {
      apply((await superadminService.changeLeadStage(lead._id, { stage: targetStage })).data.lead);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to change stage");
    } finally {
      setStageBusy(false);
    }
  };

  const handleLostConfirm = async (reason, note) => {
    setStageBusy(true);
    try {
      apply((await superadminService.changeLeadStage(lead._id, { stage: "lost", lostReason: reason, lostReasonNote: note })).data.lead);
      setLostOpen(false);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to mark lost");
    } finally {
      setStageBusy(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete this lead",
      message: `The record for ${lead.orgName}, its note thread and its tasks' link to it will be permanently removed.`,
      tone: "danger",
      confirmText: "Delete",
      icon: Trash2,
      onConfirm: async () => {
        await superadminService.deleteLead(lead._id);
        superadminService.removeLeadCache(lead._id);
      },
    });
    if (ok) { toast.success("Lead deleted"); navigate("/leads"); }
  };

  const hasDeal = lead.dealValue > 0 || lead.expectedCloseAt || lead.priority !== "normal" || lead.tags?.length;

  return (
    <>
      <button type="button" onClick={() => navigate("/leads")} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-accent">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
        Back to leads
      </button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`${card} mb-4 p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent"><Building2 className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 [overflow-wrap:anywhere] dark:text-white">{lead.orgName}</h1>
              <p className="text-sm text-gray-500 [overflow-wrap:anywhere] dark:text-white/60">
                {lead.contactName} · <a href={`mailto:${lead.contactEmail}`} className="text-accent hover:underline">{lead.contactEmail}</a>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => navigate(`/tasks/new?lead=${lead._id}`)} className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5">
              <ListChecks className="h-3.5 w-3.5" /> Add task
            </button>
            <button type="button" onClick={() => navigate(`/leads/${lead._id}/edit`)} className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            {!closed ? (
              <>
                <button type="button" onClick={() => setLostOpen(true)} disabled={stageBusy} className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5">
                  <XCircle className="h-3.5 w-3.5" /> Mark lost
                </button>
                <button type="button" onClick={() => navigate(`/leads/${lead._id}/convert`)} className="inline-flex items-center gap-1.5 bg-accent px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-light">
                  <Sparkles className="h-3.5 w-3.5" /> Convert
                </button>
              </>
            ) : null}
            <button type="button" onClick={handleDelete} title="Delete lead" className="grid h-9 w-9 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Outcome banner */}
        {lead.stage === "won" ? (
          <div className="mt-4 flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Converted{lead.convertedAt ? ` on ${fmtDateTime(lead.convertedAt)}` : ""}.</span>
            {lead.convertedOrgId?._id ? (
              <Link to={`/organisations/${lead.convertedOrgId._id}`} className="ml-auto inline-flex shrink-0 items-center gap-1 font-semibold hover:underline">View org <ExternalLink className="h-3.5 w-3.5" /></Link>
            ) : null}
          </div>
        ) : lead.stage === "lost" ? (
          <div className="mt-4 flex items-center gap-2 border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>Marked lost{lead.lostReason ? ` — ${lead.lostReason.replace(/_/g, " ")}` : ""}{lead.lostReasonNote ? `: ${lead.lostReasonNote}` : ""}</span>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-1 overflow-x-auto pb-1">
            {STAGES.map((s, i) => {
              const doneStage = i <= currentIdx;
              return (
                <button
                  key={s.key}
                  type="button"
                  disabled={stageBusy}
                  onClick={() => jumpStage(s.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                    doneStage ? "text-white" : "border-gray-200 bg-white text-gray-400 hover:border-gray-300 dark:border-white/10 dark:bg-white/5",
                  )}
                  style={doneStage ? { background: s.color, borderColor: s.color } : undefined}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Deal strip. Hidden entirely when nothing has been filled in — a row
            of em dashes takes the same space as real numbers and tells the
            operator nothing. */}
        {hasDeal ? (
          <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 dark:border-white/10 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
            {lead.dealValue > 0 ? <DealStat icon={DollarSign} label="Annual value" value={fmtMoney(lead.dealValue, lead.currency)} tone="text-emerald-500" /> : null}
            {lead.expectedCloseAt ? <DealStat icon={CalendarClock} label="Expected close" value={fmtDate(lead.expectedCloseAt)} /> : null}
            {lead.priority && lead.priority !== "normal" ? (
              <DealStat icon={Flag} label="Priority" value={<span style={{ color: priority.color }}>{priority.label}</span>} />
            ) : null}
            {lead.tags?.length ? (
              <DealStat icon={TagIcon} label="Tags" value={lead.tags.join(" · ")} />
            ) : null}
          </div>
        ) : null}

        {/* Assignment */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Owner</span>
          <CustomSelect
            value={lead.assignee?.userId?._id || lead.assignee?.userId || ""}
            onChange={handleAssign}
            options={teamOptions}
            searchable
            searchPlaceholder="Search operators…"
            placeholder="Unassigned"
            className="min-w-[180px]"
            triggerClassName="border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]"
          />
        </div>
      </motion.div>

      {/* Tabs — real routes, so each view is linkable on its own. */}
      <div className="mb-4 inline-flex overflow-x-auto border border-gray-200 dark:border-white/10">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <NavLink
              key={t.to}
              to={`/leads/${lead._id}${t.to}`}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  "inline-flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-accent text-white" : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-white/5 dark:text-white/70",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.to === "/tasks" && openTasks ? (
                <span className="ml-0.5 bg-black/10 px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums dark:bg-white/15">{openTasks}</span>
              ) : null}
            </NavLink>
          );
        })}
      </div>

      {lostOpen ? <LostReasonModal lead={lead} onClose={() => setLostOpen(false)} onConfirm={handleLostConfirm} /> : null}
    </>
  );
}
