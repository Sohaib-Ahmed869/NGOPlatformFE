import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MotionConfig, motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { Plus, Loader2, ListChecks, Settings2, RefreshCw, CheckCircle2 } from "lucide-react";
import SALoader from "../SALoader";
import { CustomSelect } from "../../components/CustomSelect";
import superadminService from "../../services/superadmin.service";
import SAErrorState from "../components/SAErrorState";
import { useSARealtime } from "../context/SARealtimeContext";
import { cn } from "../../utils/cn";
import { TASK_TYPES, DUE_PRESETS, toLocalInput, fromLocalInput, isTerminal } from "../../config/taskOptions";
import { TaskCard, card } from "../components/taskShared";
import { useLeadRecord, LeadHeader } from "./leadShared";

/**
 * Everything the team owes this one prospect.
 *
 * The quick-add row at the top is the point of the page: the moment an operator
 * finishes a call is the moment the next task exists, and if capturing it costs
 * a navigation to a full form it does not get captured. Type a line, press
 * Enter, carry on — the full editor is one click away for the cases that need
 * a description or a checklist.
 */
export default function LeadTasks() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tasksVersion, refreshMyTasksDue } = useSARealtime();
  const { lead, apply, loading, error, reload, staff, openTasks, refreshTaskCount } = useLeadRecord(id);

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // Quick-add
  const [title, setTitle] = useState("");
  const [type, setType] = useState("call");
  const [dueAt, setDueAt] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      // status "all" always — the done/open split is done in the browser so
      // toggling "show completed" costs nothing and can't lose the open ones.
      const data = await superadminService.loadTasks({ lead: id, status: "all", limit: 100, sort: "due", dir: "asc" });
      setTasks(data?.tasks || []);
      setTasksError(null);
    } catch (err) {
      setTasksError(err?.response?.data?.error || "Couldn't load this lead's tasks.");
    } finally {
      setTasksLoading(false);
    }
  }, [id]);

  useEffect(() => { loadTasks(); }, [loadTasks, tasksVersion]);

  const { open, closed } = useMemo(() => {
    const o = [];
    const c = [];
    tasks.forEach((t) => (isTerminal(t.status) ? c : o).push(t));
    return { open: o, closed: c };
  }, [tasks]);

  const create = async (e) => {
    e?.preventDefault();
    const t = title.trim();
    if (!t || creating) return;
    setCreating(true);
    try {
      await superadminService.createTask({
        title: t,
        type,
        dueAt: fromLocalInput(dueAt),
        assigneeUserId: assigneeUserId || null,
        leadId: id,
      });
      setTitle("");
      setDueAt("");
      setExpanded(false);
      await loadTasks();
      refreshTaskCount();
      refreshMyTasksDue();
      toast.success("Task added");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't add that task");
    } finally {
      setCreating(false);
    }
  };

  const toggleDone = async (task) => {
    setBusyId(task._id);
    const next = isTerminal(task.status) ? "todo" : "done";
    try {
      const res = await superadminService.changeTaskStatus(task._id, { status: next });
      setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, ...res.data.task } : t)));
      refreshTaskCount();
      refreshMyTasksDue();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't update that task");
    } finally {
      setBusyId(null);
    }
  };

  const staffOptions = [{ value: "", label: "Unassigned" }, ...staff.map((s) => ({ value: s._id, label: s.name || s.email }))];

  if (loading) return <SALoader label="Loading lead…" />;
  if (error) return <SAErrorState message={error} onRetry={() => reload({ force: true })} />;
  if (!lead) return null;

  return (
    <MotionConfig reducedMotion="user">
    <div className="[&_*]:!rounded-none">
      <LeadHeader lead={lead} apply={apply} staff={staff} openTasks={openTasks} />

      {/* Quick add */}
      <form onSubmit={create} className={`${card} mb-4 p-4`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[240px] flex-1 items-center gap-2">
            <Plus className="h-4 w-4 shrink-0 text-gray-300" />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => setExpanded(true)}
              placeholder={`Add a follow-up for ${lead.contactName?.split(" ")[0] || lead.orgName}…`}
              maxLength={200}
              className="w-full border-0 bg-transparent py-1.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-white/85"
            />
          </div>
          <button
            type="submit"
            disabled={!title.trim() || creating}
            className="inline-flex shrink-0 items-center gap-1.5 bg-accent px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-40"
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add
          </button>
          <button
            type="button"
            onClick={() => navigate(`/tasks/new?lead=${id}`)}
            title="Open the full task form"
            className="grid h-9 w-9 shrink-0 place-items-center border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>

        {/* The detail an operator wants often enough to keep on this page, but
            not so often that it should be in the way before they've typed. */}
        <AnimatePresence>
          {expanded ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-white/10">
                <CustomSelect
                  value={type}
                  onChange={setType}
                  options={TASK_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                  className="min-w-[130px]"
                  triggerClassName="border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
                />
                <CustomSelect
                  value={assigneeUserId}
                  onChange={setAssigneeUserId}
                  options={staffOptions}
                  searchable
                  searchPlaceholder="Search operators…"
                  className="min-w-[150px]"
                  triggerClassName="border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
                />
                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-800 outline-none focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/85"
                />
                {DUE_PRESETS.slice(0, 3).map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setDueAt(toLocalInput(p.get()))}
                    className="border border-gray-200 px-2 py-1 text-[11px] text-gray-500 transition-colors hover:border-accent hover:text-accent dark:border-white/10 dark:text-white/60"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </form>

      {tasksLoading ? (
        <SALoader label="Loading tasks…" minHeight="10rem" />
      ) : tasksError ? (
        <SAErrorState message={tasksError} onRetry={loadTasks} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Open · {open.length}
            </h2>
            <button type="button" onClick={loadTasks} title="Refresh" className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:text-accent">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {open.length === 0 ? (
            <div className={`${card} py-12 text-center`}>
              <ListChecks className="mx-auto mb-3 h-9 w-9 text-gray-300" />
              <p className="text-sm text-gray-500">Nothing outstanding on this lead</p>
              <p className="mt-1 text-xs text-gray-400">Add a follow-up above so it doesn’t go quiet.</p>
            </div>
          ) : (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
              {open.map((t) => (
                <TaskCard key={t._id} task={t} showLead={false} onOpen={() => navigate(`/tasks/${t._id}`)}>
                  <button
                    type="button"
                    disabled={busyId === t._id}
                    onClick={(e) => { e.stopPropagation(); toggleDone(t); }}
                    title="Mark done"
                    className="absolute right-2 top-2 grid h-6 w-6 place-items-center border border-gray-200 bg-white text-gray-300 opacity-0 transition-all hover:border-emerald-500 hover:text-emerald-500 group-hover:opacity-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/10"
                  >
                    {busyId === t._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>
                </TaskCard>
              ))}
            </div>
          )}

          {closed.length ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowDone((v) => !v)}
                className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 transition-colors hover:text-accent"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed · {closed.length}
                <span className={cn("transition-transform", showDone && "rotate-180")}>▾</span>
              </button>
              {showDone ? (
                <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                  {closed.map((t) => (
                    <TaskCard key={t._id} task={t} showLead={false} onOpen={() => navigate(`/tasks/${t._id}`)} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
    </MotionConfig>
  );
}
