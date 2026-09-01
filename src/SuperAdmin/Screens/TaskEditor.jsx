import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, MotionConfig } from "framer-motion";
import { toast } from "react-hot-toast";
import { ArrowLeft, Loader2, Save, X, Plus, Tag as TagIcon, Building2, ListChecks, CalendarClock } from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { CustomSelect } from "../../components/CustomSelect";
import { RichTextEditor, sanitizeRichText } from "../../components/RichTextEditor";
import superadminService from "../../services/superadmin.service";
import SAErrorState from "../components/SAErrorState";
import { cn } from "../../utils/cn";
import { card } from "../components/taskShared";
import {
  TASK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  DUE_PRESETS,
  DUE_TONE_CLASS,
  dueMeta,
  toLocalInput,
  fromLocalInput,
} from "../../config/taskOptions";

const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-white/60";
const inputCls =
  "w-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-accent disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white/85";
const selectTrigger = "w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-white/5";

function Field({ label, hint, children, className, required = false }) {
  return (
    <div className={cn("min-w-0", className)}>
      <label className={labelCls}>
        {label}
        {required ? <span className="ml-1 text-accent" aria-hidden>*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
    </div>
  );
}

/**
 * A full-width band of the form.
 *
 * Fields inside flow with `auto-fit`, measured against the SECTION's real width
 * rather than the viewport's — so four selects sit four-across on a wide
 * console, two-across when the sidebar is expanded on a laptop, and one-across
 * on a phone, with no breakpoints to guess at and no empty column left over at
 * any size. Anything that wants the whole row asks for `col-span-full`.
 */
function Section({ title, hint, children, cols = true }) {
  return (
    <section className={`${card} p-5 sm:p-6`}>
      <div className="mb-4 border-b border-gray-100 pb-3 dark:border-white/10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-white/60">{title}</h2>
        {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
      </div>
      <div className={cn(cols && "grid gap-x-5 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]")}>
        {children}
      </div>
    </section>
  );
}

/**
 * Create or edit a task — a page at `/tasks/new` and `/tasks/:id/edit`.
 *
 * A page rather than a dialog, and a route rather than component state: a
 * half-filled form survives a refresh, "add a task for this lead" is a link
 * (`/tasks/new?lead=…`) rather than a button that exists on one screen only,
 * and the browser back button does what it looks like it does.
 */
export default function TaskEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState([]);
  const [leadOptions, setLeadOptions] = useState([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "call",
    priority: "normal",
    status: "todo",
    dueAt: "",
    assigneeUserId: "",
    leadId: search.get("lead") || "",
    tags: [],
    checklist: [],
  });
  // What the record looked like when it loaded, so an edit can send only what
  // actually changed — and so status/assignee only hit their own endpoints
  // when they were genuinely touched.
  const originalRef = useRef(null);
  const [tagDraft, setTagDraft] = useState("");
  const [checkDraft, setCheckDraft] = useState("");

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    superadminService.loadTaskStaff().then(setStaff).catch(() => {});
    superadminService
      .getLeadOptions()
      .then((res) => setLeadOptions(res.data.leads || []))
      .catch(() => {});
  }, []);

  // A task created from a lead's page arrives with ?lead=… — that lead may sit
  // outside the default option list (it could be closed), so it is fetched by
  // name and folded in rather than silently showing as "no lead".
  const prefillLead = search.get("lead");
  useEffect(() => {
    if (!prefillLead || leadOptions.some((l) => String(l._id) === String(prefillLead))) return;
    superadminService
      .loadLead(prefillLead)
      .then((lead) => {
        if (lead?._id) setLeadOptions((prev) => (prev.some((l) => String(l._id) === String(lead._id)) ? prev : [{ _id: lead._id, orgName: lead.orgName, contactName: lead.contactName, stage: lead.stage }, ...prev]));
      })
      .catch(() => {});
  }, [prefillLead, leadOptions]);

  const load = useCallback(async () => {
    if (!isEdit) return;
    try {
      const task = await superadminService.loadTask(id, { force: true });
      const next = {
        title: task.title || "",
        description: task.description || "",
        type: task.type || "call",
        priority: task.priority || "normal",
        status: task.status || "todo",
        dueAt: toLocalInput(task.dueAt),
        assigneeUserId: task.assignee?.userId?._id || task.assignee?.userId || "",
        leadId: task.lead?._id || task.lead || "",
        tags: task.tags || [],
        checklist: [],
      };
      setForm(next);
      originalRef.current = next;
      // The linked lead may be closed and therefore absent from the picker's
      // default list; without this the select would render blank and a plain
      // save would quietly unlink it.
      if (task.lead?._id) {
        setLeadOptions((prev) =>
          prev.some((l) => String(l._id) === String(task.lead._id))
            ? prev
            : [{ _id: task.lead._id, orgName: task.lead.orgName, contactName: task.lead.contactName, stage: task.lead.stage }, ...prev],
        );
      }
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't load this task.");
    } finally {
      setLoading(false);
    }
  }, [id, isEdit]);

  useEffect(() => { load(); }, [load]);

  const addTag = () => {
    const t = tagDraft.trim();
    if (!t) return;
    if (form.tags.includes(t)) { setTagDraft(""); return; }
    if (form.tags.length >= 20) { toast.error("Up to 20 tags"); return; }
    set({ tags: [...form.tags, t] });
    setTagDraft("");
  };
  const addCheck = () => {
    const t = checkDraft.trim();
    if (!t) return;
    if (form.checklist.length >= 50) { toast.error("Up to 50 checklist items"); return; }
    set({ checklist: [...form.checklist, t] });
    setCheckDraft("");
  };

  const titleError = !form.title.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (titleError) { toast.error("Give the task a title"); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: sanitizeRichText(form.description || ""),
        type: form.type,
        priority: form.priority,
        dueAt: fromLocalInput(form.dueAt),
        tags: form.tags,
        leadId: form.leadId || null,
      };

      if (!isEdit) {
        const res = await superadminService.createTask({
          ...payload,
          status: form.status,
          assigneeUserId: form.assigneeUserId || null,
          checklist: form.checklist,
        });
        superadminService.setTaskCache(res.data.task);
        toast.success("Task created");
        navigate(`/tasks/${res.data.task._id}`, { replace: true });
        return;
      }

      const before = originalRef.current || {};
      const res = await superadminService.updateTask(id, payload);
      let task = res.data.task;
      // Status and assignee have their own endpoints because each writes a
      // timeline entry and, for assignment, sends a notification. Firing them
      // unconditionally on every save would stamp "reassigned to Aisha" every
      // time somebody fixed a typo.
      if (form.status !== before.status) {
        task = (await superadminService.changeTaskStatus(id, { status: form.status })).data.task;
      }
      if (String(form.assigneeUserId || "") !== String(before.assigneeUserId || "")) {
        task = (await superadminService.assignTask(id, form.assigneeUserId || null)).data.task;
      }
      superadminService.setTaskCache(task);
      toast.success("Task saved");
      navigate(`/tasks/${id}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't save that task");
    } finally {
      setSaving(false);
    }
  };

  const staffOptions = useMemo(
    () => [{ value: "", label: "Unassigned" }, ...staff.map((s) => ({ value: s._id, label: s.name || s.email }))],
    [staff],
  );
  const leadSelectOptions = useMemo(
    () => [
      { value: "", label: "No lead — standalone task" },
      ...leadOptions.map((l) => ({ value: l._id, label: `${l.orgName}${l.contactName ? ` · ${l.contactName}` : ""}` })),
    ],
    [leadOptions],
  );

  const relatedLead = useMemo(
    () => leadOptions.find((l) => String(l._id) === String(form.leadId)) || null,
    [leadOptions, form.leadId],
  );

  // What the chosen date will actually SAY on the board and in the list. A
  // datetime input tells you the timestamp; this tells you it reads as
  // "Overdue by 2 days", which is the thing that is easy to get wrong.
  const duePreview = useMemo(() => dueMeta(fromLocalInput(form.dueAt), form.status), [form.dueAt, form.status]);

  const back = () => navigate(isEdit ? `/tasks/${id}` : "/tasks");

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><TabLoader label="Loading task…" /></div>;
  }
  if (error) return <SAErrorState message={error} onRetry={load} />;

  return (
    <MotionConfig reducedMotion="user">
    <div className="[&_*]:!rounded-none">
      <button type="button" onClick={back} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-accent">
        <ArrowLeft className="h-4 w-4" /> {isEdit ? "Back to task" : "Back to tasks"}
      </button>

      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {/* Record header. Flat, not one of the gradient hero bands — those
            announce a SECTION of the console, and this announces one record. */}
        <div className={`${card} mb-4 flex flex-wrap items-center justify-between gap-4 p-5`}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent"><ListChecks className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">{isEdit ? "Edit task" : "New task"}</h1>
              <p className="text-sm text-gray-500 dark:text-white/60">
                {isEdit ? "Change what this task is and when it’s owed." : "Something the team owes — on a lead, or standing alone."}
              </p>
            </div>
          </div>
          {form.leadId && relatedLead ? (
            <Link to={`/leads/${form.leadId}`} className="inline-flex shrink-0 items-center gap-1.5 border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-accent hover:text-accent dark:border-white/10 dark:text-white/70">
              <Building2 className="h-3.5 w-3.5" /> {relatedLead.orgName}
            </Link>
          ) : null}
        </div>

        {/* Full-bleed sections. Each spreads its fields with auto-fit, so the
            row fills whatever width the console gives it and reflows to one
            column on a narrow screen — no breakpoint guesses, and no dead
            column at any size, which is what the old fixed 2/3 + 1/3 grid left
            behind once the short side ran out of content. */}
        <div className="space-y-4">
          <Section title="The task" hint="What needs doing, in the words the person doing it will read.">
            <Field label="Title" required className="col-span-full">
              <input
                autoFocus
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Call Riverbank Care back about pricing"
                maxLength={200}
                className={cn(inputCls, titleError && form.title !== "" && "border-red-300")}
              />
            </Field>
            <div className="col-span-full">
              <label className={labelCls}>Details</label>
              <RichTextEditor
                value={form.description}
                onChange={(v) => set({ description: v })}
                placeholder="Anything the next person picking this up would need to know…"
              />
            </div>
          </Section>

          <Section title="Classification" hint="How it shows up on the board and in the list.">
            <Field label="Type">
              <CustomSelect value={form.type} onChange={(v) => set({ type: v })} options={TASK_TYPES.map((t) => ({ value: t.value, label: t.label }))} className="w-full" triggerClassName={selectTrigger} />
            </Field>
            <Field label="Priority">
              <CustomSelect value={form.priority} onChange={(v) => set({ priority: v })} options={TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))} className="w-full" triggerClassName={selectTrigger} />
            </Field>
            <Field label="Status">
              <CustomSelect value={form.status} onChange={(v) => set({ status: v })} options={TASK_STATUSES.map((s) => ({ value: s.value, label: s.label }))} className="w-full" triggerClassName={selectTrigger} />
            </Field>
            <Field label="Assignee" hint={isEdit ? "Changing this emails them." : "They’ll be emailed when you save."}>
              <CustomSelect value={form.assigneeUserId} onChange={(v) => set({ assigneeUserId: v })} options={staffOptions} searchable searchPlaceholder="Search operators…" className="w-full" triggerClassName={selectTrigger} />
            </Field>
          </Section>

          <Section title="Schedule" hint="A task with no due date never appears on anyone's day.">
            <Field label="Due">
              <input type="datetime-local" value={form.dueAt} onChange={(e) => set({ dueAt: e.target.value })} className={inputCls} />
            </Field>
            {/* The presets sit in their own grid cell beside the input, so on a
                wide row they read as alternatives to typing a date and on a
                narrow one they drop underneath it. */}
            <div className="flex flex-wrap items-center gap-1.5 self-end pb-0.5">
              {DUE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => set({ dueAt: toLocalInput(p.get()) })}
                  className="border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 transition-colors hover:border-accent hover:text-accent dark:border-white/10 dark:text-white/60"
                >
                  {p.label}
                </button>
              ))}
              {form.dueAt ? (
                <button type="button" onClick={() => set({ dueAt: "" })} className="border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-gray-400 transition-colors hover:border-red-300 hover:text-red-500 dark:border-white/10">
                  Clear
                </button>
              ) : null}
            </div>
            {form.dueAt ? (
              <div className="col-span-full">
                <p className={cn("inline-flex items-center gap-1.5 text-xs", DUE_TONE_CLASS[duePreview.tone])}>
                  <CalendarClock className="h-3.5 w-3.5" /> Reads as “{duePreview.text}”
                </p>
              </div>
            ) : null}
          </Section>

          <Section title="Context" hint="Optional — a task can stand on its own.">
            <Field label="Related lead">
              <CustomSelect
                value={form.leadId}
                onChange={(v) => set({ leadId: v })}
                options={leadSelectOptions}
                searchable
                searchPlaceholder="Search leads…"
                icon={Building2}
                className="w-full"
                triggerClassName={selectTrigger}
              />
            </Field>
            <Field label="Tags">
              <div className="flex gap-2">
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                  placeholder="Add a tag and press Enter"
                  maxLength={40}
                  className={inputCls}
                />
                <button type="button" onClick={addTag} className="shrink-0 border border-gray-200 px-3 text-gray-500 transition-colors hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </Field>
            {form.tags.length ? (
              <div className="col-span-full flex flex-wrap gap-1.5">
                {form.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                    <TagIcon className="h-3 w-3" />
                    {t}
                    <button type="button" onClick={() => set({ tags: form.tags.filter((x) => x !== t) })} className="text-gray-300 transition-colors hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </Section>

          {/* Checklist — creation only. Once a task exists its steps are ticked
              individually on the task page, which is a different action from
              editing the task, and each tick writes its own timeline entry. */}
          {!isEdit ? (
            <Section title="Checklist" hint="Optional. Break the task into steps you can tick off." cols={false}>
              <div className="flex gap-2">
                <input
                  value={checkDraft}
                  onChange={(e) => setCheckDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCheck(); } }}
                  placeholder="Add a step and press Enter"
                  maxLength={200}
                  className={inputCls}
                />
                <button type="button" onClick={addCheck} className="shrink-0 border border-gray-200 px-3 text-gray-500 transition-colors hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {form.checklist.length ? (
                <ul className="mt-3 grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                  {form.checklist.map((c, i) => (
                    <li key={`${c}-${i}`} className="flex items-center justify-between gap-2 border border-gray-100 bg-gray-50/60 px-3 py-2 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80">
                      <span className="min-w-0 break-words">{c}</span>
                      <button type="button" onClick={() => set({ checklist: form.checklist.filter((_, j) => j !== i) })} className="shrink-0 text-gray-300 transition-colors hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Section>
          ) : null}
        </div>

        {/* Sticky action bar.
            Bottom rather than top: the console's topbar is `fixed`, so a
            top-stuck bar has to know its height to sit under it, and a form
            this tall would put Save off-screen the moment you started filling
            it in. Bled to the content edges with negative margins that match
            the layout's own padding (px-4 / lg:px-6). */}
        <div className="sticky bottom-0 z-20 -mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 lg:-mx-6 lg:px-6 dark:border-white/10" style={{ backgroundColor: "var(--tenant-bg)" }}>
          <p className="min-w-0 text-xs text-gray-400">
            {titleError ? "A title is required." : isEdit ? "Changes apply as soon as you save." : "You can edit everything afterwards."}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={back}
              disabled={saving}
              className="border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || titleError}
              className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? "Save changes" : "Create task"}
            </button>
          </div>
        </div>
      </motion.form>
    </div>
    </MotionConfig>
  );
}
