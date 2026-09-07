import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import {
  Lock,
  Mail,
  Flag,
  CheckCircle2,
  Plus,
  Sparkles,
  XCircle,
  Filter,
} from "lucide-react";
import SALoader from "../SALoader";
import { sanitizeRichText } from "../../components/RichTextEditor";
import superadminService from "../../services/superadmin.service";
import SAErrorState from "../components/SAErrorState";
import { useSARealtime } from "../context/SARealtimeContext";
import { cn } from "../../utils/cn";
import { typeMeta } from "../../config/taskOptions";
import { card } from "../components/taskShared";
import { useLeadRecord, LeadHeader, stageMeta, fmtDateTime } from "./leadShared";

/**
 * Everything that has happened to this lead, newest first, in one column.
 *
 * The record's history is currently spread across three places that each know
 * a third of it: the note thread, the stage history, and the tasks. Answering
 * "what actually happened with Riverbank?" means reading all three and
 * interleaving them by hand. This does the interleaving.
 *
 * It is assembled in the browser rather than served as one endpoint because the
 * three sources have different lifetimes and different owners — merging them
 * server-side would mean a fourth thing to keep in step, and the client already
 * holds two of the three.
 */

const KINDS = [
  { value: "all", label: "Everything" },
  { value: "notes", label: "Notes & replies" },
  { value: "tasks", label: "Tasks" },
  { value: "stage", label: "Stage changes" },
];

/** Visual identity for one entry type. */
function entryStyle(entry) {
  switch (entry.kind) {
    case "reply": return { Icon: Mail, tone: "text-accent", ring: "border-accent/30 bg-accent/5" };
    case "note": return { Icon: Lock, tone: "text-amber-600 dark:text-amber-400", ring: "border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5" };
    case "task_done": return { Icon: CheckCircle2, tone: "text-emerald-600 dark:text-emerald-400", ring: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/5" };
    case "task_created": return { Icon: Plus, tone: "text-gray-400", ring: "border-gray-200 bg-white dark:border-white/10 dark:bg-transparent" };
    case "stage": return { Icon: Flag, tone: "text-indigo-500", ring: "border-gray-200 bg-white dark:border-white/10 dark:bg-transparent" };
    default: return { Icon: Sparkles, tone: "text-gray-400", ring: "border-gray-200 bg-white dark:border-white/10 dark:bg-transparent" };
  }
}

export default function LeadTimeline() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tasksVersion } = useSARealtime();
  const { lead, apply, loading, error, reload, staff, openTasks } = useLeadRecord(id);

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const loadTasks = useCallback(async () => {
    try {
      const data = await superadminService.loadTasks({ lead: id, status: "all", limit: 100, sort: "created", dir: "desc" });
      setTasks(data?.tasks || []);
    } catch {
      // The thread and stage history still make a useful timeline on their own.
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [id]);

  useEffect(() => { loadTasks(); }, [loadTasks, tasksVersion]);

  /**
   * The merge. Every source is normalised to { at, kind, … } first so the sort
   * is a single comparison rather than three special cases.
   */
  const entries = useMemo(() => {
    if (!lead) return [];
    const out = [];

    (lead.thread || []).forEach((m, i) => {
      out.push({
        id: m._id || `thread-${i}`,
        at: m.createdAt,
        kind: m.kind === "reply" ? "reply" : "note",
        who: m.author?.name || m.authorName || "Operator",
        html: m.body,
        emailedTo: m.emailedTo,
        emailStatus: m.emailStatus,
      });
    });

    (lead.stageHistory || []).forEach((s, i) => {
      out.push({
        id: `stage-${i}`,
        at: s.at,
        kind: "stage",
        who: s.changedByName || "Someone",
        from: s.from,
        to: s.to,
        note: s.note,
      });
    });

    tasks.forEach((t) => {
      out.push({
        id: `task-new-${t._id}`,
        at: t.createdAt,
        kind: "task_created",
        who: t.createdBy?.name || "Someone",
        task: t,
      });
      // A completed task is the record of something that actually happened —
      // a call made, a proposal sent — so it earns its own entry at the time
      // it happened rather than being folded into the creation one.
      if (t.completedAt) {
        out.push({
          id: `task-done-${t._id}`,
          at: t.completedAt,
          kind: "task_done",
          who: t.assignee?.name || "Someone",
          task: t,
        });
      }
    });

    return out
      .filter((e) => e.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [lead, tasks]);

  const visible = useMemo(() => {
    if (filter === "all") return entries;
    if (filter === "notes") return entries.filter((e) => e.kind === "note" || e.kind === "reply");
    if (filter === "tasks") return entries.filter((e) => e.kind === "task_created" || e.kind === "task_done");
    return entries.filter((e) => e.kind === "stage");
  }, [entries, filter]);

  if (loading) return <SALoader label="Loading lead…" />;
  if (error) return <SAErrorState message={error} onRetry={() => reload({ force: true })} />;
  if (!lead) return null;

  return (
    <MotionConfig reducedMotion="user">
    <div className="[&_*]:!rounded-none">
      <LeadHeader lead={lead} apply={apply} staff={staff} openTasks={openTasks} />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Filter className="mr-1 h-3.5 w-3.5 text-gray-400" />
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => setFilter(k.value)}
            className={cn(
              "border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === k.value
                ? "border-accent bg-accent text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-white/10 dark:bg-white/5 dark:text-white/70",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      {tasksLoading ? (
        <SALoader label="Building the timeline…" minHeight="10rem" />
      ) : visible.length === 0 ? (
        <div className={`${card} py-16 text-center`}>
          <p className="text-sm text-gray-500">Nothing here yet</p>
          <p className="mt-1 text-xs text-gray-400">Notes, replies, stage changes and tasks will all appear on this line.</p>
        </div>
      ) : (
        <ol className="relative space-y-4 border-l border-gray-200 pl-6 dark:border-white/10">
          {visible.map((e) => {
            const { Icon, tone, ring } = entryStyle(e);
            return (
              <li key={e.id} className="relative">
                <span className={cn("absolute -left-[31px] grid h-6 w-6 place-items-center border bg-white dark:bg-[var(--admin-bg,#0b1220)]", "border-gray-200 dark:border-white/10")}>
                  <Icon className={cn("h-3 w-3", tone)} />
                </span>
                <div className={cn("border px-3.5 py-2.5", ring)}>
                  <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-white/80">{e.who}</span>
                    <span>· {fmtDateTime(e.at)}</span>
                  </div>

                  {e.kind === "note" || e.kind === "reply" ? (
                    <>
                      <div className={cn("mb-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]", tone)}>
                        {e.kind === "reply" ? (
                          <>
                            <Mail className="h-3 w-3" /> Replied to {e.emailedTo || "the lead"}
                            {e.emailStatus === "failed" ? <span className="ml-1 bg-red-100 px-1 text-red-600 dark:bg-red-500/15">email failed</span> : null}
                          </>
                        ) : (
                          <><Lock className="h-3 w-3" /> Internal note</>
                        )}
                      </div>
                      <div className="prose prose-sm max-w-none break-words text-gray-800 dark:prose-invert [&_a]:text-accent [&_p]:my-0" dangerouslySetInnerHTML={{ __html: sanitizeRichText(e.html) }} />
                    </>
                  ) : null}

                  {e.kind === "stage" ? (
                    <p className="text-sm text-gray-700 dark:text-white/80">
                      {e.from ? (
                        <>Moved from <strong>{stageMeta(e.from).label}</strong> to </>
                      ) : (
                        <>Entered </>
                      )}
                      <strong style={{ color: stageMeta(e.to).color }}>{stageMeta(e.to).label}</strong>
                      {e.note ? <span className="text-gray-500 dark:text-white/50"> — {e.note}</span> : null}
                    </p>
                  ) : null}

                  {e.kind === "task_created" || e.kind === "task_done" ? (
                    <button type="button" onClick={() => navigate(`/tasks/${e.task._id}`)} className="group w-full text-left">
                      <p className="flex items-center gap-1.5 text-sm text-gray-800 group-hover:text-accent dark:text-white/85">
                        {(() => { const T = typeMeta(e.task.type).icon; return <T className="h-3.5 w-3.5 shrink-0 text-gray-400" />; })()}
                        <span className="min-w-0 break-words">
                          {e.kind === "task_done" ? "Completed" : "Added"} “{e.task.title}”
                        </span>
                      </p>
                      {e.kind === "task_done" && e.task.outcome ? (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600 dark:text-white/60">{e.task.outcome}</p>
                      ) : null}
                    </button>
                  ) : null}

                  {e.kind === "stage" && e.to === "lost" ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
                      <XCircle className="h-3.5 w-3.5" /> Closed
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
    </MotionConfig>
  );
}
