import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  X,
  Plus,
  Check,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Loader2,
  Sparkles,
  ListPlus,
} from "lucide-react";
import Portal from "../../components/Portal";
import { CustomSelect } from "../../components/CustomSelect";
import { cn } from "../../utils/cn";
import { QUESTION_TYPES } from "./Events/eventConstants";
import joinTeamService from "../../services/joinTeam.service";

const labelCls = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500";
const boxInput =
  "w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-accent";

// Volunteer-flavoured quick-add questions.
const TEMPLATES = [
  { label: "Why do you want to volunteer?", type: "textarea", required: false, options: [] },
  { label: "Relevant skills or experience", type: "textarea", required: false, options: [] },
  { label: "Do you have a driver's licence?", type: "select", required: false, options: ["Yes", "No"] },
  { label: "Languages spoken", type: "text", required: false, options: [] },
  { label: "T-shirt size", type: "select", required: false, options: ["XS", "S", "M", "L", "XL", "XXL"] },
  { label: "Emergency contact (name & phone)", type: "text", required: false, options: [] },
  { label: "How did you hear about us?", type: "select", required: false, options: ["Social media", "Friend or family", "Email", "Our website", "Other"] },
  { label: "Areas of interest", type: "checkbox", required: false, options: ["Events", "Fundraising", "Admin", "Outreach", "Logistics"] },
];

function OptionsEditor({ options, onChange }) {
  const set = (i, val) => onChange(options.map((o, idx) => (idx === i ? val : o)));
  const add = () => onChange([...options, ""]);
  const remove = (i) => onChange(options.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-1.5">
      {options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={o}
            onChange={(e) => set(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className={cn(boxInput, "flex-1")}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="grid h-8 w-8 shrink-0 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
        <Plus className="h-3.5 w-3.5" /> Add option
      </button>
    </div>
  );
}

function QuestionBuilder({ questions, setQuestions }) {
  const update = (i, patch) => setQuestions(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const remove = (i) => setQuestions(questions.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    const next = [...questions];
    [next[i], next[j]] = [next[j], next[i]];
    setQuestions(next);
  };
  const add = () => setQuestions([...questions, { label: "", type: "text", required: false, options: [], help: "" }]);

  const norm = (s) => String(s || "").trim().toLowerCase();
  const exists = (label) => questions.some((q) => norm(q.label) === norm(label));
  const addTemplate = (t) => {
    if (exists(t.label)) return toast("Already added", { icon: "✓" });
    setQuestions([...questions, { label: t.label, type: t.type, required: !!t.required, options: [...(t.options || [])], help: "" }]);
  };

  return (
    <div className="space-y-3">
      {/* Templates */}
      <div className="border border-gray-100 bg-gray-50/60 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
          <Sparkles className="h-3.5 w-3.5 text-accent" /> Quick add
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((t) => {
            const added = exists(t.label);
            return (
              <button
                key={t.label}
                type="button"
                onClick={() => addTemplate(t)}
                disabled={added}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  added
                    ? "cursor-default border-gray-100 bg-gray-50 text-gray-300"
                    : "border-gray-200 bg-white text-gray-600 hover:border-accent/40 hover:text-accent",
                )}
              >
                {added ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />} {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {questions.length === 0 && (
        <p className="border border-dashed border-gray-200 bg-white px-3 py-4 text-center text-xs text-text-muted">
          No custom questions yet. Name, email, phone, age, gender, address, skills & availability are always collected.
        </p>
      )}

      {questions.map((q, i) => {
        const hasOptions = q.type === "select" || q.type === "checkbox";
        return (
          <div key={i} className="border border-gray-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                <GripVertical className="h-3.5 w-3.5" /> Question {i + 1}
              </span>
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="grid h-7 w-7 place-items-center text-gray-400 transition-colors hover:bg-gray-100 disabled:opacity-30" title="Move up">
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === questions.length - 1} className="grid h-7 w-7 place-items-center text-gray-400 transition-colors hover:bg-gray-100 disabled:opacity-30" title="Move down">
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => remove(i)} className="grid h-7 w-7 place-items-center text-red-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Question</label>
                <input type="text" value={q.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="e.g. Languages spoken" className={boxInput} />
              </div>
              <div>
                <label className={labelCls}>Answer type</label>
                <CustomSelect value={q.type} onChange={(v) => update(i, { type: v })} options={QUESTION_TYPES} triggerClassName={boxInput} className="w-full" />
              </div>
              <div className="flex items-end pb-2.5">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary">
                  <input type="checkbox" checked={q.required} onChange={(e) => update(i, { required: e.target.checked })} className="h-3.5 w-3.5 rounded border-gray-300 text-accent focus:ring-accent/30" />
                  Required
                </label>
              </div>
              {hasOptions && (
                <div className="sm:col-span-2">
                  <label className={labelCls}>Options</label>
                  <OptionsEditor options={q.options || []} onChange={(opts) => update(i, { options: opts })} />
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
        <Plus className="h-4 w-4" /> Add question
      </button>
    </div>
  );
}

export default function VolunteerFormBuilder({ open, onClose, onSaved }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    joinTeamService
      .getForm()
      .then((qs) => setQuestions(qs || []))
      .catch(() => toast.error("Could not load the form"))
      .finally(() => setLoading(false));
  }, [open]);

  const save = async () => {
    // Light client-side guard: options-type questions need at least one option.
    const bad = questions.find(
      (q) => (q.type === "select" || q.type === "checkbox") && !(q.options || []).filter((o) => String(o).trim()).length,
    );
    if (bad) return toast.error(`"${bad.label || "A question"}" needs at least one option`);
    if (questions.some((q) => !String(q.label || "").trim()))
      return toast.error("Every question needs a label");

    setSaving(true);
    try {
      const saved = await joinTeamService.saveForm(questions);
      toast.success("Volunteer form updated");
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !saving && onClose?.()} />
            <motion.div
              className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border border-gray-100 bg-white shadow-2xl"
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <ListPlus className="h-5 w-5 text-accent" />
                  <div>
                    <h3 className="text-base font-semibold text-primary">Customize application form</h3>
                    <p className="text-xs text-text-muted">Extra questions asked on your public volunteer form.</p>
                  </div>
                </div>
                <button onClick={() => onClose?.()} className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex h-40 items-center justify-center text-text-muted">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <QuestionBuilder questions={questions} setQuestions={setQuestions} />
                )}
              </div>

              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                <button
                  type="button"
                  onClick={() => onClose?.()}
                  disabled={saving}
                  className="border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || loading}
                  className="inline-flex items-center gap-2 bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save form
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
