import { Phone, Mail, Users, MonitorPlay, CornerUpRight, FileText, CheckSquare } from "lucide-react";

/**
 * The CRM task vocabulary — every label, colour and icon a task is drawn with,
 * in one place.
 *
 * The values here MUST match the enums in models/crmTask.js. They are split out
 * of the screens because a task is rendered in seven places (the list, the
 * board, the detail page, the editor, the lead's task tab, the lead timeline
 * and the dashboard tiles), and a status that is amber in one of them and grey
 * in another reads as two different states rather than one.
 *
 * Icons live here too. They are part of how a type is recognised — the phone
 * next to "Call Riverbank back" is doing more work than the word "call" — and
 * keeping them beside the labels is what stops the seventh screen inventing
 * its own.
 */

export const TASK_STATUSES = [
  { value: "todo", label: "To do", color: "#64748b", short: "To do" },
  { value: "in_progress", label: "In progress", color: "#0ea5e9", short: "Doing" },
  // "Waiting" is not a nicety. Most of a sales follow-up's life is spent
  // waiting on somebody else, and without a name for it that work sits in
  // "in progress" looking like it is being actively neglected.
  { value: "waiting", label: "Waiting", color: "#f59e0b", short: "Waiting" },
  { value: "done", label: "Done", color: "#10b981", short: "Done" },
  { value: "cancelled", label: "Cancelled", color: "#94a3b8", short: "Cancelled" },
];

/** Statuses that mean the work is finished — mirrors TERMINAL_STATUSES on the model. */
export const TERMINAL_STATUSES = ["done", "cancelled"];
export const OPEN_STATUSES = TASK_STATUSES.filter((s) => !TERMINAL_STATUSES.includes(s.value)).map((s) => s.value);

/** Board columns. Cancelled is deliberately absent — see the board endpoint. */
export const BOARD_STATUSES = TASK_STATUSES.filter((s) => s.value !== "cancelled");

export const TASK_TYPES = [
  { value: "call", label: "Call", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Users },
  { value: "demo", label: "Demo", icon: MonitorPlay },
  { value: "follow_up", label: "Follow-up", icon: CornerUpRight },
  { value: "proposal", label: "Proposal", icon: FileText },
  { value: "todo", label: "To-do", icon: CheckSquare },
];

export const TASK_PRIORITIES = [
  { value: "low", label: "Low", color: "#94a3b8" },
  { value: "normal", label: "Normal", color: "#64748b" },
  { value: "high", label: "High", color: "#f97316" },
  { value: "urgent", label: "Urgent", color: "#ef4444" },
];

/** Sales-attention priority on the ACCOUNT — distinct from a task's priority. */
export const LEAD_PRIORITIES = [
  { value: "low", label: "Low", color: "#94a3b8" },
  { value: "normal", label: "Normal", color: "#64748b" },
  { value: "high", label: "High", color: "#f97316" },
];

const find = (list, value) => list.find((o) => o.value === value);

export const statusMeta = (v) => find(TASK_STATUSES, v) || { value: v, label: v || "—", color: "#94a3b8", short: v };
export const typeMeta = (v) => find(TASK_TYPES, v) || { value: v, label: v || "—", icon: CheckSquare };
export const priorityMeta = (v) => find(TASK_PRIORITIES, v) || { value: v, label: v || "—", color: "#64748b" };
export const leadPriorityMeta = (v) => find(LEAD_PRIORITIES, v) || { value: v, label: v || "—", color: "#64748b" };

export const isTerminal = (status) => TERMINAL_STATUSES.includes(status);

/** A task nobody has finished, whose deadline has passed. */
export const isOverdue = (task) =>
  !!task?.dueAt && !isTerminal(task.status) && new Date(task.dueAt).getTime() < Date.now();

/**
 * How a due date reads to an operator: not the date, but what it means.
 *
 * Returns `{ text, tone }` where tone is one of "overdue" | "today" |
 * "soon" | "normal" | "none". Everything that renders a due date goes through
 * this so "Tomorrow" never appears in red on one screen and grey on another.
 */
export function dueMeta(dueAt, status) {
  if (!dueAt) return { text: "No due date", tone: "none" };
  const due = new Date(dueAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((new Date(due.getFullYear(), due.getMonth(), due.getDate()) - startOfToday) / 86400000);
  const time = due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  // A finished task's deadline is history — it describes when it was due, not
  // a debt. Showing "3 days overdue" on completed work is how a task list
  // teaches an operator to stop trusting the colour.
  if (isTerminal(status)) {
    return { text: due.toLocaleDateString(undefined, { day: "numeric", month: "short" }), tone: "none" };
  }
  if (due.getTime() < now.getTime()) {
    if (days === 0) return { text: `Overdue · ${time}`, tone: "overdue" };
    const ago = Math.abs(days);
    return { text: ago === 1 ? "Overdue by a day" : `Overdue by ${ago} days`, tone: "overdue" };
  }
  if (days === 0) return { text: `Today · ${time}`, tone: "today" };
  if (days === 1) return { text: `Tomorrow · ${time}`, tone: "soon" };
  if (days < 7) return { text: due.toLocaleDateString(undefined, { weekday: "long" }), tone: "soon" };
  return {
    text: due.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      // The year only matters when it isn't this one.
      year: due.getFullYear() === now.getFullYear() ? undefined : "numeric",
    }),
    tone: "normal",
  };
}

/** Tailwind classes for a due tone. Kept beside dueMeta so the pair can't drift. */
export const DUE_TONE_CLASS = {
  overdue: "text-red-600 dark:text-red-400",
  today: "text-amber-600 dark:text-amber-400",
  soon: "text-gray-600 dark:text-white/70",
  normal: "text-gray-500 dark:text-white/50",
  none: "text-gray-300 dark:text-white/30",
};

/**
 * `dueAt` (ISO, UTC) as the value a <input type="datetime-local"> wants, which
 * is LOCAL wall-clock with no zone. Going through toISOString() here is the
 * classic bug: it would shift a 9am Sydney deadline to the previous evening.
 */
export function toLocalInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The inverse: a datetime-local string back to an ISO instant, or null. */
export function fromLocalInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Quick due-date presets for the editor. Times are chosen to be plausible
 * working moments rather than midnight, which reads as "the end of yesterday".
 */
export const DUE_PRESETS = [
  { label: "Today, 5pm", get: () => atHour(0, 17) },
  { label: "Tomorrow, 9am", get: () => atHour(1, 9) },
  { label: "In 3 days", get: () => atHour(3, 9) },
  { label: "Next week", get: () => atHour(7, 9) },
];

function atHour(daysFromNow, hour) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d;
}
