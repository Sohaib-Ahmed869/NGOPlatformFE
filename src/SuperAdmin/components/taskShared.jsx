import { Link } from "react-router-dom";
import { Calendar, Building2, MessageSquare, CheckSquare, AlertTriangle } from "lucide-react";
import { cn } from "../../utils/cn";
import {
  statusMeta,
  typeMeta,
  priorityMeta,
  dueMeta,
  DUE_TONE_CLASS,
  isOverdue,
  isTerminal,
} from "../../config/taskOptions";

/**
 * The pieces a task is drawn from, shared by the list, the board, the detail
 * page, the lead's task tab and the lead timeline.
 *
 * Five screens render a task. Left to themselves they drift — the same "high"
 * priority becomes an orange dot here and a grey word there, and an operator
 * scanning between two of them has to re-learn the colours. These are the
 * shared vocabulary; config/taskOptions.js holds the values behind them.
 */

export const card = "border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";

/** Status, as a tinted pill. Same construction as the leads StageBadge. */
export function StatusBadge({ status, className }) {
  const m = statusMeta(status);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold", className)}
      style={{ background: `${m.color}1a`, color: m.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

/**
 * Priority. Normal and low render as a bare dot with no label.
 *
 * Most tasks are normal priority, so labelling every one of them spends the
 * row's attention on the least informative thing in it. Only the two that mean
 * "look at me" get words.
 */
export function PriorityTag({ priority, showNormal = false }) {
  const m = priorityMeta(priority);
  const loud = priority === "high" || priority === "urgent";
  if (!loud && !showNormal) {
    return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: m.color }} title={`${m.label} priority`} />;
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
      style={{ background: `${m.color}1a`, color: m.color }}
    >
      {priority === "urgent" ? <AlertTriangle className="h-3 w-3" /> : null}
      {m.label}
    </span>
  );
}

/** Type, as its icon. The word is the tooltip — the glyph carries it in a row. */
export function TypeIcon({ type, className }) {
  const m = typeMeta(type);
  const Icon = m.icon;
  return <Icon className={cn("h-4 w-4 shrink-0", className)} title={m.label} />;
}

/** A due date, coloured by what it means rather than by what it says. */
export function DueLabel({ dueAt, status, className, withIcon = true }) {
  const m = dueMeta(dueAt, status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", DUE_TONE_CLASS[m.tone], className)}>
      {withIcon ? <Calendar className="h-3.5 w-3.5 shrink-0" /> : null}
      {m.text}
    </span>
  );
}

/** "3/8" — only rendered when there is a checklist to report on. */
export function ChecklistProgress({ done, total, className }) {
  if (!total) return null;
  const complete = done >= total;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] tabular-nums",
        complete ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400",
        className,
      )}
      title={`${done} of ${total} steps done`}
    >
      <CheckSquare className="h-3.5 w-3.5" />
      {done}/{total}
    </span>
  );
}

/** The operator a task belongs to, or an explicit "Unassigned". */
export function AssigneeLabel({ assignee, className }) {
  const name = assignee?.name || assignee?.userId?.name || "";
  if (!name) return <span className={cn("text-gray-300 dark:text-white/25", className)}>Unassigned</span>;
  return <span className={cn("truncate", className)}>{name}</span>;
}

/**
 * The lead a task is about. Renders nothing when the task is standalone —
 * an em dash in this slot reads as "the lead is missing" rather than "there
 * isn't one", and standalone tasks are a supported, ordinary case.
 */
export function RelatedLead({ lead, className, onNavigate }) {
  if (!lead?._id) return null;
  return (
    <Link
      to={`/leads/${lead._id}`}
      onClick={(e) => {
        e.stopPropagation();
        onNavigate?.();
      }}
      className={cn("inline-flex min-w-0 items-center gap-1.5 text-xs text-gray-500 hover:text-accent dark:text-white/60", className)}
    >
      <Building2 className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{lead.orgName}</span>
    </Link>
  );
}

/**
 * One task as a card — the board column's unit, and the lead tab's.
 *
 * A finished task keeps its full text at reduced contrast rather than being
 * struck through: an operator re-reads what was done far more often than they
 * re-read what is pending, and strikethrough makes exactly that unreadable.
 */
export function TaskCard({ task, onOpen, showLead = true, className, children }) {
  const overdue = isOverdue(task);
  const done = isTerminal(task.status);
  const leadRef = task.leadRef || task.lead;
  return (
    <div
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (e) => { if (e.key === "Enter") onOpen(e); } : undefined}
      className={cn(
        "group relative border bg-white p-3 shadow-sm transition-all dark:bg-[var(--admin-card)]",
        onOpen && "cursor-pointer hover:border-accent/50 hover:shadow-md",
        overdue ? "border-red-200 dark:border-red-500/30" : "border-gray-200 dark:border-white/10",
        done && "opacity-70",
        className,
      )}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <TypeIcon type={task.type} className="mt-0.5 text-gray-400" />
          <p className={cn("min-w-0 text-[13px] font-semibold leading-snug text-gray-900 dark:text-white", done && "font-medium")}>
            {task.title}
          </p>
        </div>
        <PriorityTag priority={task.priority} />
      </div>

      {showLead && leadRef?.orgName ? <RelatedLead lead={leadRef} className="mb-1.5" /> : null}

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-100 pt-2 dark:border-white/10">
        <DueLabel dueAt={task.dueAt} status={task.status} />
        <div className="flex shrink-0 items-center gap-2.5">
          <ChecklistProgress done={task.checklistDone} total={task.checklistTotal} />
          {task.commentCount ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400" title={`${task.commentCount} comment(s)`}>
              <MessageSquare className="h-3.5 w-3.5" />
              {task.commentCount}
            </span>
          ) : null}
          {task.assignee?.name ? (
            <span className="max-w-[90px] truncate text-[11px] text-gray-400">{task.assignee.name.split(" ")[0]}</span>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

/** The console's standard hero stat tile — same construction as the Leads hero. */
export function HeaderStat({ icon: Icon, label, value, sub, color }) {
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

export const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";

/** Relative age, matching the Leads table's compact form. */
export function timeAgo(d) {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24); if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
