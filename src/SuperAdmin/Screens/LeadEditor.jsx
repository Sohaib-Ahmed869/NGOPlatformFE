import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, MotionConfig } from "framer-motion";
import { toast } from "react-hot-toast";
import { ArrowLeft, Loader2, Save, Plus, X, Building2, Users, Tag as TagIcon, DollarSign } from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
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

function Field({ label, hint, children, className }) {
  return (
    <div className={cn("min-w-0", className)}>
      <label className={labelCls}>{label}</label>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
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
function Panel({ title, hint, icon: Icon, children, cols = true }) {
  return (
    <section className={`${card} p-5 sm:p-6`}>
      <div className="mb-4 border-b border-gray-100 pb-3 dark:border-white/10">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-white/60">
          {Icon ? <Icon className="h-3.5 w-3.5" /> : null} {title}
        </h2>
        {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
      </div>
      <div className={cn(cols && "grid gap-x-5 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]")}>{children}</div>
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

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    superadminService.loadLeadStaff().then(setStaff).catch(() => {});
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

  const invalid = !form.orgName.trim() || !form.contactName.trim() || !form.contactEmail.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (invalid) { toast.error("Organisation, contact name and email are required"); return; }
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

  const back = () => navigate(isEdit ? `/leads/${id}` : "/leads");

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><TabLoader label="Loading lead…" /></div>;
  }
  if (error) return <SAErrorState message={error} onRetry={load} />;

  return (
    <MotionConfig reducedMotion="user">
    <div className="[&_*]:!rounded-none">
      <button type="button" onClick={back} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-accent">
        <ArrowLeft className="h-4 w-4" /> {isEdit ? "Back to lead" : "Back to leads"}
      </button>

      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
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
          {form.dealValue ? (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Annual value</p>
              <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {fmtMoney(Number(form.dealValue) || 0)}
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
        <Panel title="Organisation" icon={Building2} hint="Who they are and what they work on.">
          <Field label="Organisation name">
            <input value={form.orgName} onChange={(e) => set({ orgName: e.target.value })} maxLength={200} placeholder="Riverbank Care" className={inputCls} />
          </Field>
          <Field label="Website">
            <input value={form.orgWebsite} onChange={(e) => set({ orgWebsite: e.target.value })} maxLength={300} placeholder="https://riverbank.org.au" className={inputCls} />
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

        <Panel title="Primary contact" icon={Users} hint="The person a reply from this record goes to.">
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

        <section className={`${card} p-5 sm:p-6`}>
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-3 dark:border-white/10">
            <div>
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-white/60">
                <Users className="h-3.5 w-3.5" /> Other contacts
              </h2>
              <p className="mt-1 text-xs text-gray-400">The treasurer, the board sponsor, whoever else is in the room.</p>
            </div>
            <button
              type="button"
              onClick={() => set({ contacts: [...form.contacts, { name: "", email: "", phone: "", role: "", note: "" }] })}
              className="inline-flex items-center gap-1.5 border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
            >
              <Plus className="h-3.5 w-3.5" /> Add contact
            </button>
          </div>
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
        </section>

        <Panel title="The deal" icon={DollarSign} hint="What it is worth, when it might land, and how hard to push.">
          <Field label="Annual value" hint="What it's worth per year if it closes.">
            <input
              type="number"
              min="0"
              step="1"
              value={form.dealValue}
              onChange={(e) => set({ dealValue: e.target.value })}
              placeholder="10788"
              className={inputCls}
            />
          </Field>
          <Field label="Expected close">
            <input type="date" value={form.expectedCloseAt} onChange={(e) => set({ expectedCloseAt: e.target.value })} className={inputCls} />
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
          </Field>
        </Panel>

        <Panel title="Size &amp; current state" hint="Context for qualifying them — all optional.">
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

        <Panel title="Notes" cols={false} hint="What they told you, in your words.">
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
          <Panel title="Ownership &amp; source" hint="Set once, at creation — ownership afterwards changes on the lead itself.">
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

        {/* Sticky action bar — bottom rather than top, because the console’s
            topbar is `fixed` and this form is long enough that a top-stuck bar
            would still scroll Save out of reach. Bled to the content edges with
            negative margins matching the layout's own padding (px-4 / lg:px-6). */}
        <div className="sticky bottom-0 z-20 -mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 lg:-mx-6 lg:px-6 dark:border-white/10" style={{ backgroundColor: "var(--tenant-bg)" }}>
          <p className="min-w-0 text-xs text-gray-400">
            {invalid ? "Organisation, contact name and a valid email are required." : isEdit ? "Changes apply as soon as you save." : "You can edit everything afterwards."}
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
