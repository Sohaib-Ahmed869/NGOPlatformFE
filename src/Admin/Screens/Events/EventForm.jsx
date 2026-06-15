import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "../../../components/Portal";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  X,
  FileText,
  CalendarDays,
  Ticket,
  Settings2,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Star,
  Upload,
  Check,
  Layers,
  Sparkles,
  LayoutTemplate,
  Utensils,
  Footprints,
  Moon,
  HandHeart,
  Presentation,
  Users,
  Stethoscope,
  FilePlus2,
  Trophy,
  Package,
  Droplet,
  GraduationCap,
  Gavel,
  Gift,
} from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "../phone-input.css";
import eventsService from "../../../services/events.service";
import settingsService from "../../../services/settings.service";
import { TabLoader } from "../../../components/TabLoader";
import { CustomSelect } from "../../../components/CustomSelect";
import { cn } from "../../../utils/cn";
import {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  STATUS_OPTIONS,
  REGISTRATION_MODES,
  QUESTION_TYPES,
  QUESTION_TEMPLATES,
  QUESTION_PACKS,
  EVENT_TEMPLATES,
  DEFAULT_TIMEZONE,
  timezoneOptionsWith,
} from "./eventConstants";

// Icon per event template.
const TEMPLATE_ICONS = {
  gala: Utensils,
  run: Footprints,
  iftar: Moon,
  drive: HandHeart,
  seminar: Presentation,
  volunteer: Users,
  camp: Stethoscope,
  cricket: Trophy,
  ration: Package,
  blood: Droplet,
  school: GraduationCap,
  auction: Gavel,
  eid: Gift,
};

// A single event-template card in the picker.
function TemplateCard({ tpl, onPick }) {
  const Icon = TEMPLATE_ICONS[tpl.icon] || FileText;
  const typeLabel = EVENT_TYPE_LABELS[tpl.defaults.eventType] || tpl.defaults.eventType;
  const modeLabel = REGISTRATION_MODES.find((m) => m.value === tpl.defaults.registrationMode)?.label || "—";
  const qCount = tpl.questions?.length || 0;
  return (
    <button
      type="button"
      onClick={() => onPick(tpl)}
      className="group flex h-full flex-col items-start gap-3 border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-white">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-primary">{tpl.name}</h3>
        <p className="mt-1 text-xs leading-snug text-text-muted">{tpl.tagline}</p>
      </div>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">{typeLabel}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">{modeLabel}</span>
        {qCount > 0 && (
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
            {qCount} question{qCount > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </button>
  );
}

const ACCENT_GRADIENT = "linear-gradient(135deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))";
const labelCls = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500";
const boxInput =
  "w-full border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20";

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const toDateTimeInput = (d) => (d ? new Date(d).toISOString().slice(0, 16) : "");

const TABS = [
  { id: "details", label: "Details", desc: "Name, type & cover", icon: FileText },
  { id: "schedule", label: "Schedule & place", desc: "When & where", icon: CalendarDays },
  { id: "registration", label: "Registration", desc: "RSVPs & questions", icon: Ticket },
  { id: "extras", label: "Contact & options", desc: "Contact, featured, paid", icon: Settings2 },
];

/* ── shared field pieces (match Branding / Settings) ── */
function SectionHead({ icon: Icon, title, desc }) {
  return (
    <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <p className="mt-0.5 text-sm text-text-muted">{desc}</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required, hint }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      <div className="flex items-center gap-2.5 border-b border-gray-200 transition-colors focus-within:border-accent">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-transparent py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400"
        />
      </div>
      {hint ? <p className="mt-1.5 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

function SelectField({ label, value, onChange, options, required, hint, searchable, searchPlaceholder }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      <CustomSelect
        value={value}
        onChange={onChange}
        options={options}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        triggerClassName="w-full border-b border-gray-200 bg-transparent py-2.5 text-sm text-gray-800 outline-none focus:border-accent"
        className="w-full"
      />
      {hint ? <p className="mt-1.5 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

function Switch({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer select-none items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={cn("relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", checked ? "bg-accent" : "bg-gray-300")}
      >
        <span className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform" style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }} />
      </button>
      <span>
        <span className="block text-sm font-medium text-primary">{label}</span>
        {hint ? <span className="block text-xs text-text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/* ── per-option editor for dropdown / checkbox answers ── */
function OptionsEditor({ options, onChange }) {
  const rows = options.length ? options : [""];
  const refs = useRef([]);
  const pendingFocus = useRef(null);

  useEffect(() => {
    if (pendingFocus.current != null) {
      refs.current[pendingFocus.current]?.focus();
      pendingFocus.current = null;
    }
  });

  const setAt = (idx, val) => onChange(rows.map((o, i) => (i === idx ? val : o)));
  const removeAt = (idx) => onChange(rows.filter((_, i) => i !== idx));
  const add = () => { pendingFocus.current = rows.length; onChange([...rows, ""]); };
  const insertAfter = (idx) => { pendingFocus.current = idx + 1; const n = [...rows]; n.splice(idx + 1, 0, ""); onChange(n); };

  return (
    <div className="space-y-2">
      {rows.map((opt, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="grid h-8 w-7 shrink-0 place-items-center rounded-lg bg-gray-100 text-[11px] font-semibold text-gray-400">{idx + 1}</span>
          <input
            ref={(el) => (refs.current[idx] = el)}
            value={opt}
            onChange={(e) => setAt(idx, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); insertAfter(idx); }
              else if (e.key === "Backspace" && opt === "" && rows.length > 1) { e.preventDefault(); pendingFocus.current = Math.max(0, idx - 1); removeAt(idx); }
            }}
            placeholder={`Option ${idx + 1}`}
            className={cn(boxInput, "flex-1")}
          />
          <button
            type="button"
            onClick={() => removeAt(idx)}
            disabled={rows.length === 1}
            title="Remove option"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
        <Plus className="h-3.5 w-3.5" /> Add option
      </button>
    </div>
  );
}

/* ── dynamic registration question builder ── */
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

  // ── Templates (prefill) ──
  const norm = (s) => String(s || "").trim().toLowerCase();
  const exists = (label) => questions.some((q) => norm(q.label) === norm(label));
  const toQuestion = (t) => ({
    label: t.label,
    type: t.type,
    required: !!t.required,
    options: Array.isArray(t.options) ? [...t.options] : [],
    help: t.help || "",
  });
  const addTemplate = (t) => {
    if (exists(t.label)) return toast("Already added", { icon: "✓" });
    setQuestions([...questions, toQuestion(t)]);
  };
  const addPack = (p) => {
    const fresh = p.questions.filter((q) => !exists(q.label)).map(toQuestion);
    if (!fresh.length) return toast("Those questions are already added", { icon: "✓" });
    setQuestions([...questions, ...fresh]);
    toast.success(`Added ${fresh.length} question${fresh.length > 1 ? "s" : ""}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-primary">Registration questions</h4>
        <span className="text-[11px] text-text-muted">Optional — asked when someone registers</span>
      </div>

      {/* Templates / prefill */}
      <div className="border border-gray-100 bg-white p-3">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
          <Sparkles className="h-3.5 w-3.5 text-accent" /> Start from a template
        </p>
        {/* Starter packs */}
        <div className="mb-2.5 flex flex-wrap gap-2">
          {QUESTION_PACKS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => addPack(p)}
              title={p.description}
              className="inline-flex items-center gap-1.5 border border-accent/30 bg-accent/5 px-2.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
            >
              <Layers className="h-3.5 w-3.5" /> {p.label}
            </button>
          ))}
        </div>
        {/* Individual questions */}
        <div className="flex flex-wrap gap-1.5">
          {QUESTION_TEMPLATES.map((t) => {
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
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:border-accent/40 hover:text-accent"
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
          No custom questions yet. Name, email & phone are always collected.
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
                <input type="text" value={q.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="e.g. T-shirt size" className={boxInput} />
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

const blankForm = {
  title: "", description: "", eventType: "fundraiser", eventTypeOther: "", audience: "", status: "upcoming",
  date: "", endDate: "", startTime: "", endTime: "", timezone: DEFAULT_TIMEZONE,
  location: { city: "", venue: "", address: "" },
  registrationMode: "none", registrationLink: "", capacity: "", registrationDeadline: "",
  isRegistrationOpen: true, allowGuests: false, maxGuestsPerRegistration: 1,
  isPaid: false, price: "", currency: "AUD", contactEmail: "", contactPhone: "", featured: false,
};

const toForm = (e) =>
  !e
    ? blankForm
    : {
        title: e.title || "", description: e.description || "", eventType: e.eventType || "fundraiser",
        eventTypeOther: e.eventTypeOther || "", audience: e.audience || "", status: e.status || "upcoming",
        date: toDateInput(e.date), endDate: toDateInput(e.endDate),
        startTime: e.startTime || "", endTime: e.endTime || "", timezone: e.timezone || DEFAULT_TIMEZONE,
        location: { city: e.location?.city || "", venue: e.location?.venue || "", address: e.location?.address || "" },
        registrationMode: e.registrationMode || "none", registrationLink: e.registrationLink || "",
        capacity: e.capacity != null ? String(e.capacity) : "",
        registrationDeadline: toDateTimeInput(e.registrationDeadline),
        isRegistrationOpen: e.isRegistrationOpen !== false, allowGuests: !!e.allowGuests,
        maxGuestsPerRegistration: e.maxGuestsPerRegistration || 1,
        isPaid: !!e.isPaid, price: e.price ? String(e.price) : "", currency: e.currency || "AUD",
        contactEmail: e.contactEmail || "", contactPhone: e.contactPhone || "", featured: !!e.featured,
      };

export default function EventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = Boolean(id);
  const fileRef = useRef(null);

  const preset = isEdit ? location.state?.event : null;
  const [form, setForm] = useState(() => toForm(preset));
  const [questions, setQuestions] = useState(() => preset?.registrationQuestions || []);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(preset?.imageUrl || "");
  const [loading, setLoading] = useState(isEdit && !preset);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [drag, setDrag] = useState(false);
  // New events open on the template picker first; edits skip it.
  const [showTemplates, setShowTemplates] = useState(!isEdit);
  // Audience options come from Organisation Settings → Events (per-tenant).
  const [audiences, setAudiences] = useState(() => settingsService.getCached()?.eventAudiences || []);

  useEffect(() => {
    if (isEdit && !preset) fetchEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    settingsService
      .getSettings()
      .then((d) => setAudiences(d?.eventAudiences || []))
      .catch(() => {});
  }, []);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const ev = await eventsService.getById(id);
      setForm(toForm(ev));
      setQuestions(ev.registrationQuestions || []);
      setImagePreview(ev.imageUrl || "");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load event");
      navigate("/admin/events");
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const setLoc = (k, v) => setForm((prev) => ({ ...prev, location: { ...prev.location, [k]: v } }));

  // Prefill the form from an event template, then drop into the editor.
  const applyTemplate = (tpl) => {
    setForm((prev) => ({ ...prev, ...tpl.defaults }));
    setQuestions(
      (tpl.questions || []).map((q) => ({
        label: q.label,
        type: q.type,
        required: !!q.required,
        options: Array.isArray(q.options) ? [...q.options] : [],
        help: q.help || "",
      }))
    );
    setActiveTab("details");
    setShowTemplates(false);
    toast.success(`Started from “${tpl.name}”`);
  };
  const startBlank = () => setShowTemplates(false);

  const pickImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  // Returns { error, tab } so we can jump to the tab that needs attention.
  const validate = () => {
    if (!form.title.trim()) return { error: "Event title is required", tab: "details" };
    if (form.eventType === "other" && !form.eventTypeOther.trim()) return { error: "Please specify the event type", tab: "details" };
    if (!form.date) return { error: "Event start date is required", tab: "schedule" };
    if (!form.startTime || !form.endTime) return { error: "Start and end time are required", tab: "schedule" };
    if (!form.timezone.trim()) return { error: "Timezone is required", tab: "schedule" };
    if (form.registrationMode === "external" && !form.registrationLink.trim()) return { error: "Add the external registration link", tab: "registration" };
    if (form.registrationMode === "internal") {
      for (const q of questions) {
        if (!q.label.trim()) return { error: "Every registration question needs a label", tab: "registration" };
        if ((q.type === "select" || q.type === "checkbox") && !(q.options || []).some((o) => o.trim()))
          return { error: `Add at least one option for "${q.label}"`, tab: "registration" };
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setActiveTab(err.tab);
      return toast.error(err.error);
    }

    const cleanedQuestions =
      form.registrationMode === "internal"
        ? questions
            .filter((q) => q.label.trim())
            .map((q) => ({
              ...(q.key ? { key: q.key } : {}),
              label: q.label.trim(),
              type: q.type,
              required: !!q.required,
              options: q.type === "select" || q.type === "checkbox" ? (q.options || []).map((o) => o.trim()).filter(Boolean) : [],
              help: q.help || "",
            }))
        : [];

    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("description", form.description);
    fd.append("eventType", form.eventType);
    fd.append("eventTypeOther", form.eventType === "other" ? form.eventTypeOther : "");
    fd.append("audience", form.audience || "");
    fd.append("status", form.status);
    fd.append("date", form.date);
    fd.append("endDate", form.endDate || "");
    fd.append("startTime", form.startTime);
    fd.append("endTime", form.endTime);
    fd.append("timezone", form.timezone);
    fd.append("location", JSON.stringify(form.location));
    fd.append("registrationMode", form.registrationMode);
    fd.append("registrationLink", form.registrationMode === "external" ? form.registrationLink : "");
    fd.append("requiresRegistration", String(form.registrationMode === "internal"));
    fd.append("capacity", form.registrationMode === "internal" ? form.capacity : "");
    fd.append("registrationDeadline", form.registrationMode === "internal" ? form.registrationDeadline || "" : "");
    fd.append("isRegistrationOpen", String(form.isRegistrationOpen));
    fd.append("allowGuests", String(form.allowGuests));
    fd.append("maxGuestsPerRegistration", form.allowGuests ? form.maxGuestsPerRegistration : 0);
    fd.append("registrationQuestions", JSON.stringify(cleanedQuestions));
    fd.append("isPaid", String(form.isPaid));
    fd.append("price", form.isPaid ? form.price || 0 : 0);
    fd.append("currency", form.currency);
    fd.append("contactEmail", form.contactEmail);
    fd.append("contactPhone", form.contactPhone);
    fd.append("featured", String(form.featured));
    if (imageFile) fd.append("image", imageFile);

    setSaving(true);
    try {
      if (isEdit) {
        await eventsService.update(id, fd);
        toast.success("Event updated");
      } else {
        await eventsService.create(fd);
        toast.success("Event created");
      }
      navigate("/admin/events");
    } catch (e2) {
      toast.error(e2.response?.data?.message || "Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await eventsService.remove(id);
      toast.success("Event deleted");
      navigate("/admin/events");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete event");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading event…" />
      </div>
    );
  }

  // ── Template picker (new events only) ──
  if (showTemplates) {
    return (
      <div className="w-full space-y-6 pb-10">
        <div>
          <Link to="/admin/events" className="mb-3 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to events
          </Link>
          <h1 className="text-2xl font-bold text-primary">Create an event</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Start from a ready-made template — we'll prefill the type, a description and the registration questions — or build it yourself.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EVENT_TEMPLATES.map((tpl) => (
            <TemplateCard key={tpl.id} tpl={tpl} onPick={applyTemplate} />
          ))}

          {/* Start from scratch */}
          <button
            type="button"
            onClick={startBlank}
            className="group flex h-full flex-col items-start gap-3 border-2 border-dashed border-gray-200 bg-gray-50/50 p-5 text-left transition-colors hover:border-accent/40 hover:bg-white"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-gray-400 ring-1 ring-gray-100 transition-colors group-hover:text-accent">
              <FilePlus2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-primary">Start from scratch</h3>
              <p className="mt-1 text-xs leading-snug text-text-muted">A blank event you fill in yourself.</p>
            </div>
            <span className="mt-auto pt-1 text-[11px] font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">Create blank →</span>
          </button>
        </div>
      </div>
    );
  }

  const internal = form.registrationMode === "internal";
  const external = form.registrationMode === "external";

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to="/admin/events" className="mb-2 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to events
          </Link>
          <h1 className="truncate text-2xl font-bold text-primary">{isEdit ? "Edit event" : "New event"}</h1>
          <p className="mt-1 text-sm text-text-muted">Fill in each section — your changes save when you click Save.</p>
        </div>
        {isEdit ? (
          <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex items-center gap-1.5 border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        ) : (
          <button type="button" onClick={() => setShowTemplates(true)} className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-50">
            <LayoutTemplate className="h-4 w-4" /> Templates
          </button>
        )}
      </div>

      {/* Two-column: tab rail + content */}
      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Tab rail */}
        <nav className="overflow-hidden border border-gray-100 bg-white shadow-sm lg:sticky lg:top-24">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={cn("relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors", active ? "text-white" : "text-gray-600 hover:bg-gray-50")}
              >
                {active ? (
                  <motion.span layoutId="eventTabActive" className="absolute inset-0 z-0" style={{ background: ACCENT_GRADIENT }} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
                    <span className="absolute inset-y-0 left-0 w-1 bg-accent" />
                  </motion.span>
                ) : null}
                <Icon className={cn("relative z-[1] h-[18px] w-[18px] shrink-0 transition-colors duration-300", active ? "text-white" : "text-gray-400")} />
                <span className="relative z-[1] min-w-0 flex-1">
                  <span className={cn("block text-sm font-semibold leading-tight transition-colors duration-300", active ? "text-white" : "text-gray-700")}>{t.label}</span>
                  <span className={cn("block text-[11px] leading-tight transition-colors duration-300", active ? "text-white/70" : "text-gray-400")}>{t.desc}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22, ease: "easeOut" }}>
              {/* ── DETAILS ── */}
              {activeTab === "details" && (
                <>
                  <SectionHead icon={FileText} title="Event details" desc="The name, type and cover image people see first." />
                  <div className="space-y-6">
                    {/* Cover image */}
                    <div>
                      <label className={labelCls}>Cover image</label>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => fileRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                        onDragLeave={() => setDrag(false)}
                        onDrop={(e) => { e.preventDefault(); setDrag(false); pickImage(e.dataTransfer.files?.[0]); }}
                        className={cn(
                          "group relative flex h-40 cursor-pointer items-center justify-center overflow-hidden border-2 border-dashed transition-all",
                          drag ? "border-accent bg-accent/5" : "border-gray-200 bg-gray-50 hover:border-accent/60 hover:bg-gray-100/60"
                        )}
                      >
                        {imagePreview ? (
                          <>
                            <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setImagePreview(""); setImageFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-gray-600 shadow hover:bg-white"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                              <Upload className="h-4 w-4" /> <span className="text-xs font-medium">Replace</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 px-4 text-center">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-accent shadow-sm ring-1 ring-gray-100">
                              <Upload className="h-4 w-4" />
                            </div>
                            <p className="text-xs font-medium text-primary">Click or drag &amp; drop</p>
                            <p className="text-[11px] text-text-muted">Optional · PNG/JPG up to 5MB</p>
                          </div>
                        )}
                      </div>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pickImage(e.target.files?.[0]); if (fileRef.current) fileRef.current.value = ""; }} />
                    </div>

                    <Field label="Title" required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Annual Gala Dinner" />

                    <div className="grid gap-5 sm:grid-cols-2">
                      <SelectField label="Type" value={form.eventType} onChange={(v) => set("eventType", v)} options={EVENT_TYPES} />
                      <SelectField label="Status" value={form.status} onChange={(v) => set("status", v)} options={STATUS_OPTIONS} />
                    </div>

                    {form.eventType === "other" && (
                      <Field label="Specify type" required value={form.eventTypeOther} onChange={(e) => set("eventTypeOther", e.target.value)} placeholder="e.g. Open Day" />
                    )}

                    {audiences.length > 0 ? (
                      <SelectField
                        label="Audience"
                        value={form.audience}
                        onChange={(v) => set("audience", v)}
                        options={[{ value: "", label: "No specific audience" }, ...audiences.map((a) => ({ value: a.key, label: a.label }))]}
                        hint="Colour-codes this event on the public events calendar."
                      />
                    ) : (
                      <p className="text-xs text-text-muted">
                        Tip: define audience segments (e.g. Brothers, Sisters, Open to all) in{" "}
                        <Link to="/admin/settings?tab=events" className="font-medium text-accent hover:underline">Settings → Events</Link>{" "}
                        to colour-code events on the public calendar.
                      </p>
                    )}

                    <div>
                      <label className={labelCls}>Description</label>
                      <textarea
                        rows={5}
                        value={form.description}
                        onChange={(e) => set("description", e.target.value)}
                        placeholder="Tell people what the event is about…"
                        className="w-full resize-none border-b border-gray-200 bg-transparent py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ── SCHEDULE & PLACE ── */}
              {activeTab === "schedule" && (
                <>
                  <SectionHead icon={CalendarDays} title="Schedule & location" desc="When it runs and where it takes place." />
                  <div className="space-y-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Start date" required type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
                      <Field label="End date" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} hint="Only for multi-day events." />
                      <Field label="Start time" required type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
                      <Field label="End time" required type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
                      <SelectField
                        label="Timezone"
                        required
                        value={form.timezone}
                        onChange={(v) => set("timezone", v)}
                        options={timezoneOptionsWith(form.timezone)}
                        searchable
                        searchPlaceholder="Search timezones…"
                      />
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="City" value={form.location.city} onChange={(e) => setLoc("city", e.target.value)} />
                        <Field label="Venue" value={form.location.venue} onChange={(e) => setLoc("venue", e.target.value)} />
                        <div className="sm:col-span-2">
                          <Field label="Address" value={form.location.address} onChange={(e) => setLoc("address", e.target.value)} placeholder="Street address" />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── REGISTRATION ── */}
              {activeTab === "registration" && (
                <>
                  <SectionHead icon={Ticket} title="Registration" desc="Choose how people sign up for this event." />
                  <div className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {REGISTRATION_MODES.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => set("registrationMode", m.value)}
                          className={cn("border p-3.5 text-left transition-colors", form.registrationMode === m.value ? "border-accent bg-accent/5 ring-1 ring-accent/30" : "border-gray-200 hover:border-gray-300")}
                        >
                          <span className={cn("block text-sm font-semibold", form.registrationMode === m.value ? "text-accent" : "text-primary")}>{m.label}</span>
                          <span className="mt-1 block text-[11px] leading-snug text-text-muted">{m.hint}</span>
                        </button>
                      ))}
                    </div>

                    {external && (
                      <Field label="Registration link" required type="url" value={form.registrationLink} onChange={(e) => set("registrationLink", e.target.value)} placeholder="https://…" />
                    )}

                    {internal && (
                      <div className="space-y-6 border border-gray-100 bg-gray-50/60 p-4 sm:p-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                          <Field label="Capacity" type="number" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="Blank = unlimited" />
                          <Field label="Registration deadline" type="datetime-local" value={form.registrationDeadline} onChange={(e) => set("registrationDeadline", e.target.value)} />
                        </div>

                        <div className="space-y-3 border-t border-gray-200/70 pt-4">
                          <Switch checked={form.isRegistrationOpen} onChange={() => set("isRegistrationOpen", !form.isRegistrationOpen)} label="Registration open" hint="Turn off to stop new sign-ups." />
                          <Switch checked={form.allowGuests} onChange={() => set("allowGuests", !form.allowGuests)} label="Allow guests" hint="Let each person bring additional guests." />
                          {form.allowGuests && (
                            <div className="pl-12">
                              <label className={labelCls}>Max guests per person</label>
                              <input type="number" min="0" value={form.maxGuestsPerRegistration} onChange={(e) => set("maxGuestsPerRegistration", e.target.value)} className={cn(boxInput, "w-28")} />
                            </div>
                          )}
                        </div>

                        <div className="border-t border-gray-200/70 pt-5">
                          <QuestionBuilder questions={questions} setQuestions={setQuestions} />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── EXTRAS ── */}
              {activeTab === "extras" && (
                <>
                  <SectionHead icon={Settings2} title="Contact & options" desc="Optional contact details and event flags." />
                  <div className="space-y-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Contact email" type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="hello@example.org" />
                      <div>
                        <label className={labelCls}>Contact phone</label>
                        <PhoneInput
                          country="au"
                          value={(form.contactPhone || "").replace(/^\+/, "")}
                          onChange={(val) => set("contactPhone", val ? `+${val}` : "")}
                          enableSearch
                          countryCodeEditable={false}
                          inputProps={{ name: "contactPhone" }}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-gray-100 pt-6">
                      <Switch checked={form.featured} onChange={() => set("featured", !form.featured)} label="Featured event" hint="Highlight this event on your site." />
                      <Switch checked={form.isPaid} onChange={() => set("isPaid", !form.isPaid)} label="Paid event" hint="Charge a ticket price (payments coming soon)." />
                      {form.isPaid && (
                        <div className="flex flex-wrap items-end gap-4 pl-12">
                          <div>
                            <label className={labelCls}>Price</label>
                            <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0.00" className={cn(boxInput, "w-32")} />
                          </div>
                          <div>
                            <label className={labelCls}>Currency</label>
                            <input type="text" value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} className={cn(boxInput, "w-24")} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-2xl">
        <Link to="/admin/events" className="px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-gray-100">Cancel</Link>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {isEdit ? "Save changes" : "Create event"}
        </button>
      </div>

      {/* Delete confirmation */}
      <Portal>
      <AnimatePresence>
        {deleteOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setDeleteOpen(false)} />
            <motion.div className="relative w-full max-w-sm border border-gray-100 bg-white p-6 text-center shadow-2xl" initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-50">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-primary">Delete this event?</h3>
              <p className="mt-1 text-sm text-text-muted">This also removes all its registrations. This can't be undone.</p>
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => setDeleteOpen(false)} disabled={deleting} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex flex-1 items-center justify-center gap-2 bg-red-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50">
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>
    </form>
  );
}
