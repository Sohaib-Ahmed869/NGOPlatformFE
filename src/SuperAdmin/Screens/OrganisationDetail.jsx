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
  User as UserIcon,
  Layers,
  DollarSign,
  Users,
  Megaphone,
  Palette,
  Moon,
  Building2,
  AlertTriangle,
  Link2,
  Copy,
  RefreshCw,
  ShieldCheck,
  HeartHandshake,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SALoader from "../SALoader";
import { useConfirm } from "../components/ConfirmProvider";
import toast from "react-hot-toast";
import { cn } from "../../utils/cn";

const card = "border border-gray-100 bg-white shadow-sm";
const inputCls =
  "w-full border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5";
const labelCls = "mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400";

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  past_due: "bg-red-50 text-red-700 ring-1 ring-red-200",
  cancelled: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};
const statusDot = { active: "#10b981", pending: "#f59e0b", past_due: "#ef4444", cancelled: "#9ca3af" };
const reqStatusStyles = {
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-1 ring-red-200",
};
const sessionStatusStyles = {
  active: "bg-emerald-50 text-emerald-700",
  ended: "bg-gray-100 text-gray-600",
  revoked: "bg-red-50 text-red-700",
  expired: "bg-amber-50 text-amber-700",
};

const HERO_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";
const ACCENT = "var(--tenant-accent, #047857)";
const accentTint = (a) => `rgba(var(--tenant-accent-rgb, 4, 120, 87), ${a})`;

const orgLogo = (org) =>
  org?.branding?.iconLogoDark || org?.branding?.iconLogo || org?.branding?.logoDark || org?.branding?.logo || "";

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

function CardHead({ icon: Icon, title, right }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2.5 text-sm font-semibold text-gray-900">
        <span className="grid h-8 w-8 shrink-0 place-items-center" style={{ background: accentTint(0.12), color: ACCENT }}>
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h2>
      {right}
    </div>
  );
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      <span className="text-gray-400">{label}</span>
      <span className="min-w-0 truncate font-medium text-gray-700">{value}</span>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center" style={{ background: accentTint(0.12), color: ACCENT }}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      </div>
      <p className="mt-2 truncate text-lg font-bold capitalize text-gray-900">{value}</p>
      {sub != null && <p className="truncate text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

// Compact, colour-coded snapshot cell (icon-left, value-right).
function SnapshotCell({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 p-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center" style={{ background: `${color}1a`, color }}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="truncate text-lg font-bold leading-tight text-gray-900">{value}</p>
        {sub ? <p className="truncate text-[10px] text-gray-400">{sub}</p> : null}
      </div>
    </div>
  );
}

// Usage vs plan limit, with the bar tinting amber/red as it nears the cap.
function UsageBar({ label, used, limit }) {
  const unlimited = limit === null || limit === undefined || !Number.isFinite(limit);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const barColor = unlimited ? ACCENT : pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : ACCENT;
  return (
    <div className="py-2.5">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-800">
          {used} <span className="text-gray-400">/ {unlimited ? "∞" : limit}</span>
        </span>
      </div>
      <div className="h-2 w-full bg-gray-100">
        <div className="h-full transition-all" style={{ width: unlimited ? "12%" : `${Math.max(pct, 3)}%`, background: barColor }} />
      </div>
    </div>
  );
}

const TABS = [
  { key: "overview", label: "Overview", desc: "Snapshot, branding & links", icon: Building2 },
  { key: "billing", label: "Billing & Plan", desc: "Plan, payments & comp", icon: CreditCard },
  { key: "limits", label: "Limits & Features", desc: "Usage, limits & features", icon: SlidersHorizontal },
  { key: "activity", label: "Activity", desc: "Audit & support sessions", icon: History },
  { key: "danger", label: "Danger Zone", desc: "Suspend & lifecycle", icon: AlertTriangle },
];

export default function OrganisationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("overview");
  const [plans, setPlans] = useState([]);

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ campaigns: "", volunteers: "", volunteerEnabled: false, reason: "" });
  const [compOpen, setCompOpen] = useState(false);
  const [compReason, setCompReason] = useState("");
  const [trialDate, setTrialDate] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportReason, setSupportReason] = useState("");
  const [supportMode, setSupportMode] = useState("admin"); // "admin" | "website"
  const [supportAccess, setSupportAccess] = useState("full"); // "full" | "view_only"

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

  // Dynamic plans for the Change-Plan picker.
  useEffect(() => {
    superadminService
      .getPlans()
      .then((res) => setPlans((res.data.plans || []).filter((p) => !p.archivedAt && p.isActive !== false)))
      .catch(() => {});
  }, []);

  if (loading) return <SALoader />;
  if (!data?.organisation) {
    return (
      <div className={`${card} py-20 text-center`}>
        <p className="mb-4 text-gray-500">Organisation not found</p>
        <button onClick={() => navigate("/organisations")} className="bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-light">
          Back to Organisations
        </button>
      </div>
    );
  }

  const org = data.organisation;
  const limits = data.effectiveLimits || {};
  const usage = data.usage || {};
  const stats = data.stats || {};
  const hasOverride = !!org.override?.limits || org.override?.pricing?.monthly != null;
  const logo = orgLogo(org);

  const cycle = org.billingCycle === "yearly" ? "yearly" : "monthly";
  const cycleLabel = cycle === "yearly" ? "year" : "month";
  const planPrice = data.plan?.price?.[cycle];
  const invoices = data.invoices || [];
  const brandingRequests = data.brandingRequests || [];
  const pendingReqCount = brandingRequests.filter((r) => r.status === "pending").length;
  const supportSessions = data.supportSessions || [];
  const lifetimePaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.amountPaid || i.amountDue || 0), 0);
  const invoiceCcy = (invoices[0]?.currency || "usd").toUpperCase();

  // Quick links — resolve the tenant subdomain from the current host.
  const tenantOrigin = (() => {
    const { protocol, host } = window.location;
    const parts = host.split(".");
    parts[0] = org.slug;
    return `${protocol}//${parts.join(".")}`;
  })();
  const copySlug = async () => {
    try {
      await navigator.clipboard.writeText(org.slug);
      toast.success("Slug copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

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

  // Suspending deactivates the tenant's portal + cancels their Stripe sub — confirm first.
  const confirmSuspend = async () => {
    const name = data?.organisation?.name || "this organisation";
    const ok = await confirm({
      title: "Suspend organisation",
      message: `Deactivates ${name}'s portal and cancels their Stripe subscription. They lose access immediately. You can reactivate them later.`,
      confirmText: "Suspend",
      tone: "danger",
      icon: Ban,
    });
    if (ok) setStatus("suspend");
  };

  const changePlan = async () => {
    if (!selectedPlan) return;
    setBusy(true);
    try {
      await superadminService.updateOrgPlan(id, selectedPlan);
      toast.success("Plan updated");
      setPlanOpen(false);
      load(); // refreshes plan, price, limits, usage — everything reflects the change
    } catch {
      toast.error("Failed to update plan");
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

  const chooseSupportMode = (mode) => {
    setSupportMode(mode);
    setSupportAccess(mode === "website" ? "view_only" : "full");
  };

  const openSupport = async () => {
    setBusy(true);
    try {
      const res = await superadminService.actAs(id, { reason: supportReason, mode: supportMode, access: supportAccess });
      const { token, slug } = res.data;
      const { protocol, host } = window.location;
      const parts = host.split(".");
      parts[0] = slug;
      const origin = `${protocol}//${parts.join(".")}`;
      window.location.href = `${origin}/support-handoff#token=${encodeURIComponent(token)}`;
    } catch {
      toast.error("Failed to start support session");
      setBusy(false);
    }
  };

  return (
    <div className="[&_*]:!rounded-none">
      <button
        onClick={() => navigate("/organisations")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Organisations
      </button>

      {/* Identity hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mb-5 overflow-hidden border border-gray-100 bg-white shadow-sm"
      >
        <div className="relative overflow-hidden px-6 py-7 sm:px-8" style={{ background: HERO_GRADIENT }}>
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div aria-hidden className="pointer-events-none absolute bottom-4 right-12 h-10 w-24 opacity-[.18]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.95) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {logo ? (
                <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden bg-white p-1.5 shadow-sm">
                  <img src={logo} alt={org.name} className="h-full w-full object-contain" />
                </span>
              ) : (
                <span className="grid h-16 w-16 shrink-0 place-items-center bg-white/15 text-2xl font-bold uppercase text-white ring-1 ring-white/25">
                  {org.name?.charAt(0)}
                </span>
              )}
              <div className="min-w-0">
                <p className="mb-0.5 flex items-center gap-1.5 font-mono text-[11px] text-white/70">
                  <Globe className="h-3 w-3" /> {org.slug}
                </p>
                <h1 className="truncate text-2xl font-bold text-white">{org.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold capitalize ${statusStyles[org.subscriptionStatus] || statusStyles.pending}`}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusDot[org.subscriptionStatus] || statusDot.pending }} />
                    {org.subscriptionStatus}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold capitalize text-white ring-1 ring-white/30" style={{ background: "rgba(255,255,255,.15)" }}>{org.plan}</span>
                  {!org.isActive && <span className="bg-red-500/90 px-2 py-0.5 text-[10px] font-medium text-white">Inactive</span>}
                  {org.isComp && <span className="bg-violet-500/90 px-2 py-0.5 text-[10px] font-medium text-white">Comped</span>}
                  {org.isMuslimCharity && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-white ring-1 ring-white/30" style={{ background: "rgba(255,255,255,.15)" }}><Moon className="h-3 w-3" /> Islamic</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => { setSupportReason(""); setSupportMode("admin"); setSupportAccess("full"); setSupportOpen(true); }} disabled={busy} className="inline-flex items-center gap-1.5 bg-white px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/90 disabled:opacity-50" style={{ color: ACCENT }}>
                <LifeBuoy className="h-4 w-4" /> Open as support
              </button>
              <a href={tenantOrigin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/30 transition-colors hover:bg-white/10" style={{ background: "rgba(255,255,255,.12)" }}>
                <ExternalLink className="h-4 w-4" /> Visit site
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 px-6 py-4 text-xs sm:px-8">
          <Fact icon={UserIcon} label="Owner" value={org.adminUserId?.email || "—"} />
          <Fact icon={CreditCard} label="Billing" value={<span className="capitalize">{cycle}</span>} />
          <Fact icon={Calendar} label="Created" value={fmtDate(org.createdAt)} />
        </div>
      </motion.div>

      {/* KPI stat row (always visible) */}
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile icon={Layers} label="Plan" value={data.plan?.name || org.plan} sub={planPrice != null ? `$${Number(planPrice).toLocaleString()}/${cycleLabel}` : `${cycle} billing`} />
        <StatTile icon={DollarSign} label="Lifetime paid" value={`$${lifetimePaid.toLocaleString()}`} sub={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"} · ${invoiceCcy}`} />
        <StatTile icon={Megaphone} label="Campaigns" value={`${usage.campaigns ?? 0} / ${fmtLimit(limits.campaigns)}`} sub={hasOverride ? "custom override" : "active / limit"} />
        <StatTile icon={Users} label="Volunteers" value={`${usage.volunteers ?? 0} / ${fmtLimit(limits.volunteers)}`} sub={limits.volunteerEnabled ? "module enabled" : "module off"} />
      </div>

      {/* Left-rail tabs + content (matches the Platform Settings layout) */}
      <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className={`${card} overflow-hidden lg:sticky lg:top-24`}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            const danger = t.key === "danger";
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn("relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors", active ? "text-white" : "text-gray-600 hover:bg-gray-50")}
              >
                {active ? (
                  <motion.span
                    layoutId="saOrgTab"
                    className="absolute inset-0 z-0"
                    style={{ background: danger ? "linear-gradient(135deg, #7f1d1d, #ef4444)" : "linear-gradient(135deg, var(--tenant-primary, #0f172a), var(--tenant-accent, #10b981))" }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  >
                    <span className="absolute inset-y-0 left-0 w-1" style={{ background: danger ? "#ef4444" : ACCENT }} aria-hidden="true" />
                  </motion.span>
                ) : null}
                <Icon className={cn("relative z-[1] h-[18px] w-[18px] shrink-0", active ? "text-white" : danger ? "text-red-400" : "text-gray-400")} />
                <span className="relative z-[1] min-w-0 flex-1">
                  <span className={cn("block text-sm font-semibold leading-tight", active ? "text-white" : danger ? "text-red-600" : "text-gray-700")}>{t.label}</span>
                  <span className={cn("block text-[11px] leading-tight", active ? "text-white/70" : "text-gray-400")}>{t.desc}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
      {/* ───────────── Overview ───────────── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {/* Snapshot */}
            <div className={`${card} p-6`}>
              <CardHead icon={Building2} title="Tenant snapshot" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <SnapshotCell icon={Users} color="#6366f1" label="Users" value={(stats.users ?? 0).toLocaleString()} />
                <SnapshotCell icon={DollarSign} color="#10b981" label="Donations raised" value={`$${Number(stats.donationsRaised || 0).toLocaleString()}`} sub={`${stats.orders ?? 0} orders`} />
                <SnapshotCell icon={Layers} color="#0ea5e9" label="Programs" value={(stats.programs ?? 0).toLocaleString()} />
                <SnapshotCell icon={Calendar} color="#f59e0b" label="Events" value={(stats.events ?? 0).toLocaleString()} />
                <SnapshotCell icon={Megaphone} color="#ec4899" label="Fundraisers" value={(stats.campaigns ?? 0).toLocaleString()} sub="P2P" />
                <SnapshotCell icon={HeartHandshake} color="#14b8a6" label="Volunteers" value={(stats.volunteers ?? 0).toLocaleString()} />
              </div>
            </div>

            {/* Branding */}
            <div className={`${card} p-6`}>
              <CardHead icon={Palette} title="Branding" />
              <div className="flex items-center gap-3">
                {logo ? (
                  <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden bg-gray-50 p-1">
                    <img src={logo} alt={org.name} className="h-full w-full object-contain" />
                  </span>
                ) : (
                  <span className="grid h-12 w-12 shrink-0 place-items-center bg-gray-50 text-gray-300"><Globe className="h-5 w-5" /></span>
                )}
                <div className="min-w-0 text-xs text-gray-500">
                  {logo ? "Logo uploaded" : "No logo uploaded"}
                  {org.branding?.siteTitle ? <p className="truncate text-gray-400">{org.branding.siteTitle}</p> : null}
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                {[
                  { label: "Primary", value: org.branding?.primaryColor },
                  { label: "Accent", value: org.branding?.accentColor },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="h-7 w-7 shrink-0 ring-1 ring-gray-200" style={{ background: s.value || "#e5e7eb" }} />
                    <div className="leading-tight">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</p>
                      <p className="font-mono text-[11px] text-gray-600">{s.value || "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Branding requests */}
            <div className={`${card} p-6`}>
              <CardHead
                icon={Palette}
                title={
                  <span className="inline-flex items-center gap-2">
                    Branding requests
                    {pendingReqCount > 0 && (
                      <span className="inline-flex items-center gap-1 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {pendingReqCount} pending
                      </span>
                    )}
                  </span>
                }
                right={brandingRequests.length ? <button onClick={() => navigate("/branding-requests")} className="text-xs font-medium" style={{ color: ACCENT }}>Review all</button> : null}
              />
              {brandingRequests.length ? (
                <ul className="space-y-2">
                  {brandingRequests.map((r) => (
                    <li key={r._id} className="flex items-center justify-between gap-3 border border-gray-100 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex shrink-0 gap-1">
                          <span className="h-6 w-6 ring-1 ring-gray-200" style={{ background: r.requestedBranding?.primaryColor || "#e5e7eb" }} />
                          <span className="h-6 w-6 ring-1 ring-gray-200" style={{ background: r.requestedBranding?.accentColor || "#e5e7eb" }} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-gray-800">{r.message || "Branding change request"}</p>
                          <p className="font-mono text-[10px] text-gray-400">{r.requestedBy?.email || "—"} · {fmtDate(r.createdAt)}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 text-[10px] font-medium capitalize ${reqStatusStyles[r.status] || reqStatusStyles.pending}`}>{r.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-sm text-gray-400">No branding requests</p>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Owner */}
            <div className={`${card} p-6`}>
              <CardHead icon={UserIcon} title="Owner" />
              <div className="flex items-center gap-3">
                {org.adminUserId?.profileImage ? (
                  <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden bg-gray-50">
                    <img src={org.adminUserId.profileImage} alt={org.adminUserId?.name || "Owner"} className="h-full w-full object-cover" />
                  </span>
                ) : (
                  <span className="grid h-11 w-11 shrink-0 place-items-center text-sm font-bold uppercase text-white" style={{ background: "linear-gradient(135deg, var(--tenant-accent, #10b981), var(--tenant-accent-light, #34d399))" }}>
                    {(org.adminUserId?.name || org.name)?.charAt(0)}
                  </span>
                )}
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

            {/* Quick links */}
            <div className={`${card} p-6`}>
              <CardHead icon={Link2} title="Quick links" />
              <div className="space-y-2">
                <a href={tenantOrigin} target="_blank" rel="noreferrer" className="flex items-center justify-between border border-gray-200 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                  <span className="inline-flex items-center gap-2"><Globe className="h-4 w-4 text-gray-400" /> Public website</span>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                </a>
                <a href={`${tenantOrigin}/admin/login`} target="_blank" rel="noreferrer" className="flex items-center justify-between border border-gray-200 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                  <span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-gray-400" /> Admin portal</span>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                </a>
                {org.adminUserId?.email && (
                  <a href={`mailto:${org.adminUserId.email}`} className="flex items-center justify-between border border-gray-200 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                    <span className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /> Email owner</span>
                  </a>
                )}
                <button onClick={copySlug} className="flex w-full items-center justify-between border border-gray-200 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                  <span className="inline-flex items-center gap-2"><Copy className="h-4 w-4 text-gray-400" /> Copy slug</span>
                  <span className="font-mono text-xs text-gray-400">{org.slug}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────── Billing & Plan ───────────── */}
      {tab === "billing" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {/* Subscription */}
            <div className={`${card} p-6`}>
              <CardHead
                icon={CreditCard}
                title="Subscription"
                right={
                  <button onClick={() => { setSelectedPlan(org.plan); setPlanOpen(true); }} className="inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80" style={{ borderColor: accentTint(0.3), backgroundColor: accentTint(0.1), color: ACCENT }}>
                    <RefreshCw className="h-3.5 w-3.5" /> Change plan
                  </button>
                }
              />
              <div className="relative mb-4 flex items-center justify-between gap-3 overflow-hidden py-3 pl-4 pr-3" style={{ background: accentTint(0.08) }}>
                <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: ACCENT }} />
                <div className="min-w-0">
                  <p className="truncate text-base font-bold capitalize leading-tight text-gray-900">{data.plan?.name || org.plan}</p>
                  {planPrice != null && (
                    <p className="mt-0.5 text-xs font-semibold" style={{ color: ACCENT }}>${Number(planPrice).toLocaleString()}<span className="font-medium text-gray-400"> / {cycleLabel}</span></p>
                  )}
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center" style={{ background: accentTint(0.16), color: ACCENT }}><Layers className="h-5 w-5" /></span>
              </div>
              <div className="divide-y divide-gray-50">
                <InfoRow label="Billing cycle" value={<span className="capitalize">{cycle}</span>} />
                <InfoRow label="Status" value={<span className="capitalize">{org.subscriptionStatus}</span>} />
                <InfoRow label="Stripe subscription" value={org.stripeSubscriptionId ? "Connected" : "—"} />
                <InfoRow label="Comped" value={org.isComp ? `Yes — ${org.compReason || "no reason"}` : "No"} />
              </div>
            </div>

            {/* Recent payments */}
            <div className={`${card} p-6`}>
              <CardHead icon={Receipt} title="Recent payments" />
              {invoices.length ? (
                <div className="space-y-1">
                  {invoices.map((inv) => (
                    <div key={inv._id} className="flex items-center justify-between px-2 py-2 transition-colors hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">${Number(inv.amountPaid || inv.amountDue || 0).toLocaleString()} {(inv.currency || "usd").toUpperCase()}</p>
                        <p className="font-mono text-[10px] text-gray-400">{inv.number || inv.stripeInvoiceId?.slice(-8)} · {new Date(inv.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-medium capitalize ${inv.status === "paid" ? "bg-emerald-50 text-emerald-700" : inv.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{inv.status}</span>
                        {inv.hostedInvoiceUrl && <a href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-accent"><ExternalLink className="h-3.5 w-3.5" /></a>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-gray-400">No payments yet</p>
              )}
            </div>
          </div>

          {/* Right column: comp + trial */}
          <div className="space-y-4">
            <div className={`${card} p-6`}>
              <CardHead icon={Gift} title="Comp" />
              <p className="-mt-2 mb-4 text-xs text-gray-400">Give this tenant a free subscription.</p>
              {org.isComp ? (
                <button onClick={() => saveComp(false)} disabled={busy} className="w-full border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10">Remove comp</button>
              ) : (
                <button onClick={() => { setCompReason(""); setCompOpen(true); }} className="w-full bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light">Mark as comped</button>
              )}
            </div>

            <div className={`${card} p-6`}>
              <CardHead icon={Clock} title="Trial" />
              <p className="-mt-2 mb-3 text-xs text-gray-400">Set or extend the trial end date.</p>
              <label className={labelCls}>Trial ends</label>
              <input type="date" value={trialDate} onChange={(e) => setTrialDate(e.target.value)} className={`${inputCls} mb-3`} />
              <button onClick={saveTrial} disabled={busy} className="w-full bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">Save trial</button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────── Limits & Features ───────────── */}
      {tab === "limits" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className={`${card} p-6`}>
              <CardHead
                icon={SlidersHorizontal}
                title="Usage vs limits"
                right={
                  <div className="flex items-center gap-2">
                    {hasOverride && <button onClick={clearOverride} disabled={busy} className="text-xs font-medium text-gray-400 hover:text-red-500 disabled:opacity-50">Clear override</button>}
                    <button onClick={openOverride} className="border px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80" style={{ borderColor: accentTint(0.3), backgroundColor: accentTint(0.1), color: ACCENT }}>{hasOverride ? "Edit override" : "Override"}</button>
                  </div>
                }
              />
              {hasOverride && (
                <p className="mb-3 border border-violet-100 bg-violet-50 px-3 py-2 text-xs text-violet-700">Custom override active{org.override?.reason ? ` — ${org.override.reason}` : ""}.</p>
              )}
              <div className="divide-y divide-gray-50">
                <UsageBar label="Active campaigns" used={usage.campaigns ?? 0} limit={limits.campaigns} />
                <UsageBar label="Volunteer applications" used={usage.volunteers ?? 0} limit={limits.volunteers} />
              </div>
            </div>

            <div className={`${card} p-6`}>
              <CardHead icon={CheckCircle2} title="Features" />
              <div className="divide-y divide-gray-50">
                <InfoRow label="Volunteer module" value={limits.volunteerEnabled ? <span className="text-emerald-600">Enabled</span> : <span className="text-gray-400">Disabled</span>} />
                <InfoRow label="Campaigns limit" value={fmtLimit(limits.campaigns)} />
                <InfoRow label="Volunteers limit" value={fmtLimit(limits.volunteers)} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`${card} p-6`}>
              <CardHead icon={Layers} title="Plan" />
              <p className="text-sm font-semibold capitalize text-gray-900">{data.plan?.name || org.plan}</p>
              {planPrice != null && <p className="text-xs text-gray-400">${Number(planPrice).toLocaleString()} / {cycleLabel}</p>}
              <button onClick={() => { setSelectedPlan(org.plan); setPlanOpen(true); }} className="mt-4 inline-flex w-full items-center justify-center gap-1.5 border py-2 text-sm font-medium transition-opacity hover:opacity-80" style={{ borderColor: accentTint(0.3), backgroundColor: accentTint(0.1), color: ACCENT }}>
                <RefreshCw className="h-4 w-4" /> Change plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────── Activity ───────────── */}
      {tab === "activity" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className={`${card} p-6`}>
            <CardHead icon={History} title="Operator activity" />
            {data.audit?.length ? (
              <ul className="space-y-3">
                {data.audit.map((a) => (
                  <li key={a._id} className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800">{a.action}</p>
                      <p className="font-mono text-[10px] text-gray-400">{a.actorEmail || "system"} · {new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-gray-400">No activity recorded yet</p>
            )}
          </div>

          <div className={`${card} p-6`}>
            <CardHead
              icon={ShieldCheck}
              title="Support sessions"
              right={supportSessions.length ? <button onClick={() => navigate("/support-sessions")} className="text-xs font-medium" style={{ color: ACCENT }}>All</button> : null}
            />
            {supportSessions.length ? (
              <ul className="space-y-2">
                {supportSessions.map((s) => (
                  <li key={s.sessionId}>
                    <button onClick={() => navigate(`/support-sessions/${s.sessionId}`)} className="flex w-full items-center justify-between gap-2 border border-gray-100 px-3 py-2.5 text-left transition-colors hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-gray-800">{s.mode} · {s.access === "view_only" ? "view-only" : "full"}</p>
                        <p className="font-mono text-[10px] text-gray-400">{s.impersonatorEmail || "—"} · {new Date(s.startedAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 text-[10px] font-medium capitalize ${sessionStatusStyles[s.status] || ""}`}>{s.status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-gray-400">No support sessions yet</p>
            )}
          </div>
        </div>
      )}

      {/* ───────────── Danger Zone ───────────── */}
      {tab === "danger" && (
        <div className={`${card} max-w-2xl border-red-200 p-6`}>
          <h2 className="flex items-center gap-2.5 text-sm font-semibold text-red-700">
            <span className="grid h-8 w-8 shrink-0 place-items-center bg-red-50 text-red-600"><AlertTriangle className="h-4 w-4" /></span>
            Danger zone
          </h2>
          <div className="mt-4 flex items-center justify-between gap-4 border border-red-100 bg-red-50/50 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{org.isActive ? "Suspend organisation" : "Reactivate organisation"}</p>
              <p className="text-xs text-gray-500">{org.isActive ? "Deactivates their portal and cancels the Stripe subscription." : "Restores access and sets the subscription active."}</p>
            </div>
            {org.isActive ? (
              <button onClick={confirmSuspend} disabled={busy} className="inline-flex shrink-0 items-center gap-1.5 bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"><Ban className="h-4 w-4" /> Suspend</button>
            ) : (
              <button onClick={() => setStatus("reactivate")} disabled={busy} className="inline-flex shrink-0 items-center gap-1.5 bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Reactivate</button>
            )}
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Change plan modal */}
      <AnimatePresence>
        {planOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPlanOpen(false)} />
            <motion.div className={`${card} relative w-full max-w-sm p-6 shadow-xl`} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <h3 className="mb-1 text-lg font-semibold text-gray-900">Change plan</h3>
              <p className="mb-4 text-xs text-gray-400">Limits and pricing update immediately.</p>
              <label className={labelCls}>Plan</label>
              <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)} className={`${inputCls} mb-4`}>
                {(plans.length
                  ? plans.map((p) => ({ value: p.code, label: `${p.name} — $${Number(p.price?.monthly || 0).toLocaleString()}/mo` }))
                  : [
                      { value: "basic", label: "Basic" },
                      { value: "professional", label: "Professional" },
                      { value: "enterprise", label: "Enterprise" },
                    ]
                ).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <button onClick={() => setPlanOpen(false)} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10">Cancel</button>
                <button onClick={changePlan} disabled={busy} className="flex-1 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">Update</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <button onClick={() => setCompOpen(false)} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10">Cancel</button>
                <button onClick={() => saveComp(true)} disabled={busy} className="flex-1 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">Confirm</button>
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
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center" style={{ background: accentTint(0.12), color: ACCENT }}><LifeBuoy className="h-6 w-6" /></div>
              <h3 className="mb-1 text-center text-lg font-semibold text-gray-900">Open as support</h3>
              <p className="mb-4 text-center text-sm text-gray-500">Enter <strong className="text-gray-800">{org.name}</strong> for 1 hour. Every action is audited.</p>

              <label className={labelCls}>Surface</label>
              <div className="mb-4 grid grid-cols-2 gap-2">
                {[{ v: "admin", label: "Admin portal" }, { v: "website", label: "Public website" }].map((o) => (
                  <button key={o.v} type="button" onClick={() => chooseSupportMode(o.v)} className="border px-3 py-2 text-sm font-medium transition-colors" style={supportMode === o.v ? { borderColor: ACCENT, backgroundColor: accentTint(0.1), color: ACCENT } : { borderColor: "#e5e7eb", color: "#4b5563" }}>{o.label}</button>
                ))}
              </div>

              <label className={labelCls}>Access</label>
              <div className="mb-1 grid grid-cols-2 gap-2">
                {[{ v: "view_only", label: "View-only" }, { v: "full", label: "Full access" }].map((o) => (
                  <button key={o.v} type="button" onClick={() => setSupportAccess(o.v)} className="border px-3 py-2 text-sm font-medium transition-colors" style={supportAccess === o.v ? { borderColor: ACCENT, backgroundColor: accentTint(0.1), color: ACCENT } : { borderColor: "#e5e7eb", color: "#4b5563" }}>{o.label}</button>
                ))}
              </div>
              <p className="mb-4 text-xs text-gray-400">{supportAccess === "view_only" ? "You can look around but cannot change anything." : "Changes you make are real and recorded against you."}</p>

              <label className={labelCls}>Reason (optional)</label>
              <input value={supportReason} onChange={(e) => setSupportReason(e.target.value)} className={`${inputCls} mb-4`} placeholder="e.g. Investigating a payment issue" autoFocus />
              <div className="flex gap-3">
                <button onClick={() => setSupportOpen(false)} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10">Cancel</button>
                <button onClick={openSupport} disabled={busy} className="flex-1 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">{busy ? "Starting…" : "Start session"}</button>
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
                <button onClick={() => setOverrideOpen(false)} className="grid h-8 w-8 place-items-center text-gray-400 hover:bg-gray-50 hover:text-gray-700"><X className="h-4 w-4" /></button>
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
                  <input type="checkbox" checked={overrideForm.volunteerEnabled} onChange={(e) => setOverrideForm((f) => ({ ...f, volunteerEnabled: e.target.checked }))} className="h-4 w-4 border-gray-300 text-accent focus:ring-accent" />
                  Volunteer module enabled
                </label>
                <div>
                  <label className={labelCls}>Reason (required)</label>
                  <input value={overrideForm.reason} onChange={(e) => setOverrideForm((f) => ({ ...f, reason: e.target.value }))} className={inputCls} placeholder="e.g. Negotiated enterprise deal" />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setOverrideOpen(false)} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10">Cancel</button>
                <button onClick={saveOverride} disabled={busy} className="flex-1 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">Save override</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
