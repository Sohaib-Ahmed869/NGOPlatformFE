import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Loader2,
  Send,
  Trash2,
  Pencil,
  CheckCircle2,
  Plus,
  X,
  Tag as TagIcon,
  MessageSquare,
  History,
  Building2,
  Mail,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { CustomSelect } from "../../components/CustomSelect";
import { RichTextEditor, sanitizeRichText } from "../../components/RichTextEditor";
import superadminService from "../../services/superadmin.service";
import SAErrorState from "../components/SAErrorState";
import { useAuth } from "../../context/AuthContext";
import { useSARealtime } from "../context/SARealtimeContext";
import { useConfirm } from "../components/ConfirmProvider";
import { cn } from "../../utils/cn";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_TYPES,
  statusMeta,
  typeMeta,
  isTerminal,
} from "../../config/taskOptions";
import { card, StatusBadge, PriorityTag, DueLabel, fmtDateTime } from "../components/taskShared";

const isRichEmpty = (html) => !sanitizeRichText(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;| /g, " ").trim();
const selectTrigger = "w-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-white/5";

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="shrink-0 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">{label}</span>
      <div className="min-w-0 flex-1 text-right text-sm text-gray-800 dark:text-white/85">{children}</div>
    </div>
  );
}

/** One line of the task's own history — who did what, when. */
function EventLine({ e }) {
  const who = e.byName || "Someone";
  const text = (() => {
    switch (e.kind) {
      case "created": return `${who} created this task`;
      case "status": return `${who} moved it to ${statusMeta(e.to).label}`;
      case "assigned": return `${who} assigned it to ${e.to}`;
      case "due": return e.to ? `${who} set the due date` : `${who} cleared the due date`;
      case "priority": return `${who} set priority to ${e.to}`;
      case "checklist": return `${who} ${e.to === "done" ? "ticked" : "reopened"} “${e.note}”`;
      case "comment": return `${who} commented`;
      default: return `${who} edited ${e.note || "the task"}`;
    }
  })();
  return (
    <li className="flex gap-2.5 text-xs">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300 dark:bg-white/20" />
      <div className="min-w-0">
        <p className="text-gray-600 dark:text-white/70">{text}</p>
        <p className="text-[10px] text-gray-400">{fmtDateTime(e.at)}</p>
      </div>
    </li>
  );
}

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const confirm = useConfirm();
  const { socket, refreshMyTasksDue } = useSARealtime();

  const cached = superadminService.getCachedTask(id);
  const [task, setTask] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [staff, setStaff] = useState([]);
  const [busy, setBusy] = useState(false);

  const [comment, setComment] = useState("");
  const [commentNonce, setCommentNonce] = useState(0);
  const [commentMentions, setCommentMentions] = useState([]);
  const [sending, setSending] = useState(false);
  const [checkDraft, setCheckDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  // The "how did it go?" capture, revealed by Done rather than shown always —
  // an outcome box on an open task is a question nobody can answer yet.
  const [completing, setCompleting] = useState(false);
  const [outcome, setOutcome] = useState("");

  const myEmail = (user?.email || "").toLowerCase();
  const myId = user?._id || user?.id || null;
  const isMine = useCallback(
    (author) => !!author && ((myId && author._id === myId) || (author.email && author.email.toLowerCase() === myEmail)),
    [myId, myEmail],
  );

  useEffect(() => {
    superadminService.loadTaskStaff().then(setStaff).catch(() => {});
  }, []);

  const apply = useCallback((next) => {
    setTask(next);
    superadminService.setTaskCache(next);
  }, []);

  const load = useCallback(async ({ force = false } = {}) => {
    try {
      setTask(await superadminService.loadTask(id, { force }));
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't load this task.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const c = superadminService.getCachedTask(id);
    if (c && !superadminService.isTaskStale(id)) {
      setTask(c);
      setLoading(false);
      return;
    }
    setLoading(!c);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!socket) return undefined;
    const onChange = (p) => {
      if (p?.id !== id) return;
      if (p?.deleted) { navigate("/tasks"); return; }
      load({ force: true });
    };
    socket.on("task:updated", onChange);
    return () => socket.off("task:updated", onChange);
  }, [socket, id, load, navigate]);

  /* ── mutations ── */
  const run = async (fn, failMsg) => {
    setBusy(true);
    try {
      const res = await fn();
      apply(res.data.task);
      refreshMyTasksDue();
      return res.data.task;
    } catch (e) {
      toast.error(e?.response?.data?.error || failMsg);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (status, withOutcome) =>
    run(() => superadminService.changeTaskStatus(id, { status, ...(withOutcome ? { outcome: withOutcome } : {}) }), "Couldn't change the status");

  const handleDone = async () => {
    const saved = await setStatus("done", outcome.trim() || undefined);
    if (saved) {
      setCompleting(false);
      setOutcome("");
      toast.success("Task completed");
    }
  };

  const patch = (data, failMsg = "Couldn't save that") => run(() => superadminService.updateTask(id, data), failMsg);

  const addComment = async () => {
    if (isRichEmpty(comment) || sending) return;
    setSending(true);
    try {
      const res = await superadminService.addTaskComment(id, {
        body: sanitizeRichText(comment),
        mentions: commentMentions,
      });
      apply(res.data.task);
      setComment("");
      setCommentMentions([]);
      setCommentNonce((n) => n + 1);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Couldn't add that comment");
    } finally {
      setSending(false);
    }
  };

  const addCheck = async () => {
    const text = checkDraft.trim();
    if (!text) return;
    setCheckDraft("");
    await run(() => superadminService.addTaskChecklistItem(id, text), "Couldn't add that step");
  };

  const addTag = async () => {
    const t = tagDraft.trim();
    if (!t) return;
    setTagDraft("");
    setAddingTag(false);
    if ((task.tags || []).includes(t)) return;
    await patch({ tags: [...(task.tags || []), t] }, "Couldn't add that tag");
  };

  const del = async () => {
    const ok = await confirm({
      title: "Delete this task",
      message: `"${task.title}" and its comments and checklist will be permanently removed. This can't be undone.`,
      tone: "danger",
      confirmText: "Delete",
      icon: Trash2,
      onConfirm: async () => { await superadminService.deleteTask(id); },
    });
    if (ok) { toast.success("Task deleted"); refreshMyTasksDue(); navigate("/tasks"); }
  };

  const commentEmpty = useMemo(() => isRichEmpty(comment), [comment]);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><TabLoader label="Loading task…" /></div>;
  if (error) return <SAErrorState message={error} onRetry={() => load({ force: true })} />;
  if (!task) return null;

  const done = isTerminal(task.status);
  const TypeGlyph = typeMeta(task.type).icon;
  const lead = task.lead;
  const staffOptions = [{ value: "", label: "Unassigned" }, ...staff.map((s) => ({ value: s._id, label: s.name || s.email }))];
  const checklistDone = (task.checklist || []).filter((c) => c.done).length;
  const checklistTotal = (task.checklist || []).length;
  const events = [...(task.events || [])].reverse();

  return (
    <MotionConfig reducedMotion="user">
    <div className="[&_*]:!rounded-none">
      <button type="button" onClick={() => navigate("/tasks")} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-accent">
        <ArrowLeft className="h-4 w-4" /> Back to tasks
      </button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`${card} mb-4 p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent"><TypeGlyph className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h1 className={cn("text-lg font-bold text-gray-900 [overflow-wrap:anywhere] dark:text-white", done && "text-gray-500 dark:text-white/50")}>{task.title}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={task.status} />
                <PriorityTag priority={task.priority} showNormal />
                <DueLabel dueAt={task.dueAt} status={task.status} />
                {lead?._id ? (
                  <Link to={`/leads/${lead._id}`} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-accent dark:text-white/60">
                    <Building2 className="h-3.5 w-3.5" /> {lead.orgName}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!done ? (
              <button type="button" onClick={() => setCompleting((v) => !v)} disabled={busy} className="inline-flex items-center gap-1.5 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50">
                <CheckCircle2 className="h-3.5 w-3.5" /> Mark done
              </button>
            ) : (
              <button type="button" onClick={() => setStatus("todo")} disabled={busy} className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5">
                Reopen
              </button>
            )}
            <button type="button" onClick={() => navigate(`/tasks/${id}/edit`)} className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button type="button" onClick={del} title="Delete task" className="grid h-9 w-9 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Completion capture — inline, not a dialog. */}
        <AnimatePresence>
          {completing ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-4 border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">How did it go?</label>
                <textarea
                  autoFocus
                  rows={3}
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="Spoke to Priya — wants a demo for the board on the 14th. Optional, but this is what the lead's timeline will show."
                  maxLength={4000}
                  className="w-full border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-emerald-500 dark:border-emerald-500/20 dark:bg-white/5 dark:text-white/85"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" onClick={handleDone} disabled={busy} className="inline-flex items-center gap-1.5 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50">
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Complete task
                  </button>
                  <button type="button" onClick={() => { setCompleting(false); setOutcome(""); }} className="px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:text-gray-800 dark:hover:text-white">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Status rail — one click to any state, mirroring the lead stage bar. */}
        <div className="mt-5 flex items-center gap-1 overflow-x-auto pb-1">
          {TASK_STATUSES.map((s) => {
            const active = task.status === s.value;
            return (
              <button
                key={s.value}
                type="button"
                disabled={busy}
                onClick={() => (s.value === "done" && !active ? setCompleting(true) : setStatus(s.value))}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                  active ? "text-white" : "border-gray-200 bg-white text-gray-400 hover:border-gray-300 dark:border-white/10 dark:bg-white/5",
                )}
                style={active ? { background: s.color, borderColor: s.color } : undefined}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-4 lg:col-span-2">
          {task.description && !isRichEmpty(task.description) ? (
            <div className={`${card} p-4`}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Details</h3>
              <div className="prose prose-sm max-w-none break-words text-gray-800 dark:prose-invert [&_a]:text-accent [&_p]:my-1" dangerouslySetInnerHTML={{ __html: sanitizeRichText(task.description) }} />
            </div>
          ) : null}

          {task.outcome ? (
            <div className={`${card} border-l-2 border-l-emerald-500 p-4`}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">Outcome</h3>
              <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-white/80">{task.outcome}</p>
            </div>
          ) : null}

          {/* Checklist */}
          <div className={`${card} p-4`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Checklist</h3>
              {checklistTotal ? (
                <span className="text-[11px] tabular-nums text-gray-400">{checklistDone}/{checklistTotal}</span>
              ) : null}
            </div>
            {checklistTotal ? (
              <>
                <div className="mb-3 h-1 w-full bg-gray-100 dark:bg-white/10">
                  <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${Math.round((checklistDone / checklistTotal) * 100)}%` }} />
                </div>
                <ul className="space-y-1">
                  {task.checklist.map((c) => (
                    <li key={c._id} className="group flex items-start gap-2.5 px-1 py-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => superadminService.updateTaskChecklistItem(id, c._id, { done: !c.done }), "Couldn't update that step")}
                        className={cn(
                          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center border transition-colors",
                          c.done ? "border-accent bg-accent text-white" : "border-gray-300 text-transparent hover:border-accent dark:border-white/20",
                        )}
                        aria-label={c.done ? `Reopen ${c.text}` : `Complete ${c.text}`}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                      </button>
                      <span className={cn("min-w-0 flex-1 break-words text-sm text-gray-800 dark:text-white/85", c.done && "text-gray-400 line-through dark:text-white/35")}>{c.text}</span>
                      <button
                        type="button"
                        onClick={() => run(() => superadminService.removeTaskChecklistItem(id, c._id), "Couldn't remove that step")}
                        className="shrink-0 text-gray-200 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100 dark:text-white/20"
                        aria-label={`Remove ${c.text}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <div className="mt-2 flex gap-2">
              <input
                value={checkDraft}
                onChange={(e) => setCheckDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCheck(); } }}
                placeholder="Add a step…"
                maxLength={200}
                className="w-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/85"
              />
              <button type="button" onClick={addCheck} disabled={!checkDraft.trim() || busy} className="shrink-0 border border-gray-200 px-3 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Comments */}
          <div className={`${card} overflow-hidden`}>
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-white/10">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                Comments{task.comments?.length ? ` · ${task.comments.length}` : ""}
              </h3>
            </div>
            <div className="space-y-3 bg-gray-50/40 p-4 dark:bg-transparent">
              {(task.comments || []).length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No comments yet.</p>
              ) : (
                task.comments.map((c, i) => (
                  <div key={c._id || i} className="border border-gray-200 bg-white px-3.5 py-2.5 dark:border-white/10 dark:bg-white/5">
                    <div className="mb-1 flex items-center gap-2 text-[11px] text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-white/80">{isMine(c.author) ? "You" : c.author?.name || c.authorName || "Operator"}</span>
                      <span>· {fmtDateTime(c.createdAt)}</span>
                    </div>
                    <div className="prose prose-sm max-w-none break-words text-gray-800 dark:prose-invert [&_a]:text-accent [&_p]:my-0" dangerouslySetInnerHTML={{ __html: sanitizeRichText(c.body) }} />
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-gray-100 p-3 dark:border-white/10">
              <RichTextEditor
                key={`${id}-${commentNonce}`}
                value={comment}
                onChange={setComment}
                mentionItems={staff}
                onMentions={setCommentMentions}
                placeholder="Add a comment… use @ to mention an operator"
              />
              <div className="mt-2 flex justify-end">
                <button type="button" onClick={addComment} disabled={commentEmpty || sending} className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Comment
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Rail */}
        <div className="space-y-4 lg:col-span-1">
          <div className={`${card} divide-y divide-gray-50 p-4 dark:divide-white/5`}>
            <Row label="Assignee">
              <CustomSelect
                value={task.assignee?.userId?._id || task.assignee?.userId || ""}
                onChange={(v) => run(() => superadminService.assignTask(id, v || null), "Couldn't assign that")}
                options={staffOptions}
                searchable
                searchPlaceholder="Search operators…"
                placeholder="Unassigned"
                className="w-full"
                triggerClassName={selectTrigger}
              />
            </Row>
            <Row label="Priority">
              <CustomSelect
                value={task.priority}
                onChange={(v) => patch({ priority: v }, "Couldn't change the priority")}
                options={TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
                className="w-full"
                triggerClassName={selectTrigger}
              />
            </Row>
            <Row label="Type">
              <CustomSelect
                value={task.type}
                onChange={(v) => patch({ type: v }, "Couldn't change the type")}
                options={TASK_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                className="w-full"
                triggerClassName={selectTrigger}
              />
            </Row>
            <Row label="Due"><DueLabel dueAt={task.dueAt} status={task.status} className="justify-end" /></Row>
            <Row label="Created">
              <span className="text-xs text-gray-500 dark:text-white/60">
                {fmtDateTime(task.createdAt)}{task.createdBy?.name ? ` · ${task.createdBy.name}` : ""}
              </span>
            </Row>
            {task.completedAt ? (
              <Row label="Completed"><span className="text-xs text-emerald-600 dark:text-emerald-400">{fmtDateTime(task.completedAt)}</span></Row>
            ) : null}
          </div>

          {/* Tags */}
          <div className={`${card} p-4`}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Tags</h3>
              <button type="button" onClick={() => setAddingTag((v) => !v)} className="text-gray-400 transition-colors hover:text-accent" aria-label="Add a tag">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {addingTag ? (
              <input
                autoFocus
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } if (e.key === "Escape") { setAddingTag(false); setTagDraft(""); } }}
                onBlur={addTag}
                placeholder="Tag name"
                maxLength={40}
                className="mb-2 w-full border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/85"
              />
            ) : null}
            {(task.tags || []).length ? (
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((t) => (
                  <span key={t} className="group inline-flex items-center gap-1 border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                    <TagIcon className="h-3 w-3" />
                    {t}
                    <button type="button" onClick={() => patch({ tags: task.tags.filter((x) => x !== t) }, "Couldn't remove that tag")} className="text-gray-300 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : !addingTag ? (
              <p className="text-xs text-gray-300 dark:text-white/25">None</p>
            ) : null}
          </div>

          {/* Related lead */}
          {lead?._id ? (
            <div className={`${card} p-4`}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Related lead</h3>
              <Link to={`/leads/${lead._id}`} className="group flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent"><Building2 className="h-4 w-4" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-gray-900 group-hover:text-accent dark:text-white">{lead.orgName}</span>
                  <span className="block truncate text-xs text-gray-400">{lead.contactName}</span>
                </span>
              </Link>
              {lead.contactEmail ? (
                <a href={`mailto:${lead.contactEmail}`} className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-accent dark:text-white/60">
                  <Mail className="h-3.5 w-3.5" /> {lead.contactEmail}
                </a>
              ) : null}
            </div>
          ) : null}

          {/* History */}
          <div className={`${card} p-4`}>
            <div className="mb-3 flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-gray-400" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">History</h3>
            </div>
            {events.length ? (
              <ul className="space-y-2.5">
                {events.map((e, i) => <EventLine key={i} e={e} />)}
              </ul>
            ) : (
              <p className="text-xs text-gray-300 dark:text-white/25">Nothing yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
    </MotionConfig>
  );
}
