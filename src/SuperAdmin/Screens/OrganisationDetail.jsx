import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Globe,
  Mail,
  Calendar,
  CreditCard,
  Gift,
  SlidersHorizontal,
  Clock,
  Ban,
  CheckCircle2,
  LifeBuoy,
  History,
  Receipt,
  ExternalLink,
  X,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SAPageHeader from "../components/SAPageHeader";
import SALoader from "../SALoader";
import toast from "react-hot-toast";

const card = "rounded-xl border border-gray-100 bg-white shadow-sm";
const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5";
const labelCls = "mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400";

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  past_due: "bg-red-50 text-red-700 ring-1 ring-red-200",
  cancelled: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};
const planColors = { basic: "#06b6d4", professional: "#10b981", enterprise: "#f59e0b" };
const fmtLimit = (v) => (v === null || v === undefined ? "Unlimited" : v);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—");
const dateInputValue = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

export default function OrganisationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ campaigns: "", volunteers: "", volunteerEnabled: false, reason: "" });
  const [compOpen, setCompOpen] = useState(false);
  const [compReason, setCompReason] = useState("");
  const [trialDate, setTrialDate] = useState("");
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportReason, setSupportReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await superadminService.getOrganisation(id);
      setData(res.data);
      setTrialDate(dateInputValue(res.data.organisation?.trialEndsAt));
    } catch {
      toast.error("Failed to load organisation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <SALoader />;
  if (!data?.organisation) {
    return (
      <div className={`${card} py-20 text-center`}>
        <p className="mb-4 text-gray-500">Organisation not found</p>
        <button onClick={() => navigate("/organisations")} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-light">
          Back to Organisations
        </button>
      </div>
    );
  }

  const org = data.organisation;
  const limits = data.effectiveLimits || {};
  const color = planColors[org.plan] || "#10b981";
  const hasOverride = !!org.override?.limits || org.override?.pricing?.monthly != null;

  const setStatus = async (action) => {
    setBusy(true);
    try {
      await superadminService.updateOrgStatus(id, action);
      toast.success(`Organisation ${action}d`);
      load();
    } catch {
      toast.error(`Failed to ${action}`);
    } finally {
      setBusy(false);
    }
  };

  const saveComp = async (isComp) => {
    if (isComp && !compReason.trim()) return toast.error("A reason is required");
    setBusy(true);
    try {
      await superadminService.compOrg(id, { isComp, reason: compReason });
      toast.success(isComp ? "Marked as comped" : "Comp removed");
      setCompOpen(false);
      setCompReason("");
      load();
    } catch {
      toast.error("Failed to update");
    } finally {
      setBusy(false);
    }
  };

  const openOverride = () => {
    const ov = org.override?.limits || {};
    setOverrideForm({
      campaigns: ov.campaigns ?? "",
      volunteers: ov.volunteers ?? "",
      volunteerEnabled: !!ov.volunteerEnabled,
      reason: org.override?.reason || "",
    });
    setOverrideOpen(true);
  };

  const saveOverride = async () => {
    if (!overrideForm.reason.trim()) return toast.error("A reason is required");
    setBusy(true);
    try {
      await superadminService.setOrgOverride(id, {
        limits: {
          campaigns: overrideForm.campaigns === "" ? null : Number(overrideForm.campaigns),
          volunteers: overrideForm.volunteers === "" ? null : Number(overrideForm.volunteers),
          volunteerEnabled: overrideForm.volunteerEnabled,
        },
        reason: overrideForm.reason,
      });
      toast.success("Override saved");
      setOverrideOpen(false);
      load();
    } catch {
      toast.error("Failed to save override");
    } finally {
      setBusy(false);
    }
  };

  const clearOverride = async () => {
    setBusy(true);
    try {
      await superadminService.clearOrgOverride(id);
      toast.success("Override cleared");
      load();
    } catch {
      toast.error("Failed to clear override");
    } finally {
      setBusy(false);
    }
  };

  const saveTrial = async () => {
    setBusy(true);
    try {
      await superadminService.setOrgTrial(id, trialDate || null);
      toast.success("Trial updated");
      load();
    } catch {
      toast.error("Failed to update trial");
    } finally {
      setBusy(false);
    }
  };

  const openSupport = async () => {
    setBusy(true);
    try {
      const res = await superadminService.actAs(id, { reason: supportReason });
      const { token, slug } = res.data;
      // Hand the 1-hour token to the tenant subdomain via the URL hash.
      const { protocol, host } = window.location;
      const parts = host.split(".");
      parts[0] = slug;
      const tenantOrigin = `${protocol}//${parts.join(".")}`;
      window.location.href = `${tenantOrigin}/support-handoff#token=${encodeURIComponent(token)}`;
    } catch {
      toast.error("Failed to start support session");
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate("/organisations")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Organisations
      </button>

      <SAPageHeader
        eyebrow={org.slug}
        title={org.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles[org.subscriptionStatus] || statusStyles.pending}`}>
              {org.subscriptionStatus}
            </span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: `${color}14`, color }}>
              {org.plan}
            </span>
            {!org.isActive && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 ring-1 ring-red-200">Inactive</span>}
            {org.isComp && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-violet-200">Comped</span>}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => { setSupportReason(""); setSupportOpen(true); }} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
              <LifeBuoy className="h-4 w-4" /> Open as support
            </button>
            {org.isActive ? (
              <button onClick={() => setStatus("suspend")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50">
                <Ban className="h-4 w-4" /> Suspend
              </button>
            ) : (
              <button onClick={() => setStatus("reactivate")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" /> Reactivate
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="space-y-4">
          {/* Subscription */}
          <div className={`${card} p-6`}>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900"><CreditCard className="h-4 w-4 text-gray-400" /> Subscription</h2>
            <div className="divide-y divide-gray-50">
              <InfoRow label="Plan" value={<span className="capitalize">{data.plan?.name || org.plan}</span>} />
              <InfoRow label="Billing cycle" value={<span className="capitalize">{org.billingCycle || "monthly"}</span>} />
              <InfoRow label="Status" value={<span className="capitalize">{org.subscriptionStatus}</span>} />
              <InfoRow label="Stripe subscription" value={org.stripeSubscriptionId ? "Connected" : "—"} />
              <InfoRow label="Comped" value={org.isComp ? `Yes — ${org.compReason || "no reason"}` : "No"} />
            </div>
          </div>

          {/* Effective limits */}
          <div className={`${card} p-6`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><SlidersHorizontal className="h-4 w-4 text-gray-400" /> Effective limits</h2>
              <div className="flex items-center gap-2">
                {hasOverride && (
                  <button onClick={clearOverride} disabled={busy} className="text-xs font-medium text-gray-400 hover:text-red-500 disabled:opacity-50">Clear override</button>
                )}
                <button onClick={openOverride} className="rounded-md border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20">
                  {hasOverride ? "Edit override" : "Override"}
                </button>
              </div>
            </div>
            {hasOverride && (
              <p className="mb-3 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-xs text-violet-700">
                Custom override active{org.override?.reason ? ` — ${org.override.reason}` : ""}.
              </p>
            )}
            <div className="divide-y divide-gray-50">
              <InfoRow label="Campaigns" value={fmtLimit(limits.campaigns)} />
              <InfoRow label="Volunteers" value={fmtLimit(limits.volunteers)} />
              <InfoRow label="Volunteer module" value={limits.volunteerEnabled ? "Enabled" : "Disabled"} />
            </div>
          </div>

          {/* Invoices */}
          <div className={`${card} p-6`}>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900"><Receipt className="h-4 w-4 text-gray-400" /> Recent invoices</h2>
            {data.invoices?.length ? (
              <div className="space-y-1">
                {data.invoices.map((inv) => (
                  <div key={inv._id} className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">${Number(inv.amountPaid || inv.amountDue || 0).toLocaleString()} {(inv.currency || "usd").toUpperCase()}</p>
                      <p className="font-mono text-[10px] text-gray-400">{inv.number || inv.stripeInvoiceId?.slice(-8)} · {new Date(inv.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${inv.status === "paid" ? "bg-emerald-50 text-emerald-700" : inv.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{inv.status}</span>
                      {inv.hostedInvoiceUrl && <a href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-accent"><ExternalLink className="h-3.5 w-3.5" /></a>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-gray-400">No invoices yet</p>
            )}
          </div>

          {/* Audit timeline */}
          <div className={`${card} p-6`}>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900"><History className="h-4 w-4 text-gray-400" /> Recent operator activity</h2>
            {data.audit?.length ? (
              <ul className="space-y-3">
                {data.audit.map((a) => (
                  <li key={a._id} className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800">{a.action}</p>
                      <p className="font-mono text-[10px] text-gray-400">
                        {a.actorEmail || "system"} · {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-gray-400">No activity recorded yet</p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Owner */}
          <div className={`${card} p-6`}>
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Owner</h2>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold uppercase text-white" style={{ background: "linear-gradient(135deg, var(--tenant-accent, #10b981), var(--tenant-accent-light, #34d399))" }}>
                {(org.adminUserId?.name || org.name)?.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{org.adminUserId?.name || "—"}</p>
                <p className="flex items-center gap-1 truncate text-xs text-gray-400"><Mail className="h-3 w-3" /> {org.adminUserId?.email || "—"}</p>
              </div>
            </div>
            <div className="mt-4 divide-y divide-gray-50">
              <InfoRow label={<span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> Slug</span>} value={<span className="font-mono text-xs">{org.slug}</span>} />
              <InfoRow label={<span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Created</span>} value={fmtDate(org.createdAt)} />
            </div>
          </div>

          {/* Comp */}
          <div className={`${card} p-6`}>
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900"><Gift className="h-4 w-4 text-gray-400" /> Comp</h2>
            <p className="mb-4 text-xs text-gray-400">Give this tenant a free subscription.</p>
            {org.isComp ? (
              <button onClick={() => saveComp(false)} disabled={busy} className="w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10">
                Remove comp
              </button>
            ) : (
              <button onClick={() => { setCompReason(""); setCompOpen(true); }} className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
                Mark as comped
              </button>
            )}
          </div>

          {/* Trial */}
          <div className={`${card} p-6`}>
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900"><Clock className="h-4 w-4 text-gray-400" /> Trial</h2>
            <p className="mb-3 text-xs text-gray-400">Set or extend the trial end date.</p>
            <label className={labelCls}>Trial ends</label>
            <input type="date" value={trialDate} onChange={(e) => setTrialDate(e.target.value)} className={`${inputCls} mb-3`} />
            <button onClick={saveTrial} disabled={busy} className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
              Save trial
            </button>
          </div>
        </div>
      </div>

      {/* Comp modal */}
      <AnimatePresence>
        {compOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCompOpen(false)} />
            <motion.div className={`${card} relative w-full max-w-sm p-6 shadow-xl`} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <h3 className="mb-1 text-lg font-semibold text-gray-900">Comp this tenant</h3>
              <p className="mb-4 text-xs text-gray-400">A reason is required and recorded in the audit log.</p>
              <label className={labelCls}>Reason</label>
              <input value={compReason} onChange={(e) => setCompReason(e.target.value)} className={`${inputCls} mb-4`} placeholder="e.g. Registered charity partner" autoFocus />
              <div className="flex gap-3">
                <button onClick={() => setCompOpen(false)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10">Cancel</button>
                <button onClick={() => saveComp(true)} disabled={busy} className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">Confirm</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Open as support modal */}
      <AnimatePresence>
        {supportOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSupportOpen(false)} />
            <motion.div className={`${card} relative w-full max-w-sm p-6 shadow-xl`} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent">
                <LifeBuoy className="h-6 w-6" />
              </div>
              <h3 className="mb-1 text-center text-lg font-semibold text-gray-900">Open as support</h3>
              <p className="mb-4 text-center text-sm text-gray-500">
                You'll enter <strong className="text-gray-800">{org.name}</strong> as their admin for 1 hour. Every action is audited.
              </p>
              <label className={labelCls}>Reason (optional)</label>
              <input value={supportReason} onChange={(e) => setSupportReason(e.target.value)} className={`${inputCls} mb-4`} placeholder="e.g. Investigating a payment issue" autoFocus />
              <div className="flex gap-3">
                <button onClick={() => setSupportOpen(false)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10">Cancel</button>
                <button onClick={openSupport} disabled={busy} className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
                  {busy ? "Starting…" : "Start session"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Override modal */}
      <AnimatePresence>
        {overrideOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOverrideOpen(false)} />
            <motion.div className={`${card} relative w-full max-w-md p-6 shadow-xl`} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Custom limits</h3>
                  <p className="text-xs text-gray-400">Overrides this tenant's plan limits. Blank = unlimited.</p>
                </div>
                <button onClick={() => setOverrideOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Campaigns</label>
                    <input type="number" min="0" value={overrideForm.campaigns} onChange={(e) => setOverrideForm((f) => ({ ...f, campaigns: e.target.value }))} className={inputCls} placeholder="Unlimited" />
                  </div>
                  <div>
                    <label className={labelCls}>Volunteers</label>
                    <input type="number" min="0" value={overrideForm.volunteers} onChange={(e) => setOverrideForm((f) => ({ ...f, volunteers: e.target.value }))} className={inputCls} placeholder="Unlimited" />
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={overrideForm.volunteerEnabled} onChange={(e) => setOverrideForm((f) => ({ ...f, volunteerEnabled: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                  Volunteer module enabled
                </label>
                <div>
                  <label className={labelCls}>Reason (required)</label>
                  <input value={overrideForm.reason} onChange={(e) => setOverrideForm((f) => ({ ...f, reason: e.target.value }))} className={inputCls} placeholder="e.g. Negotiated enterprise deal" />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setOverrideOpen(false)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10">Cancel</button>
                <button onClick={saveOverride} disabled={busy} className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">Save override</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
