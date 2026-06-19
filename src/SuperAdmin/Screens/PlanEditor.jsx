import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Layers,
  DollarSign,
  Zap,
  SlidersHorizontal,
  Megaphone,
  Eye,
  Check,
  X,
  Plus,
  Lock,
  Moon,
  AlertTriangle,
  CloudOff,
  Settings,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SALoader from "../SALoader";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

const card = "border border-gray-100 bg-white shadow-sm";
const inputCls =
  "w-full border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5";
const labelCls = "mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400";
const ACCENT = "var(--tenant-accent, #047857)";
const accentTint = (a) => `rgba(var(--tenant-accent-rgb, 4, 120, 87), ${a})`;
const HERO_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";

const CCY_SYMBOL = { AUD: "A$", USD: "$", GBP: "£", EUR: "€", NZD: "NZ$", CAD: "C$" };
const money = (v, ccy) => {
  const c = (ccy || "aud").toUpperCase();
  const sym = CCY_SYMBOL[c] || "";
  return `${sym}${Number(v || 0).toLocaleString()}${sym ? "" : ` ${c}`}`;
};

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  currency: "aud",
  price: { monthly: "", annual: "" },
  limits: {},
  featureFlags: {},
  features: [],
  color: "#10b981",
  isPublic: true,
  isPopular: false,
  sortOrder: 0,
};

// Curated bullet suggestions for the pricing card (shown as quick-add chips,
// alongside ones derived from the plan's enabled capabilities).
const COMMON_BULLETS = [
  "Unlimited donations",
  "Custom branding & logo",
  "Custom domain",
  "Tax-deductible receipts",
  "Donor management & CRM",
  "Advanced analytics & reports",
  "Priority email support",
  "Dedicated account manager",
  "Remove platform branding",
  "Bring your own Stripe & email",
  "Data export",
];

const TABS = [
  { key: "basics", label: "Basics", desc: "Name, code & visibility", icon: Layers },
  { key: "pricing", label: "Pricing", desc: "Monthly & annual price", icon: DollarSign },
  { key: "capabilities", label: "Capabilities", desc: "Feature flags by area", icon: Zap },
  { key: "limits", label: "Limits & Quotas", desc: "Metered resource caps", icon: SlidersHorizontal },
  { key: "marketing", label: "Marketing", desc: "Pricing-card bullets", icon: Megaphone },
  { key: "review", label: "Review", desc: "Preview & save", icon: Eye },
];

// On/off switch (sharp, theme-coloured).
function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn("relative inline-flex h-5 w-9 shrink-0 items-center transition-colors", disabled && "cursor-not-allowed opacity-60")}
      style={{ background: checked ? ACCENT : "#d1d5db" }}
      aria-pressed={checked}
    >
      <span className={cn("inline-block h-4 w-4 transform bg-white transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}

// Live pricing-card preview (mirrors the public pricing card).
function PlanCardPreview({ form }) {
  const color = form.color || "#10b981";
  return (
    <div className="relative w-full max-w-[280px] overflow-hidden border border-gray-200 bg-white shadow-sm">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      <div className="p-5">
        <span className="grid h-10 w-10 place-items-center" style={{ background: `${color}1a`, color }}>
          <Layers className="h-5 w-5" />
        </span>
        <h3 className="mt-3 text-base font-bold text-gray-900">{form.name || "Plan name"}</h3>
        {form.description ? <p className="mt-0.5 text-xs text-gray-500">{form.description}</p> : null}
        <div className="mt-3">
          <span className="text-3xl font-extrabold text-gray-900">{money(form.price.monthly, form.currency)}</span>
          <span className="text-xs text-gray-400">/mo</span>
          {Number(form.price.annual) > 0 && (
            <p className="mt-0.5 font-mono text-[10px] text-gray-400">{money(form.price.annual, form.currency)}/yr</p>
          )}
        </div>
        {form.features.length > 0 && (
          <ul className="mt-4 space-y-1.5 border-t border-gray-100 pt-4">
            {form.features.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color }} /> {f}
              </li>
            ))}
          </ul>
        )}
        <button type="button" disabled className="mt-5 w-full py-2.5 text-sm font-semibold text-white" style={{ background: color }}>
          Choose {form.name || "plan"}
        </button>
      </div>
    </div>
  );
}

export default function PlanEditor() {
  const { code } = useParams();
  const navigate = useNavigate();
  const isEdit = !!code;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [tab, setTab] = useState("basics");
  const [form, setForm] = useState(EMPTY_FORM);
  const [catalog, setCatalog] = useState({ groups: [], features: [] });
  const [featureDraft, setFeatureDraft] = useState("");
  const [migrate, setMigrate] = useState(null); // { count }
  const [syncStatus, setSyncStatus] = useState(null); // { monthly, annual } booleans on edit
  // Editable suggestion library (persisted platform-wide).
  const [library, setLibrary] = useState([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [libDraft, setLibDraft] = useState("");
  const [libSaving, setLibSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cat, plansRes, bulletsRes] = await Promise.all([
          superadminService.getFeatureCatalog(),
          superadminService.getPlans(),
          superadminService.getPlanBullets(),
        ]);
        setCatalog(cat.data || { groups: [], features: [] });
        setStripeEnabled(plansRes.data.stripeEnabled !== false);
        setLibrary(bulletsRes.data.bullets?.length ? bulletsRes.data.bullets : COMMON_BULLETS);
        if (isEdit) {
          const p = (plansRes.data.plans || []).find((x) => x.code === code);
          if (!p) {
            toast.error("Plan not found");
            navigate("/plans");
            return;
          }
          setForm({
            code: p.code,
            name: p.name,
            description: p.description || "",
            currency: p.currency || "aud",
            price: { monthly: p.price?.monthly ?? "", annual: p.price?.annual ?? "" },
            limits: { ...(p.limits || {}) },
            featureFlags: { ...(p.featureFlags || {}) },
            features: Array.isArray(p.features) ? [...p.features] : [],
            color: p.color || "#10b981",
            isPublic: p.isPublic !== false,
            isPopular: !!p.isPopular,
            sortOrder: p.sortOrder || 0,
          });
          setSyncStatus({ monthly: !!p.stripePriceIds?.monthly, annual: !!p.stripePriceIds?.annual });
        }
      } catch {
        toast.error("Failed to load plan editor");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const flags = useMemo(() => catalog.features.filter((f) => f.type === "flag"), [catalog]);
  const meters = useMemo(() => catalog.features.filter((f) => f.type === "meter"), [catalog]);
  const flagsByGroup = useMemo(
    () => catalog.groups.map((g) => ({ ...g, items: flags.filter((f) => f.group === g.key) })).filter((g) => g.items.length),
    [catalog, flags],
  );

  const set = (path, value) =>
    setForm((f) => {
      const next = structuredClone(f);
      const keys = path.split(".");
      let ref = next;
      for (let i = 0; i < keys.length - 1; i++) ref = ref[keys[i]];
      ref[keys[keys.length - 1]] = value;
      return next;
    });

  const flagOn = (fl) => (fl.core ? true : !!form.featureFlags[fl.key]);
  const setFlag = (key, val) => setForm((f) => ({ ...f, featureFlags: { ...f.featureFlags, [key]: val } }));

  const isUnlimited = (key) => form.limits[key] === null;
  const setLimit = (key, raw) => setForm((f) => ({ ...f, limits: { ...f.limits, [key]: raw } }));
  const toggleUnlimited = (key, checked) => setForm((f) => ({ ...f, limits: { ...f.limits, [key]: checked ? null : "" } }));

  const addFeatureValue = (v) => {
    const val = String(v).trim();
    if (!val) return;
    setForm((f) => (f.features.some((x) => x.toLowerCase() === val.toLowerCase()) ? f : { ...f, features: [...f.features, val] }));
  };
  const addFeature = () => {
    addFeatureValue(featureDraft);
    setFeatureDraft("");
  };

  // Quick-add suggestions: enabled (non-core) capabilities first, then the
  // curated common list — minus anything already on the card.
  const bulletSuggestions = useMemo(() => {
    const fromFlags = flags.filter((f) => !f.core && !!form.featureFlags[f.key]).map((f) => f.label);
    const seen = new Set(form.features.map((x) => x.toLowerCase()));
    const out = [];
    [...fromFlags, ...library].forEach((b) => {
      const k = b.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(b);
      }
    });
    return out;
  }, [flags, form.featureFlags, form.features, library]);

  const addLibraryItem = () => {
    const v = libDraft.trim();
    if (!v) return;
    setLibrary((l) => (l.some((x) => x.toLowerCase() === v.toLowerCase()) ? l : [...l, v]));
    setLibDraft("");
  };
  const removeLibraryItem = (item) => setLibrary((l) => l.filter((x) => x !== item));
  const saveLibrary = async () => {
    setLibSaving(true);
    try {
      const res = await superadminService.updatePlanBullets(library);
      setLibrary(res.data.bullets || []);
      toast.success("Suggestions saved");
    } catch {
      toast.error("Failed to save suggestions");
    } finally {
      setLibSaving(false);
    }
  };
  const removeFeature = (i) => setForm((f) => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));

  const buildBody = () => {
    // limits: null → unlimited, "" / undefined → omit (keep default), else Number
    const limits = {};
    Object.entries(form.limits).forEach(([k, v]) => {
      if (v === null) limits[k] = null;
      else if (v !== "" && v !== undefined) limits[k] = Number(v);
    });
    return {
      code: form.code,
      name: form.name,
      description: form.description,
      price: { monthly: Number(form.price.monthly) || 0, annual: Number(form.price.annual) || 0 },
      limits,
      featureFlags: form.featureFlags,
      features: form.features,
      color: form.color,
      isPublic: form.isPublic,
      isPopular: form.isPopular,
      sortOrder: Number(form.sortOrder) || 0,
    };
  };

  const handleSave = async () => {
    if (!form.name.trim() || (!isEdit && !form.code.trim())) {
      toast.error("Name and code are required");
      setTab("basics");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const res = await superadminService.updatePlan(code, buildBody());
        if (res.data?.priceChanged && res.data?.subscribersAffected > 0) {
          setMigrate({ count: res.data.subscribersAffected });
          toast.success("Plan updated");
        } else {
          toast.success("Plan updated");
          navigate("/plans");
        }
      } else {
        await superadminService.createPlan(buildBody());
        toast.success("Plan created");
        navigate("/plans");
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const handleMigrate = async (doMigrate) => {
    if (doMigrate) {
      try {
        const res = await superadminService.migratePlanSubscribers(code);
        toast.success(`Migrated ${res.data?.migrated ?? 0} subscriber(s)`);
      } catch {
        toast.error("Migration failed");
      }
    }
    setMigrate(null);
    navigate("/plans");
  };

  if (loading) return <SALoader />;

  const enabledCount = flags.filter((f) => flagOn(f)).length;

  return (
    <div className="[&_*]:!rounded-none">
      <button onClick={() => navigate("/plans")} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800">
        <ArrowLeft className="h-4 w-4" /> Back to Plans
      </button>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className="mb-5 overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="relative overflow-hidden px-6 py-7 sm:px-8" style={{ background: HERO_GRADIENT }}>
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div className="relative flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center bg-white/15 text-white ring-1 ring-white/25"><Layers className="h-6 w-6" /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Billing · Plans</p>
              <h1 className="mt-0.5 text-2xl font-bold text-white">{isEdit ? `Edit ${form.name || "plan"}` : "New plan"}</h1>
              <p className="mt-1 text-sm text-white/80">{isEdit ? "Editing a price mints a new Stripe price; existing subscribers stay grandfathered until migrated." : "Creates a Stripe product + prices automatically."}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {!stripeEnabled && (
        <div className="mb-5 flex items-center gap-2 border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          <CloudOff className="h-4 w-4 shrink-0" /> Stripe is not configured — the plan is saved but not synced to Stripe.
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Left rail */}
        <nav className={`${card} overflow-hidden lg:sticky lg:top-24`}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} type="button" onClick={() => setTab(t.key)} className={cn("relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors", active ? "text-white" : "text-gray-600 hover:bg-gray-50")}>
                {active ? (
                  <motion.span layoutId="saPlanTab" className="absolute inset-0 z-0" style={{ background: "linear-gradient(135deg, var(--tenant-primary, #0f172a), var(--tenant-accent, #10b981))" }} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
                    <span className="absolute inset-y-0 left-0 w-1" style={{ background: ACCENT }} aria-hidden="true" />
                  </motion.span>
                ) : null}
                <Icon className={cn("relative z-[1] h-[18px] w-[18px] shrink-0", active ? "text-white" : "text-gray-400")} />
                <span className="relative z-[1] min-w-0 flex-1">
                  <span className={cn("block text-sm font-semibold leading-tight", active ? "text-white" : "text-gray-700")}>{t.label}</span>
                  <span className={cn("block text-[11px] leading-tight", active ? "text-white/70" : "text-gray-400")}>{t.desc}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="min-w-0 space-y-4">
          {/* Basics */}
          {tab === "basics" && (
            <div className={`${card} p-6`}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Name</label>
                  <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Professional" />
                </div>
                <div>
                  <label className={labelCls}>Code</label>
                  <input className={cn(inputCls, isEdit && "cursor-not-allowed opacity-60")} value={form.code} disabled={isEdit} onChange={(e) => set("code", e.target.value)} placeholder="professional" />
                </div>
              </div>
              <div className="mt-4">
                <label className={labelCls}>Description</label>
                <input className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Growing organisations that need more." />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Plan colour</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.color} onChange={(e) => set("color", e.target.value)} className="h-10 w-12 cursor-pointer border border-gray-200 bg-white p-1" />
                    <input className={inputCls} value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="#10b981" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Sort order</label>
                  <input type="number" className={inputCls} value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} placeholder="0" />
                </div>
              </div>
              <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.isPublic} onChange={(e) => set("isPublic", e.target.checked)} className="h-4 w-4 border-gray-300 text-accent focus:ring-accent" />
                Show on the public pricing page
              </label>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.isPopular} onChange={(e) => set("isPopular", e.target.checked)} className="h-4 w-4 border-gray-300 text-accent focus:ring-accent" />
                Highlight as “Most popular”
              </label>
            </div>
          )}

          {/* Pricing */}
          {tab === "pricing" && (
            <div className={`${card} p-6`}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Monthly ({(form.currency || "aud").toUpperCase()})</label>
                  <input type="number" min="0" className={inputCls} value={form.price.monthly} onChange={(e) => set("price.monthly", e.target.value)} placeholder="500" />
                </div>
                <div>
                  <label className={labelCls}>Annual ({(form.currency || "aud").toUpperCase()})</label>
                  <input type="number" min="0" className={inputCls} value={form.price.annual} onChange={(e) => set("price.annual", e.target.value)} placeholder="4800" />
                </div>
              </div>
              {isEdit && syncStatus && (
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {["monthly", "annual"].map((c) => (
                    <span key={c} className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 font-medium", syncStatus[c] ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                      {syncStatus[c] ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />} {c} {syncStatus[c] ? "synced" : "not synced"}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-4 border-l-2 px-3 py-2 text-xs text-gray-500" style={{ borderColor: accentTint(0.4), background: accentTint(0.05) }}>
                Changing a price mints a new Stripe price. Existing subscribers stay on the old price until you migrate them (you'll be prompted after saving).
              </p>
            </div>
          )}

          {/* Capabilities */}
          {tab === "capabilities" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1 text-xs text-gray-500">
                <span>Toggle the features this plan unlocks.</span>
                <span className="font-medium" style={{ color: ACCENT }}>{enabledCount} enabled</span>
              </div>
              {flagsByGroup.map((g) => (
                <div key={g.key} className={`${card} p-6`}>
                  <h3 className="text-sm font-semibold text-gray-900">{g.label}</h3>
                  {g.blurb ? <p className="mb-3 text-xs text-gray-400">{g.blurb}</p> : null}
                  <div className="divide-y divide-gray-50">
                    {g.items.map((fl) => (
                      <div key={fl.key} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                            {fl.label}
                            {fl.core && <span className="inline-flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-gray-500"><Lock className="h-2.5 w-2.5" /> Core</span>}
                            {fl.vertical === "muslim" && <span className="inline-flex items-center gap-1 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-violet-600"><Moon className="h-2.5 w-2.5" /> Islamic</span>}
                          </p>
                          {fl.description ? <p className="text-xs text-gray-400">{fl.description}</p> : null}
                        </div>
                        <Switch checked={flagOn(fl)} disabled={fl.core} onChange={(v) => setFlag(fl.key, v)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Limits */}
          {tab === "limits" && (
            <div className={`${card} p-6`}>
              <p className="mb-3 text-xs text-gray-400">Set a cap per resource, or mark it unlimited. Leave blank to use the catalog default.</p>
              <div className="divide-y divide-gray-50">
                {meters.map((m) => {
                  const unl = isUnlimited(m.key);
                  return (
                    <div key={m.key} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{m.label}</p>
                        {m.description ? <p className="text-xs text-gray-400">{m.description}</p> : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          disabled={unl}
                          value={unl ? "" : form.limits[m.key] ?? ""}
                          onChange={(e) => setLimit(m.key, e.target.value)}
                          placeholder="Default"
                          className={cn("w-24 border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none focus:border-accent", unl && "cursor-not-allowed opacity-50")}
                        />
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
                          <input type="checkbox" checked={unl} onChange={(e) => toggleUnlimited(m.key, e.target.checked)} className="h-3.5 w-3.5 border-gray-300 text-accent focus:ring-accent" />
                          ∞
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Marketing */}
          {tab === "marketing" && (
            <div className={`${card} p-6`}>
              <label className={labelCls}>Pricing-card bullets</label>
              <div className="flex gap-2">
                <input className={inputCls} value={featureDraft} onChange={(e) => setFeatureDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }} placeholder="Add a bullet and press Enter" />
                <button type="button" onClick={addFeature} className="shrink-0 border border-gray-200 px-3 text-sm text-gray-600 hover:bg-gray-50 dark:border-white/10">Add</button>
              </div>

              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Quick add</p>
                  <button type="button" onClick={() => setManageOpen((o) => !o)} className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: ACCENT }}>
                    <Settings className="h-3 w-3" /> {manageOpen ? "Done" : "Manage"}
                  </button>
                </div>
                {bulletSuggestions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {bulletSuggestions.map((b) => (
                      <button key={b} type="button" onClick={() => addFeatureValue(b)} className="inline-flex items-center gap-1 border px-2.5 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-50" style={{ borderColor: accentTint(0.3) }}>
                        <Plus className="h-3 w-3" style={{ color: ACCENT }} /> {b}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">All suggestions added.</p>
                )}

                {manageOpen && (
                  <div className="mt-3 border border-gray-100 bg-gray-50 p-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Suggestion library</p>
                    <div className="flex flex-wrap gap-1.5">
                      {library.length === 0 && <span className="text-xs text-gray-400">No suggestions in the library.</span>}
                      {library.map((item) => (
                        <span key={item} className="inline-flex items-center gap-1 border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600">
                          {item}
                          <button type="button" onClick={() => removeLibraryItem(item)} className="text-gray-400 hover:text-red-500"><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input className={inputCls} value={libDraft} onChange={(e) => setLibDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLibraryItem(); } }} placeholder="Add a suggestion to the library" />
                      <button type="button" onClick={addLibraryItem} className="shrink-0 border border-gray-200 px-3 text-sm text-gray-600 hover:bg-gray-50 dark:border-white/10">Add</button>
                    </div>
                    <button type="button" onClick={saveLibrary} disabled={libSaving} className="mt-3 bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
                      {libSaving ? "Saving…" : "Save suggestions"}
                    </button>
                  </div>
                )}
              </div>

              {form.features.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {form.features.map((f, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-2 border border-gray-100 px-3 py-2 text-sm text-gray-700">
                      <span className="flex items-center gap-2"><Check className="h-3.5 w-3.5" style={{ color: form.color }} /> {f}</span>
                      <button type="button" onClick={() => removeFeature(idx)} className="text-gray-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-xs text-gray-400">No bullets yet — type one above or pick from Quick add.</p>
              )}
            </div>
          )}

          {/* Review */}
          {tab === "review" && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className={`${card} p-6`}>
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Summary</h3>
                <div className="divide-y divide-gray-50 text-sm">
                  <div className="flex justify-between py-2"><span className="text-gray-500">Name</span><span className="font-medium text-gray-800">{form.name || "—"}</span></div>
                  <div className="flex justify-between py-2"><span className="text-gray-500">Code</span><span className="font-mono text-gray-800">{form.code || "—"}</span></div>
                  <div className="flex justify-between py-2"><span className="text-gray-500">Monthly</span><span className="font-medium text-gray-800">{money(form.price.monthly, form.currency)}</span></div>
                  <div className="flex justify-between py-2"><span className="text-gray-500">Annual</span><span className="font-medium text-gray-800">{money(form.price.annual, form.currency)}</span></div>
                  <div className="flex justify-between py-2"><span className="text-gray-500">Capabilities on</span><span className="font-medium text-gray-800">{enabledCount} of {flags.length}</span></div>
                  <div className="flex justify-between py-2"><span className="text-gray-500">Public</span><span className="font-medium text-gray-800">{form.isPublic ? "Yes" : "Hidden"}</span></div>
                </div>
              </div>
              <div>
                <p className={labelCls}>Live preview</p>
                <PlanCardPreview form={form} />
              </div>
            </div>
          )}

          {/* Sticky save bar */}
          <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-gray-100 bg-white/90 px-4 py-3 backdrop-blur">
            <button type="button" onClick={() => navigate("/plans")} className="border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create plan"}
            </button>
          </div>
        </div>
      </div>

      {/* Migrate prompt (after a price change on edit) */}
      <AnimatePresence>
        {migrate && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div className={`${card} relative w-full max-w-sm p-6 shadow-xl`} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center bg-amber-50 ring-1 ring-amber-100"><Zap className="h-6 w-6 text-amber-500" /></div>
              <h3 className="mb-1 text-center text-lg font-semibold text-gray-900">New Stripe price created</h3>
              <p className="mb-6 text-center text-sm text-gray-500"><strong className="text-gray-800">{migrate.count}</strong> active tenant{migrate.count === 1 ? "" : "s"} stay on the old price until migrated. Move them now?</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => handleMigrate(false)} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10">Keep grandfathered</button>
                <button type="button" onClick={() => handleMigrate(true)} className="flex-1 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light">Migrate {migrate.count}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
