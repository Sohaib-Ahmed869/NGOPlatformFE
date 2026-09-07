import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, MotionConfig } from "framer-motion";
import { toast } from "react-hot-toast";
import { ArrowLeft, Loader2, Save, Plus, X, Building2, Users, Tag as TagIcon, DollarSign, AlertTriangle, ArrowUpRight, Globe, ChevronDown, Check, FileText, BarChart3, UserCog, Mail, Phone } from "lucide-react";
import { useConfirm } from "../components/ConfirmProvider";
import SALoader from "../SALoader";
import { CustomSelect } from "../../components/CustomSelect";
import superadminService from "../../services/superadmin.service";
import SAErrorState from "../components/SAErrorState";
import { cn } from "../../utils/cn";
import {
  CAUSE_AREAS,
  STAFF_SIZES,
  BUDGET_RANGES,
  DONOR_DB_SIZES,
  CURRENT_TOOLS,
  CHALLENGES,
  TIMELINES,
  DECISION_ROLES,
} from "../../config/leadOptions";
import { LEAD_PRIORITIES } from "../../config/taskOptions";
import { card } from "../components/taskShared";
import { fmtMoney } from "./leadShared";

const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-white/60";
const inputCls =
  "w-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-accent disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white/85";
const selectTrigger = "w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-white/5";

const blank = (list) => [{ value: "", label: "Not stated" }, ...list.map((o) => ({ value: o.value, label: o.label }))];

/**
 * Mailbox providers, so "priya@gmail.com" never suggests gmail.com as the
 * charity's website. A small charity really does run on a free address — that
 * is not a data-entry mistake, it just isn't a domain worth offering.
 */
const FREE_MAIL = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.com.au", "hotmail.com", "hotmail.co.uk",
  "outlook.com", "live.com", "live.com.au", "icloud.com", "me.com", "aol.com",
  "proton.me", "protonmail.com", "bigpond.com", "optusnet.com.au", "iinet.net.au", "internode.on.net",
]);

/** A Date as the `yyyy-mm-dd` a date input wants, in LOCAL time. */
const toDateInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/**
 * Close-date shortcuts. The same idea as the task editor's due presets, and
 * for the same reason: the dates people actually pick are month and quarter
 * ends, and typing one into a date input is four interactions.
 */
const CLOSE_PRESETS = [
  { label: "End of month", get: () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() + 1, 0); } },
  { label: "In 30 days", get: () => { const n = new Date(); n.setDate(n.getDate() + 30); return n; } },
  { label: "End of quarter", get: () => { const n = new Date(); return new Date(n.getFullYear(), Math.floor(n.getMonth() / 3) * 3 + 3, 0); } },
  { label: "In 6 months", get: () => { const n = new Date(); n.setMonth(n.getMonth() + 6); return n; } },
];

/** "about 6 weeks away" — a date input shows a date, not how far off it is. */
function untilLabel(dateStr) {
  if (!dateStr) return "";
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return "";
  const today = new Date();
  const days = Math.round((target - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago — already past`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 21) return `${days} days away`;
  if (days < 60) return `about ${Math.round(days / 7)} weeks away`;
  return `about ${Math.round(days / 30)} months away`;
}

/**
 * The fields that decide whether a lead can actually be qualified.
 *
 * Deliberately NOT every field on the form — counting the optional "other
 * tools" free-text would make a well-filled record look half-done, and a
 * progress meter that never reaches the end is one nobody reads.
 */
const COMPLETENESS = [
  "orgName", "orgWebsite", "country", "causeAreas",
  "contactName", "contactEmail", "contactPhone", "contactRole",
  "staffSize", "annualBudgetRange", "donorDatabaseSize",
  "timeline", "decisionRole", "dealValue", "expectedCloseAt", "message",
];

/**
 * The form's own table of contents.
 *
 * Seven panels is a lot to face at once, and they are not equally important:
 * two of them are the whole reason the record exists and the rest are things
 * you learn later. Naming them here drives three things at once — the sticky
 * navigator, which panels start collapsed, and the per-section counts that
 * tell you what is still blank without scrolling to find out.
 *
 * `count` deliberately excludes fields that arrive pre-filled (country,
 * priority, source): a section that reads 1/4 before you have typed anything
 * is a section whose count means nothing.
 */
const SECTIONS = [
  { id: "organisation", title: "Organisation", short: "Org", icon: Building2, count: ["orgName", "orgWebsite", "causeAreas"] },
  { id: "contact", title: "Primary contact", short: "Contact", icon: Users, count: ["contactName", "contactEmail", "contactPhone", "contactRole"] },
  { id: "contacts", title: "Other contacts", short: "Others", icon: Users, count: ["contacts"], optional: true },
  { id: "deal", title: "The deal", short: "Deal", icon: DollarSign, count: ["dealValue", "expectedCloseAt", "interestedPlan", "interestedBillingCycle", "timeline", "decisionRole", "tags"] },
  { id: "profile", title: "Size & current state", short: "Profile", icon: BarChart3, count: ["staffSize", "annualBudgetRange", "donorDatabaseSize", "currentTools", "challenges"], optional: true },
  { id: "notes", title: "Notes", short: "Notes", icon: FileText, count: ["message"], optional: true },
  { id: "ownership", title: "Ownership & source", short: "Owner", icon: UserCog, count: ["assigneeUserId"], newOnly: true, optional: true },
];

const isFilled = (v) => (Array.isArray(v) ? v.length > 0 : String(v ?? "").trim() !== "");

function Field({ label, hint, error, children, className }) {
  return (
    <div className={cn("min-w-0", className)}>
      <label className={labelCls}>{label}</label>
      {children}
      {/* An error REPLACES the hint rather than stacking under it — the hint
          explains what the field is for, which is not what you need to read
          once the thing is wrong. */}
      {error ? (
        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * A full-width band of the form.
 *
 * Fields inside flow with `auto-fit`, measured against the PANEL's real width
 * rather than the viewport's — so a row of short selects sits four-across on a
 * wide console, two-across on a laptop with the sidebar out, and one-across on
 * a phone, with no breakpoints to guess at and no dead column left at any size.
 * Anything that wants the whole row asks for `col-span-full`.
 */
function Panel({ id, step, title, hint, icon: Icon, optional, filled = 0, total = 0, collapsible, open = true, onToggle, summary, action, children, cols = true }) {
  const done = total > 0 && filled === total;
  return (
    <section id={id} className="scroll-mt-24 border-t border-gray-100 p-5 first:border-t-0 sm:p-6 dark:border-white/10">
      <div
        className={cn(
          "flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-3 dark:border-white/10",
          open ? "mb-4" : "mb-0 border-b-0 pb-0",
        )}
      >
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-white/60">
            {/* A plain ordinal, not a coloured badge — it is a position in a
                list, and colouring it would imply a status it doesn't have. */}
            <span className="tabular-nums text-gray-300 dark:text-white/25">{String(step).padStart(2, "0")}</span>
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {title}
            {optional ? <span className="font-normal normal-case tracking-normal text-gray-400">· optional</span> : null}
          </h2>
          {hint && open ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
          {/* Collapsed sections still have to answer "is there anything in
              there?" — otherwise collapsing just hides information. */}
          {!open && summary ? <p className="mt-1 text-xs text-gray-500 dark:text-white/50">{summary}</p> : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {action && open ? action : null}
          {total > 0 ? (
            <span className={cn("inline-flex items-center gap-1 text-[11px] tabular-nums", done ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400")}>
              {done ? <Check className="h-3.5 w-3.5" /> : null}
              {filled}/{total}
            </span>
          ) : null}
          {collapsible ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 transition-colors hover:text-accent"
            >
              {open ? "Hide" : "Add"}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
            </button>
          ) : null}
        </div>
      </div>
      {open ? (
        <div className={cn(cols && "grid gap-x-5 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]")}>{children}</div>
      ) : null}
    </section>
  );
}

/** Multi-select as a row of toggles — no dropdown for a list you want to see all of. */
function ChipPicker({ options, value, onChange }) {
  const set = new Set(value || []);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = set.has(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...(value || []), o.value])}
            className={cn(
              "border px-2.5 py-1 text-xs font-medium transition-colors",
              on
                ? "border-accent bg-accent/10 text-accent"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-white/10 dark:bg-white/5 dark:text-white/60",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Add or edit a lead — a page at `/leads/new` and `/leads/:id/edit`.
 *
 * Two things this fixes at once. A lead could previously only exist by someone
 * filling in the public form, so the prospect met at a conference had nowhere
 * to live; and nothing an operator learned afterwards could be written back
 * onto the record, because the console had no edit surface at all despite the
 * API having supported it.
 */
export default function LeadEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const confirm = useConfirm();

  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState([]);

  const [form, setForm] = useState({
    orgName: "",
    orgWebsite: "",
    verticalType: "general",
    country: "Australia",
    causeAreas: [],
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contactRole: "",
    contacts: [],
    staffSize: "",
    annualBudgetRange: "",
    donorDatabaseSize: "",
    currentTools: [],
    currentToolsOther: "",
    challenges: [],
    challengesOther: "",
    interestedPlan: "",
    interestedBillingCycle: "",
    timeline: "",
    decisionRole: "",
    message: "",
    dealValue: "",
    expectedCloseAt: "",
    priority: "normal",
    tags: [],
    assigneeUserId: "",
    source: "superadmin_manual",
    consentToContact: false,
  });
  const [tagDraft, setTagDraft] = useState("");
  const [dupes, setDupes] = useState([]);
  const [knownTags, setKnownTags] = useState([]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  /* ── unsaved-changes tracking ──────────────────────────────────────────
     A snapshot of the form as it was last known-saved. Comparing against it
     is what lets Cancel, Back and a browser close all ask before throwing
     away twenty fields of typing. */
  const formRef = useRef(null);
  const pristineRef = useRef(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (loading) return;
    if (pristineRef.current === null) { pristineRef.current = JSON.stringify(form); return; }
    setDirty(JSON.stringify(form) !== pristineRef.current);
  }, [form, loading]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    superadminService.loadLeadStaff().then(setStaff).catch(() => {});
  }, []);

  /* ── is this prospect already in the pipeline? ─────────────────────────
     Duplicate leads are the classic CRM rot: two operators chase the same
     charity, neither seeing the other's notes. Cheaper to catch while the
     name is still being typed than to merge later. Advisory only — sometimes
     a second, genuinely separate record is right. */
  useEffect(() => {
    const org = form.orgName.trim();
    const email = form.contactEmail.trim().toLowerCase();
    if (org.length < 3 && !email.includes("@")) { setDupes([]); return undefined; }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const res = await superadminService.getLeadOptions(org.length >= 3 ? org : email);
        if (!alive) return;
        const term = org.toLowerCase();
        setDupes(
          (res.data?.leads || [])
            .filter((l) => String(l._id) !== String(id)) // editing itself is not a duplicate
            .filter((l) => (email && (l.contactEmail || "").toLowerCase() === email) || (term.length >= 3 && (l.orgName || "").toLowerCase().includes(term)))
            .slice(0, 3),
        );
      } catch { /* advisory — a failed lookup must never block typing */ }
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [form.orgName, form.contactEmail, id]);

  /* Tags already in use, so the vocabulary stays one vocabulary rather than
     "conference", "conferences" and "Conference" meaning the same thing.
     Sourced from /leads/options — the slim 200-row picker list the task editor
     already uses, which now carries `tags` too. That is deliberately not the
     full lead list: a hundred complete lead documents to populate a suggestion
     row would cost more than the suggestion is worth. */
  useEffect(() => {
    superadminService
      .getLeadOptions()
      .then((res) => setKnownTags([...new Set((res.data?.leads || []).flatMap((l) => l.tags || []))].sort()))
      .catch(() => { /* suggestions are a convenience, never a blocker */ });
  }, []);

  const load = useCallback(async () => {
    if (!isEdit) return;
    try {
      const lead = await superadminService.loadLead(id, { force: true });
      setForm((f) => ({
        ...f,
        orgName: lead.orgName || "",
        orgWebsite: lead.orgWebsite || "",
        verticalType: lead.verticalType || "general",
        country: lead.country || "",
        causeAreas: lead.causeAreas || [],
        contactName: lead.contactName || "",
        contactEmail: lead.contactEmail || "",
        contactPhone: lead.contactPhone || "",
        contactRole: lead.contactRole || "",
        contacts: (lead.contacts || []).map((c) => ({ name: c.name || "", email: c.email || "", phone: c.phone || "", role: c.role || "", note: c.note || "" })),
        staffSize: lead.staffSize || "",
        annualBudgetRange: lead.annualBudgetRange || "",
        donorDatabaseSize: lead.donorDatabaseSize || "",
        currentTools: lead.currentTools || [],
        currentToolsOther: lead.currentToolsOther || "",
        challenges: lead.challenges || [],
        challengesOther: lead.challengesOther || "",
        interestedPlan: lead.interestedPlan || "",
        interestedBillingCycle: lead.interestedBillingCycle || "",
        timeline: lead.timeline || "",
        decisionRole: lead.decisionRole || "",
        message: lead.message || "",
        dealValue: lead.dealValue ? String(lead.dealValue) : "",
        expectedCloseAt: lead.expectedCloseAt ? new Date(lead.expectedCloseAt).toISOString().slice(0, 10) : "",
        priority: lead.priority || "normal",
        tags: lead.tags || [],
      }));
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't load this lead.");
    } finally {
      setLoading(false);
    }
  }, [id, isEdit]);

  useEffect(() => { load(); }, [load]);

  const addTag = () => {
    const t = tagDraft.trim();
    if (!t || form.tags.includes(t)) { setTagDraft(""); return; }
    if (form.tags.length >= 20) { toast.error("Up to 20 tags"); return; }
    set({ tags: [...form.tags, t] });
    setTagDraft("");
  };

  const setContact = (i, patch) =>
    set({ contacts: form.contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  // Deliberately the same loose shape the server enforces (leadController's
  // EMAIL_RE) — the job is to catch "priya@" and "priya.org", the typos that
  // make a Reply go nowhere, not to adjudicate RFC 5322. Presence alone is not
  // enough: the bar below promises "a valid email", so enabling Save on a
  // malformed one just moves the rejection to a toast after the round trip.
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim());

  // The same four rules dealValueField() applies on the server, so the form
  // refuses what the API would refuse instead of letting the round trip come
  // back as a toast. Blank is legitimate and means 0 — a lead nobody has priced
  // yet is not an error.
  const dealValueError = useMemo(() => {
    const raw = String(form.dealValue ?? "").trim();
    if (!raw) return "";
    const n = Number(raw);
    if (!Number.isFinite(n)) return "Annual value must be a number.";
    if (n < 0) return "Annual value can’t be negative.";
    if (n > 100000000) return "Annual value can’t be more than 100,000,000.";
    if (Math.round(n * 100) !== n * 100) return "Annual value can’t have fractions of a cent.";
    return "";
  }, [form.dealValue]);

  /* How much of this prospect we actually know — the question behind
     "can this be qualified yet?". */
  const filledCount = useMemo(
    () => COMPLETENESS.filter((k) => {
      const v = form[k];
      return Array.isArray(v) ? v.length > 0 : String(v ?? "").trim() !== "";
    }).length,
    [form],
  );
  const completeness = Math.round((filledCount / COMPLETENESS.length) * 100);

  /* The charity's own domain, taken off the contact's email — the website is
     almost always just the part after the @, and retyping it is busywork. */
  const suggestedSite = useMemo(() => {
    if (form.orgWebsite.trim()) return "";
    const domain = form.contactEmail.trim().toLowerCase().split("@")[1] || "";
    if (!domain || !domain.includes(".") || FREE_MAIL.has(domain)) return "";
    return domain;
  }, [form.contactEmail, form.orgWebsite]);

  /* An annual figure is hard to sanity-check; the monthly one is the number
     people actually carry in their heads. */
  const monthly = useMemo(() => {
    const n = Number(form.dealValue);
    return Number.isFinite(n) && n > 0 ? fmtMoney(Math.round(n / 12)) : "";
  }, [form.dealValue]);

  /* ── section model: counts, collapse state, scroll-spy ────────────────── */
  const sections = useMemo(() => SECTIONS.filter((s) => !s.newOnly || !isEdit), [isEdit]);

  const sectionStats = useMemo(() => {
    const out = {};
    for (const s of sections) {
      out[s.id] = { filled: s.count.filter((k) => isFilled(form[k])).length, total: s.count.length };
    }
    return out;
  }, [sections, form]);

  /* Optional sections start closed on a NEW lead so the form opens as the
     three fields you actually need, and expands only if you have more to say.
     When EDITING, anything with content is open — collapsing a filled section
     would hide what the record already knows. */
  const [openSections, setOpenSections] = useState(null);
  useEffect(() => {
    if (openSections !== null || loading) return;
    setOpenSections(
      new Set(sections.filter((s) => !s.optional || s.count.some((k) => isFilled(form[k]))).map((s) => s.id)),
    );
  }, [openSections, loading, sections, form]);
  const isOpen = (id) => !openSections || openSections.has(id);
  const toggleSection = (id) =>
    setOpenSections((prev) => {
      const next = new Set(prev || []);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  useEffect(() => {
    if (loading) return undefined;
    /* A reading line just under the topbar + navigator, and the active section
       is the LAST one to have crossed it. An IntersectionObserver was the
       obvious tool and got this wrong: several panels intersect the viewport
       at once, and picking the topmost of them highlights the section you have
       just finished rather than the one under your eyes. */
    const READING_LINE = 150;
    const onScroll = () => {
      // A jump wins for a moment. Clicking a section that cannot reach the
      // reading line — the page bottoms out first — would otherwise leave the
      // navigator highlighting something else the instant you clicked.
      if (Date.now() < jumpLockRef.current) return;

      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        setActiveSection(sections[sections.length - 1]?.id);
        return;
      }
      let current = sections[0]?.id;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= READING_LINE) current = s.id;
      }
      setActiveSection((prev) => (prev === current ? prev : current));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [loading, sections, openSections]);

  /* What a collapsed section says about itself, so folding one away never
     hides the fact that there is something in it. */
  const profileSummary = useMemo(() => {
    const bits = [
      form.staffSize && STAFF_SIZES.find((o) => o.value === form.staffSize)?.label,
      form.annualBudgetRange && BUDGET_RANGES.find((o) => o.value === form.annualBudgetRange)?.label,
      form.currentTools.length && `${form.currentTools.length} tool${form.currentTools.length === 1 ? "" : "s"}`,
      form.challenges.length && `${form.challenges.length} challenge${form.challenges.length === 1 ? "" : "s"}`,
    ].filter(Boolean);
    return bits.join(" · ");
  }, [form.staffSize, form.annualBudgetRange, form.currentTools, form.challenges]);

  const contactsSummary = form.contacts.length
    ? form.contacts.map((c) => c.name.trim()).filter(Boolean).join(", ") || `${form.contacts.length} added`
    : "";

  /** Everything a Panel needs to know about its own place in the form. */
  const sectionProps = (sid) => {
    const i = sections.findIndex((s) => s.id === sid);
    const s = sections[i] || {};
    const st = sectionStats[sid] || { filled: 0, total: 0 };
    return {
      id: sid,
      step: i + 1,
      title: s.title,
      icon: s.icon,
      optional: s.optional,
      filled: st.filled,
      total: st.total,
      collapsible: !!s.optional,
      open: isOpen(sid),
      onToggle: () => toggleSection(sid),
    };
  };

  const jumpLockRef = useRef(0);
  const jumpTo = (id) => {
    setOpenSections((prev) => { const n = new Set(prev || []); n.add(id); return n; });
    setActiveSection(id);
    jumpLockRef.current = Date.now() + 900; // let the smooth scroll settle
    // A frame for the panel to expand before we measure where it is.
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const tagSuggestions = useMemo(
    () => knownTags.filter((t) => !form.tags.includes(t) && (!tagDraft.trim() || t.toLowerCase().includes(tagDraft.trim().toLowerCase()))).slice(0, 8),
    [knownTags, form.tags, tagDraft],
  );

  const missingRequired = !form.orgName.trim() || !form.contactName.trim() || !emailOk;
  const invalid = missingRequired || !!dealValueError;
  // Name the ACTUAL blocker. "…a valid email is required" while the real
  // problem is a negative figure three panels up is worse than saying nothing.
  const blockedBecause = missingRequired
    ? "Organisation, contact name and a valid email are required."
    : dealValueError;

  const submit = async (e) => {
    e.preventDefault();
    if (invalid) { toast.error(blockedBecause); return; }
    setSaving(true);
    try {
      const payload = {
        orgName: form.orgName.trim(),
        orgWebsite: form.orgWebsite.trim(),
        verticalType: form.verticalType,
        country: form.country.trim(),
        causeAreas: form.causeAreas,
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        contactRole: form.contactRole.trim(),
        // Rows left completely blank are dropped rather than rejected — an
        // operator who clicked "add contact" and changed their mind should not
        // have to find and remove the empty row before they can save.
        contacts: form.contacts.filter((c) => c.name.trim()),
        staffSize: form.staffSize,
        annualBudgetRange: form.annualBudgetRange,
        donorDatabaseSize: form.donorDatabaseSize,
        currentTools: form.currentTools,
        currentToolsOther: form.currentToolsOther.trim(),
        challenges: form.challenges,
        challengesOther: form.challengesOther.trim(),
        interestedPlan: form.interestedPlan.trim(),
        interestedBillingCycle: form.interestedBillingCycle,
        timeline: form.timeline,
        decisionRole: form.decisionRole,
        message: form.message.trim(),
        dealValue: form.dealValue === "" ? 0 : Number(form.dealValue),
        expectedCloseAt: form.expectedCloseAt || null,
        priority: form.priority,
        tags: form.tags,
      };

      if (isEdit) {
        const res = await superadminService.updateLead(id, payload);
        superadminService.setLeadCache(res.data.lead);
        pristineRef.current = JSON.stringify(form);
      setDirty(false);
      toast.success("Lead saved");
        navigate(`/leads/${id}`);
        return;
      }

      const res = await superadminService.createLead({
        ...payload,
        assigneeUserId: form.assigneeUserId || null,
        source: form.source,
        consentToContact: form.consentToContact,
      });
      superadminService.setLeadCache(res.data.lead);
      pristineRef.current = JSON.stringify(form);
      setDirty(false);
      toast.success("Lead added");
      navigate(`/leads/${res.data.lead._id}`, { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't save that lead");
    } finally {
      setSaving(false);
    }
  };

  const staffOptions = useMemo(
    () => [{ value: "", label: "Unassigned" }, ...staff.map((s) => ({ value: s._id, label: s.name || s.email }))],
    [staff],
  );

  /* ⌘/Ctrl+S saves. This form is long enough that the Save button is often
     off-screen mid-typing, and every other editor people use all day binds
     this — leaving it to fall through to the browser's "save page" dialog is
     its own small betrayal. */
  useEffect(() => {
    const onKey = (e) => {
      if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s")) return;
      e.preventDefault();
      if (!saving && !invalid) formRef.current?.requestSubmit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, invalid]);

  const back = async () => {
    const leave = () => navigate(isEdit ? `/leads/${id}` : "/leads");
    if (!dirty) return leave();
    const ok = await confirm({
      title: "Discard your changes?",
      message: "This lead has edits that haven't been saved. Leaving now throws them away.",
      tone: "danger",
      confirmText: "Discard",
      icon: AlertTriangle,
    });
    if (ok) leave();
    return undefined;
  };

  if (loading) {
    return <SALoader label="Loading lead…" />;
  }
  if (error) return <SAErrorState message={error} onRetry={load} />;

  return (
    <MotionConfig reducedMotion="user">
    <div className="[&_*]:!rounded-none">
      <button type="button" onClick={back} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-accent">
        <ArrowLeft className="h-4 w-4" /> {isEdit ? "Back to lead" : "Back to leads"}
      </button>

      <motion.form ref={formRef} onSubmit={submit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {/* Record header — flat, not one of the gradient hero bands. Those
            announce a section of the console; this announces one record. */}
        <div className={`${card} mb-4 flex flex-wrap items-center justify-between gap-4 p-5`}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent"><Building2 className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 [overflow-wrap:anywhere] dark:text-white">
                {isEdit ? form.orgName || "Edit lead" : "New lead"}
              </h1>
              <p className="text-sm text-gray-500 dark:text-white/60">
                {isEdit ? "Everything the team has learned about this prospect." : "A prospect who came to you some other way than the website form."}
              </p>
            </div>
          </div>
          {form.dealValue && !dealValueError ? (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Annual value</p>
              <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {fmtMoney(Number(form.dealValue) || 0)}
              </p>
              {monthly ? <p className="text-[10px] text-gray-400">{monthly}/mo</p> : null}
            </div>
          ) : null}
        </div>
        {/* Already in the pipeline? Advisory, never blocking — occasionally a
            second record for the same charity is genuinely right (a different
            branch, a different decision-maker). */}
        {dupes.length ? (
          <div className="mb-4 border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {dupes.length === 1 ? "This prospect may already be in the pipeline" : "These prospects may already be in the pipeline"}
            </p>
            <ul className="mt-2 space-y-1">
              {dupes.map((d) => (
                <li key={d._id}>
                  <Link
                    to={`/leads/${d._id}`}
                    className="inline-flex items-center gap-1.5 text-sm text-amber-900 underline decoration-amber-300 underline-offset-2 transition-colors hover:text-amber-950 dark:text-amber-200"
                  >
                    {d.orgName}
                    <span className="text-xs text-amber-700 dark:text-amber-300/70">
                      · {String(d.stage || "").replace(/_/g, " ")}{d.contactEmail ? ` · ${d.contactEmail}` : ""}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Two columns: the form on the left, a rail that follows you down it.
            The rail is STICKY and carries only things worth watching while you
            type — the row this will become, how far through you are, and where
            everything is. That is what stops it being the strip of white space
            a plain 2/3 + 1/3 grid leaves once one column runs out of content.
            Below `xl` it stacks with the rail FIRST, because on a phone the
            preview and progress are the summary you want before the fields. */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
          <aside className="space-y-4 xl:order-2 xl:sticky xl:top-20">
            <div className={`${card} p-4`}>
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">How it will appear in the pipeline</p>
              {/* A form is a list of inputs; the pipeline is a list of ROWS.
                  Showing the row as it is typed is the difference between
                  filling in fields and writing a record you can picture. */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold" style={{ background: "#f59e0b1a", color: "#f59e0b" }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#f59e0b" }} /> New
                </span>
                <span className={cn("text-sm font-semibold [overflow-wrap:anywhere]", form.orgName.trim() ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-white/25")}>
                  {form.orgName.trim() || "Organisation name"}
                </span>
              </div>
              <div className="mt-2 space-y-1">
                <p className={cn("inline-flex items-center gap-1.5 text-xs", form.contactName.trim() ? "text-gray-600 dark:text-white/70" : "text-gray-300 dark:text-white/25")}>
                  <Users className="h-3.5 w-3.5 shrink-0" /> {form.contactName.trim() || "Contact name"}
                </p>
                {form.contactEmail.trim() ? (
                  <p className="inline-flex items-center gap-1.5 text-xs text-gray-500 [overflow-wrap:anywhere] dark:text-white/60"><Mail className="h-3.5 w-3.5 shrink-0" /> {form.contactEmail.trim()}</p>
                ) : null}
                {form.contactPhone.trim() ? (
                  <p className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/60"><Phone className="h-3.5 w-3.5 shrink-0" /> {form.contactPhone.trim()}</p>
                ) : null}
              </div>
              {form.dealValue && !dealValueError ? (
                <p className="mt-2 border-t border-gray-100 pt-2 text-sm font-bold tabular-nums text-emerald-600 dark:border-white/10 dark:text-emerald-400">
                  {fmtMoney(Number(form.dealValue))}
                  {monthly ? <span className="ml-1 text-[10px] font-normal text-gray-400">{monthly}/mo</span> : null}
                </p>
              ) : null}
              {form.tags.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {form.tags.map((t) => (
                    <span key={t} className="border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500 dark:border-white/10 dark:text-white/50">{t}</span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* The table of contents, vertical. Seven sections is more than
                fits on a screen; this says where you are, what is still blank,
                and gets you there in one click. */}
            <div className={`${card} p-2`}>
              <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Detail captured</span>
                <span className="text-[11px] font-semibold tabular-nums text-gray-500 dark:text-white/60">{completeness}%</span>
              </div>
              <div className="mx-2 mb-2 h-1 bg-gray-100 dark:bg-white/10">
                <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${completeness}%` }} />
              </div>
              {sections.map((s) => {
                const st = sectionStats[s.id] || { filled: 0, total: 0 };
                const done = st.total > 0 && st.filled === st.total;
                const active = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => jumpTo(s.id)}
                    className={cn(
                      "flex w-full items-center gap-2 border-l-2 px-2.5 py-2 text-left text-xs font-medium transition-colors",
                      active
                        ? "border-accent bg-accent/5 text-accent"
                        : "border-transparent text-gray-500 hover:text-gray-800 dark:text-white/50 dark:hover:text-white/80",
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> : <s.icon className="h-3.5 w-3.5 shrink-0" />}
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    <span className="shrink-0 tabular-nums text-[10px] text-gray-400">{st.filled}/{st.total}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* One surface, hairline-separated sections — see Panel above. */}
          <div className={`${card} min-w-0 xl:order-1`}>
        <Panel {...sectionProps("organisation")} hint="Who they are and what they work on.">
          <Field label="Organisation name">
            <input value={form.orgName} onChange={(e) => set({ orgName: e.target.value })} maxLength={200} placeholder="Riverbank Care" className={inputCls} />
          </Field>
          <Field label="Website">
            <input value={form.orgWebsite} onChange={(e) => set({ orgWebsite: e.target.value })} maxLength={300} placeholder="https://riverbank.org.au" className={inputCls} />
            {/* The website is almost always the part after the @ — offered, not
                filled in, because the guess is only usually right. */}
            {suggestedSite ? (
              <button
                type="button"
                onClick={() => set({ orgWebsite: `https://${suggestedSite}` })}
                className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 underline decoration-gray-300 underline-offset-2 transition-colors hover:text-accent"
              >
                <Globe className="h-3 w-3" /> Use {suggestedSite}
              </button>
            ) : null}
          </Field>
          <Field label="Country">
            <input value={form.country} onChange={(e) => set({ country: e.target.value })} maxLength={100} className={inputCls} />
          </Field>
          <Field label="Type" hint="Muslim charities get the Islamic giving pages.">
            <CustomSelect
              value={form.verticalType}
              onChange={(v) => set({ verticalType: v })}
              options={[{ value: "general", label: "General charity" }, { value: "muslim", label: "Muslim charity" }]}
              className="w-full"
              triggerClassName={selectTrigger}
            />
          </Field>
          <Field label="Cause areas" className="col-span-full">
            <ChipPicker options={CAUSE_AREAS} value={form.causeAreas} onChange={(v) => set({ causeAreas: v })} />
          </Field>
        </Panel>

        <Panel {...sectionProps("contact")} hint="The person a reply from this record goes to.">
          <Field label="Name">
            <input value={form.contactName} onChange={(e) => set({ contactName: e.target.value })} maxLength={150} placeholder="Priya Sharma" className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} maxLength={250} placeholder="priya@riverbank.org.au" className={inputCls} />
          </Field>
          <Field label="Phone">
            <input value={form.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} maxLength={50} className={inputCls} />
          </Field>
          <Field label="Role">
            <input value={form.contactRole} onChange={(e) => set({ contactRole: e.target.value })} maxLength={100} placeholder="Fundraising Lead" className={inputCls} />
          </Field>
        </Panel>

        <Panel
          {...sectionProps("contacts")}
          cols={false}
          hint="The treasurer, the board sponsor, whoever else is in the room."
          summary={contactsSummary}
          action={
            <button
              type="button"
              onClick={() => set({ contacts: [...form.contacts, { name: "", email: "", phone: "", role: "", note: "" }] })}
              className="inline-flex items-center gap-1.5 border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
            >
              <Plus className="h-3.5 w-3.5" /> Add contact
            </button>
          }
        >
          {form.contacts.length === 0 ? (
            <p className="border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400 dark:border-white/10">
              Charity software is rarely bought by one person.
            </p>
          ) : (
            // Two contacts side by side once there is room — a contact block is
            // five short fields, and stacking them down a full-width page is
            // most of a screen of scrolling for very little content.
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
              {form.contacts.map((c, i) => (
                <div key={i} className="relative border border-gray-100 bg-gray-50/50 p-3 dark:border-white/10 dark:bg-white/5">
                  <button
                    type="button"
                    onClick={() => set({ contacts: form.contacts.filter((_, j) => j !== i) })}
                    aria-label="Remove this contact"
                    className="absolute right-2 top-2 text-gray-300 transition-colors hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="grid gap-3 pr-6 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
                    <Field label="Name">
                      <input value={c.name} onChange={(e) => setContact(i, { name: e.target.value })} maxLength={150} className={inputCls} />
                    </Field>
                    <Field label="Email">
                      <input type="email" value={c.email} onChange={(e) => setContact(i, { email: e.target.value })} maxLength={250} className={inputCls} />
                    </Field>
                    <Field label="Phone">
                      <input value={c.phone} onChange={(e) => setContact(i, { phone: e.target.value })} maxLength={50} className={inputCls} />
                    </Field>
                    <Field label="Role">
                      <input value={c.role} onChange={(e) => setContact(i, { role: e.target.value })} maxLength={100} className={inputCls} />
                    </Field>
                    <Field label="Note" className="col-span-full">
                      <input value={c.note} onChange={(e) => setContact(i, { note: e.target.value })} maxLength={1000} placeholder="Signs off the budget; prefers a phone call" className={inputCls} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel {...sectionProps("deal")} hint="What it is worth, when it might land, and how hard to push.">
          <Field label="Annual value" hint="What it's worth per year if it closes." error={dealValueError}>
            <input
              type="number"
              min="0"
              max="100000000"
              // Cents are allowed, so the spinner must step in cents too —
              // step="1" made the browser call a legitimate 12.34 a bad step.
              step="0.01"
              value={form.dealValue}
              onChange={(e) => set({ dealValue: e.target.value })}
              placeholder="10788"
              className={cn(inputCls, dealValueError && "border-red-300 dark:border-red-500/50")}
            />
            {/* The monthly figure is the one people can sanity-check at a
                glance — a slipped decimal is obvious here and invisible above. */}
            {monthly && !dealValueError ? (
              <p className="mt-1 text-[11px] text-gray-500 dark:text-white/50">
                {fmtMoney(Number(form.dealValue))} a year — about <span className="font-semibold tabular-nums">{monthly}</span> a month
              </p>
            ) : null}
          </Field>
          <Field label="Expected close" hint={form.expectedCloseAt ? undefined : "Leave blank until there's a real date in play."}>
            <input type="date" value={form.expectedCloseAt} onChange={(e) => set({ expectedCloseAt: e.target.value })} className={inputCls} />
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {CLOSE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => set({ expectedCloseAt: toDateInput(p.get()) })}
                  className="border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:border-accent hover:text-accent dark:border-white/10 dark:text-white/60"
                >
                  {p.label}
                </button>
              ))}
              {form.expectedCloseAt ? (
                <button
                  type="button"
                  onClick={() => set({ expectedCloseAt: "" })}
                  className="border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-400 transition-colors hover:border-red-300 hover:text-red-500 dark:border-white/10"
                >
                  Clear
                </button>
              ) : null}
            </div>
            {form.expectedCloseAt ? (
              <p className="mt-1 text-[11px] text-gray-500 dark:text-white/50">{untilLabel(form.expectedCloseAt)}</p>
            ) : null}
          </Field>
          <Field label="Priority">
            <CustomSelect value={form.priority} onChange={(v) => set({ priority: v })} options={LEAD_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))} className="w-full" triggerClassName={selectTrigger} />
          </Field>
          <Field label="Plan of interest">
            <input value={form.interestedPlan} onChange={(e) => set({ interestedPlan: e.target.value })} maxLength={60} placeholder="Professional" className={inputCls} />
          </Field>
          <Field label="Billing cycle">
            <CustomSelect
              value={form.interestedBillingCycle}
              onChange={(v) => set({ interestedBillingCycle: v })}
              options={[{ value: "", label: "Not stated" }, { value: "monthly", label: "Monthly" }, { value: "annual", label: "Annual" }]}
              className="w-full"
              triggerClassName={selectTrigger}
            />
          </Field>
          <Field label="Timeline">
            <CustomSelect value={form.timeline} onChange={(v) => set({ timeline: v })} options={blank(TIMELINES)} className="w-full" triggerClassName={selectTrigger} />
          </Field>
          <Field label="Decision role">
            <CustomSelect value={form.decisionRole} onChange={(v) => set({ decisionRole: v })} options={blank(DECISION_ROLES)} className="w-full" triggerClassName={selectTrigger} />
          </Field>
          <Field label="Tags" className="col-span-full">
            <div className="flex gap-2">
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                placeholder="conference-2026"
                maxLength={40}
                className={inputCls}
              />
              <button type="button" onClick={addTag} className="shrink-0 border border-gray-200 px-3 text-gray-500 transition-colors hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {form.tags.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                    <TagIcon className="h-3 w-3" /> {t}
                    <button type="button" onClick={() => set({ tags: form.tags.filter((x) => x !== t) })} className="text-gray-300 transition-colors hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            {/* Tags already in use elsewhere. Without them everyone invents
                their own spelling and the tag filter stops grouping anything. */}
            {tagSuggestions.length ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-gray-400">Already in use:</span>
                {tagSuggestions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { set({ tags: [...form.tags, t] }); setTagDraft(""); }}
                    className="border border-dashed border-gray-300 px-2 py-0.5 text-[11px] text-gray-500 transition-colors hover:border-accent hover:text-accent dark:border-white/15 dark:text-white/50"
                  >
                    {t}
                  </button>
                ))}
              </div>
            ) : null}
          </Field>
        </Panel>

        <Panel {...sectionProps("profile")} hint="Context for qualifying them." summary={profileSummary}>
          <Field label="Staff size">
            <CustomSelect value={form.staffSize} onChange={(v) => set({ staffSize: v })} options={blank(STAFF_SIZES)} className="w-full" triggerClassName={selectTrigger} />
          </Field>
          <Field label="Annual budget">
            <CustomSelect value={form.annualBudgetRange} onChange={(v) => set({ annualBudgetRange: v })} options={blank(BUDGET_RANGES)} className="w-full" triggerClassName={selectTrigger} />
          </Field>
          <Field label="Donor database">
            <CustomSelect value={form.donorDatabaseSize} onChange={(v) => set({ donorDatabaseSize: v })} options={blank(DONOR_DB_SIZES)} className="w-full" triggerClassName={selectTrigger} />
          </Field>
          <Field label="Tools in use" className="col-span-full">
            <ChipPicker options={CURRENT_TOOLS} value={form.currentTools} onChange={(v) => set({ currentTools: v })} />
            <input value={form.currentToolsOther} onChange={(e) => set({ currentToolsOther: e.target.value })} maxLength={500} placeholder="Anything else they mentioned" className={`${inputCls} mt-2`} />
          </Field>
          <Field label="Challenges" className="col-span-full">
            <ChipPicker options={CHALLENGES} value={form.challenges} onChange={(v) => set({ challenges: v })} />
            <input value={form.challengesOther} onChange={(e) => set({ challengesOther: e.target.value })} maxLength={500} placeholder="In their words" className={`${inputCls} mt-2`} />
          </Field>
        </Panel>

        <Panel {...sectionProps("notes")} cols={false} hint="What they told you, in your words." summary={form.message.trim() ? `${form.message.trim().length} characters written` : ""}>
          <textarea
            rows={5}
            value={form.message}
            onChange={(e) => set({ message: e.target.value })}
            maxLength={3000}
            placeholder="What they told you, what they need, anything the next person picking this up would want to know."
            className={inputCls}
          />
        </Panel>

        {/* Creation-only. Ownership afterwards is changed on the lead's own
            header, and the source of an existing lead is a historical fact. */}
        {!isEdit ? (
          <Panel {...sectionProps("ownership")} hint="Set once, at creation — ownership afterwards changes on the lead itself.">
            <Field label="Owner">
              <CustomSelect value={form.assigneeUserId} onChange={(v) => set({ assigneeUserId: v })} options={staffOptions} searchable searchPlaceholder="Search operators…" className="w-full" triggerClassName={selectTrigger} />
            </Field>
            <Field label="Source">
              <CustomSelect
                value={form.source}
                onChange={(v) => set({ source: v })}
                options={[
                  { value: "superadmin_manual", label: "Added by an operator" },
                  { value: "referral", label: "Referral" },
                  { value: "contact_page", label: "Contact page" },
                  { value: "other", label: "Other" },
                ]}
                className="w-full"
                triggerClassName={selectTrigger}
              />
            </Field>
            <Field label="Consent" className="col-span-full">
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-gray-700 dark:text-white/80">
                <input
                  type="checkbox"
                  checked={form.consentToContact}
                  onChange={(e) => set({ consentToContact: e.target.checked })}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--tenant-accent,#10b981)]"
                />
                <span>
                  They have agreed to be contacted about the platform.
                  <span className="mt-0.5 block text-[11px] text-gray-400">
                    Tick this only if it’s true — it’s the record of who vouched for the permission to email them.
                  </span>
                </span>
              </label>
            </Field>
          </Panel>
        ) : null}
          </div>
        </div>

        {/* Sticky action bar — bottom rather than top, because the console’s
            topbar is `fixed` and this form is long enough that a top-stuck bar
            would still scroll Save out of reach. Bled to the content edges with
            negative margins matching the layout's own padding (px-4 / lg:px-6). */}
        <div className="sticky bottom-0 z-20 -mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 lg:-mx-6 lg:px-6 dark:border-white/10" style={{ backgroundColor: "var(--tenant-bg)" }}>
          <p className="min-w-0 text-xs text-gray-400">
            {invalid ? (
              blockedBecause
            ) : (
              <>
                {dirty ? <span className="font-medium text-amber-600 dark:text-amber-400">Unsaved changes · </span> : null}
                {isEdit ? "Changes apply as soon as you save." : "You can edit everything afterwards."}
                <span className="ml-1 hidden text-gray-300 sm:inline dark:text-white/25">⌘S</span>
              </>
            )}
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
              disabled={saving || invalid}
              className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? "Save changes" : "Create lead"}
            </button>
          </div>
        </div>
      </motion.form>
    </div>
    </MotionConfig>
  );
}
