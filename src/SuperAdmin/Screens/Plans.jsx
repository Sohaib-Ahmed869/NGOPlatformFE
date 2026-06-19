import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Plus,
  Check,
  Pencil,
  Archive,
  AlertTriangle,
  Users,
  CloudOff,
  RefreshCw,
  DollarSign,
  Activity,
  CheckCircle2,
  Megaphone,
  Zap,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SALoader from "../SALoader";
import toast from "react-hot-toast";

const card = "border border-gray-100 bg-white shadow-sm";
const ACCENT = "var(--tenant-accent, #047857)";
const accentTint = (a) => `rgba(var(--tenant-accent-rgb, 4, 120, 87), ${a})`;
const HERO_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";

const fmtLimit = (v) => (v === null || v === undefined ? "Unlimited" : v);
const CCY_SYMBOL = { AUD: "A$", USD: "$", GBP: "£", EUR: "€", NZD: "NZ$", CAD: "C$" };
const money = (v, ccy) => {
  const c = (ccy || "aud").toUpperCase();
  const sym = CCY_SYMBOL[c] || "";
  return `${sym}${Number(v || 0).toLocaleString()}${sym ? "" : ` ${c}`}`;
};

function HeaderStat({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center" style={{ background: `${color}1a`, color }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none text-gray-900">{value}</p>
        <p className="mt-1 text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export default function Plans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [cycle, setCycle] = useState("monthly"); // "monthly" | "annual"
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [resyncing, setResyncing] = useState(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await superadminService.getPlans();
      setPlans(res.data.plans || []);
      setStripeEnabled(res.data.stripeEnabled !== false);
    } catch (err) {
      console.error("Failed to fetch plans:", err);
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await superadminService.archivePlan(archiveTarget.code);
      toast.success("Plan archived");
      setArchiveTarget(null);
      fetchPlans();
    } catch {
      toast.error("Failed to archive plan");
    }
  };

  const handleResync = async (code) => {
    setResyncing(code);
    try {
      await superadminService.resyncPlan(code);
      toast.success("Synced to Stripe");
      fetchPlans();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to sync with Stripe");
    } finally {
      setResyncing(null);
    }
  };

  const plansCurrency = (plans[0]?.currency || "aud").toUpperCase();

  // KPI roll-up across plans.
  const stats = useMemo(() => {
    const live = plans.filter((p) => !p.archivedAt);
    const subscribers = plans.reduce((s, p) => s + (p.subscribers?.total || 0), 0);
    const mrr = plans.reduce((s, p) => s + (p.price?.monthly || 0) * (p.subscribers?.total || 0), 0);
    const synced = live.filter((p) => p.stripePriceIds?.monthly).length;
    return { plans: live.length, subscribers, mrr, synced, total: live.length };
  }, [plans]);

  const cycleBtn = (val, label) => (
    <button
      type="button"
      onClick={() => setCycle(val)}
      className={`px-3 py-1.5 text-xs font-medium transition-colors ${cycle === val ? "bg-white text-gray-900" : "text-white/80 hover:bg-white/15"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="[&_*]:!rounded-none">
      {/* Hero + KPI strip */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className="mb-6 overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="relative overflow-hidden px-6 py-7 sm:px-8" style={{ background: HERO_GRADIENT }}>
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Billing</p>
              <h1 className="mt-1 text-2xl font-bold text-white">Plans</h1>
              <p className="mt-1 text-sm text-white/80">Create and price the plans tenants subscribe to — synced to Stripe.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex overflow-hidden border border-white/25 bg-white/10">
                {cycleBtn("monthly", "Monthly")}
                {cycleBtn("annual", "Annual")}
              </div>
              <button type="button" onClick={() => navigate("/plans/new")} className="inline-flex items-center gap-1.5 bg-white px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-white/90" style={{ color: ACCENT }}>
                <Plus className="h-4 w-4" /> New Plan
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0">
          <HeaderStat icon={Layers} label="Active plans" value={stats.plans} color="#6366f1" />
          <HeaderStat icon={Users} label="Subscribers" value={stats.subscribers.toLocaleString()} color="#10b981" />
          <HeaderStat icon={DollarSign} label="Est. MRR" value={money(stats.mrr, plansCurrency)} color="#f59e0b" />
          <HeaderStat icon={Activity} label="Synced" value={`${stats.synced}/${stats.total}`} color="#06b6d4" />
        </div>
      </motion.div>

      {!stripeEnabled && (
        <div className="mb-5 flex items-center gap-2 border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          <CloudOff className="h-4 w-4 shrink-0" /> Stripe is not configured — plans are saved but not synced to Stripe.
        </div>
      )}

      {loading ? (
        <SALoader />
      ) : plans.length === 0 ? (
        <div className={`${card} py-20 text-center`}>
          <Layers className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="mb-4 text-gray-500">No plans yet</p>
          <button type="button" onClick={() => navigate("/plans/new")} className="inline-flex items-center gap-1.5 bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
            <Plus className="h-4 w-4" /> Create your first plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 pt-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p, i) => {
            const color = p.color || "#10b981";
            const amount = p.price?.[cycle] || 0;
            const otherCycle = cycle === "monthly" ? "annual" : "monthly";
            const synced = !!p.stripePriceIds?.[cycle];
            const enabledFlags = p.featureFlags ? Object.values(p.featureFlags).filter(Boolean).length : 0;
            const monthly = p.price?.monthly || 0;
            const annual = p.price?.annual || 0;
            const savings = monthly > 0 && annual > 0 && annual < monthly * 12 ? Math.round((1 - annual / (monthly * 12)) * 100) : 0;
            const popular = p.isPopular && !p.archivedAt;
            const featLines = p.features?.length
              ? p.features
              : [`${fmtLimit(p.limits?.campaigns)} campaigns`, `${fmtLimit(p.limits?.volunteers)} volunteers`, `${enabledFlags || "Default"} capabilities`];
            return (
              <motion.div
                key={p.code}
                className={`${card} group relative flex h-full flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 ${p.archivedAt ? "opacity-60" : ""}`}
                style={popular ? { borderColor: color, boxShadow: `0 0 0 1px ${color}, 0 18px 44px -22px ${color}99` } : undefined}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04, ease: [0.2, 0.7, 0.2, 1] }}
              >
                {/* Most-popular ribbon (straddles the top edge) */}
                {popular && (
                  <span className="absolute -top-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white" style={{ background: color, boxShadow: `0 8px 18px -6px ${color}cc` }}>
                    <Sparkles className="h-3 w-3" /> Most popular
                  </span>
                )}

                {/* Admin status badges (top-right) */}
                <div className="absolute right-4 top-4 flex flex-col items-end gap-1">
                  {p.archivedAt ? (
                    <span className="bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Archived</span>
                  ) : synced ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"><Check className="h-3 w-3" /> Synced</span>
                  ) : (
                    <span className="bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Not synced</span>
                  )}
                  {!p.isPublic && !p.archivedAt && <span className="bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Hidden</span>}
                </div>

                {/* Name + description */}
                <h3 className="pr-20 text-lg font-bold text-gray-900">{p.name}</h3>
                <p className="mt-1 min-h-[2.4em] pr-4 text-xs leading-relaxed text-gray-500">{p.description || p.code}</p>

                {/* Price */}
                <div className="mt-4 flex flex-wrap items-end gap-x-1.5 border-b border-gray-100 pb-5">
                  <span className="text-[40px] font-extrabold leading-none text-gray-900">{money(amount, p.currency)}</span>
                  <span className="mb-1 text-sm text-gray-400">/{cycle === "monthly" ? "month" : "year"}</span>
                  {savings > 0 && (
                    <span className="mb-1 ml-auto inline-flex items-center bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Save {savings}%</span>
                  )}
                  <p className="mt-1 w-full font-mono text-[10px] text-gray-400">{money(p.price?.[otherCycle], p.currency)}/{otherCycle === "monthly" ? "mo" : "yr"}</p>
                </div>

                {/* Feature checks */}
                <ul className="mt-5 flex-1 space-y-2.5">
                  {featLines.slice(0, 6).map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-[13px] text-gray-600">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center" style={{ background: `${color}1a` }}>
                        <Check className="h-3 w-3" strokeWidth={3} style={{ color }} />
                      </span>
                      {f}
                    </li>
                  ))}
                  {featLines.length > 6 && <li className="pl-6 text-[11px] text-gray-400">+{featLines.length - 6} more</li>}
                </ul>

                {!p.archivedAt && !synced && stripeEnabled && (
                  <button type="button" onClick={() => handleResync(p.code)} disabled={resyncing === p.code} className="mt-5 inline-flex w-full items-center justify-center gap-1.5 border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50">
                    <RefreshCw className={`h-3 w-3 ${resyncing === p.code ? "animate-spin" : ""}`} />
                    {resyncing === p.code ? "Syncing…" : "Sync to Stripe"}
                  </button>
                )}

                {/* CTA — Edit plan */}
                <button
                  type="button"
                  onClick={() => navigate(`/plans/${p.code}/edit`)}
                  className="group/btn mt-5 inline-flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={popular ? { background: color, color: "#fff" } : { background: `${color}12`, color, border: `1px solid ${color}33` }}
                >
                  Edit plan
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                </button>

                {/* Admin meta footer */}
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] text-gray-400">
                  <span className="inline-flex items-center gap-1 font-mono"><Users className="h-3 w-3" /> {p.subscribers?.total || 0} tenants</span>
                  {!p.archivedAt && (
                    <button type="button" onClick={() => setArchiveTarget(p)} className="inline-flex items-center gap-1 font-medium text-gray-400 transition-colors hover:text-red-500">
                      <Archive className="h-3 w-3" /> Archive
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Archive confirm */}
      <AnimatePresence>
        {archiveTarget && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setArchiveTarget(null)} />
            <motion.div className={`${card} relative w-full max-w-sm p-6 shadow-xl`} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center bg-red-50 ring-1 ring-red-100">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="mb-1 text-center text-lg font-semibold text-gray-900">Archive Plan</h3>
              <p className="mb-6 text-center text-sm text-gray-500">Archive <strong className="text-gray-800">{archiveTarget.name}</strong>? It will be hidden from signup; existing subscribers are unaffected.</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setArchiveTarget(null)} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10">Cancel</button>
                <button type="button" onClick={handleArchive} className="flex-1 bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700">Archive</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
