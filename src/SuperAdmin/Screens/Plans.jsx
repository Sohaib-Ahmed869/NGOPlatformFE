import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  Layers,
  Plus,
  Check,
  Archive,
  AlertTriangle,
  Users,
  CloudOff,
  RefreshCw,
  DollarSign,
  Activity,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import { useSARealtime } from "../context/SARealtimeContext";
import SALoader from "../SALoader";
import toast from "react-hot-toast";

import AnimatedNumber from "../components/AnimatedNumber";
const card = "border border-gray-100 bg-white shadow-sm";
const ACCENT = "var(--tenant-accent, #047857)";
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

/* Entrance choreography — the grid staggers its plan cards in. */
const gridVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.2, 0.7, 0.2, 1] } },
};

export default function Plans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revalidating, setRevalidating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [cycle, setCycle] = useState("monthly"); // "monthly" | "annual"
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [resyncing, setResyncing] = useState(null);
  // Realtime nudge — bumps when the plan catalogue changes anywhere (another
  // operator, a bulk entitlements save). Caches are already cleared by then.
  const { plansVersion } = useSARealtime();

  // Cache-first fetch: the plan catalogue is session-cached in the service, so
  // revisiting this screen costs NO request. Mutations (here or elsewhere) and
  // realtime events clear the cache, and a refresh with data already on screen
  // revalidates silently instead of flashing the loader.
  const loadedOnceRef = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    (async () => {
      if (loadedOnceRef.current) setRevalidating(true);
      else setLoading(true);
      try {
        const res = await superadminService.getPlansCached();
        if (!alive) return;
        setPlans(res.data.plans || []);
        setStripeEnabled(res.data.stripeEnabled !== false);
        setError(null);
        loadedOnceRef.current = true;
      } catch (err) {
        if (!alive || axios.isCancel(err)) return;
        console.error("Failed to fetch plans:", err);
        const msg = err?.response?.data?.error || "Couldn't load plans. Please try again.";
        // Never fall through to the "No plans yet" empty state on a failed
        // load — that reads as "create your first plan" and invites duplicates.
        if (loadedOnceRef.current) toast.error(msg);
        else setError(msg);
      } finally {
        if (alive) {
          setLoading(false);
          setRevalidating(false);
        }
      }
    })();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [refreshKey, plansVersion]);

  const refresh = () => setRefreshKey((k) => k + 1);
  // Manual refresh — drop the cached catalogue, then revalidate.
  const hardRefresh = () => {
    superadminService.invalidatePlansCache();
    refresh();
  };

  const handleArchive = async () => {
    if (!archiveTarget || archiving) return;
    setArchiving(true);
    try {
      // This modal IS the confirmation the API asks for when tenants are still
      // on the plan; without the flag it answers 409.
      await superadminService.archivePlan(archiveTarget.code, { confirm: true });
      toast.success("Plan archived");
      setArchiveTarget(null);
      refresh(); // the service already dropped the cache
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to archive plan");
    } finally {
      setArchiving(false);
    }
  };

  const handleResync = async (code) => {
    if (resyncing) return;
    setResyncing(code);
    try {
      await superadminService.resyncPlan(code);
      toast.success("Synced to Stripe");
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to sync with Stripe");
    } finally {
      setResyncing(null);
    }
  };

  const plansCurrency = (plans[0]?.currency || "aud").toUpperCase();

  // KPI roll-up across plans. Subscribers/MRR count archived plans too — their
  // existing tenants keep paying — while "Active plans" counts live ones only.
  // `synced` follows the displayed cycle so it can't disagree with the cards.
  const stats = useMemo(() => {
    const live = plans.filter((p) => !p.archivedAt);
    const subscribers = plans.reduce((s, p) => s + (p.subscribers?.total || 0), 0);
    const mrr = plans.reduce((s, p) => s + (p.price?.monthly || 0) * (p.subscribers?.total || 0), 0);
    const synced = live.filter((p) => p.stripePriceIds?.[cycle]).length;
    return { plans: live.length, subscribers, mrr, synced, total: live.length };
  }, [plans, cycle]);

  const cycleBtn = (val, label) => (
    <button
      type="button"
      onClick={() => setCycle(val)}
      className={`relative px-3 py-1.5 text-xs font-medium transition-colors ${cycle === val ? "text-gray-900" : "text-white/80 hover:bg-white/15"}`}
    >
      {cycle === val && (
        <motion.span
          layoutId="saPlansCyclePill"
          className="absolute inset-0 bg-white"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <span className="relative z-[1]">{label}</span>
    </button>
  );

  return (
    // MotionConfig honours the OS "reduce motion" preference for everything inside.
    <MotionConfig reducedMotion="user">
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
              {/* Manual refresh — bypasses the session cache */}
              <button
                type="button"
                title="Refresh"
                aria-label="Refresh"
                onClick={hardRefresh}
                disabled={loading || revalidating}
                className="grid h-9 w-9 shrink-0 place-items-center text-white ring-1 ring-white/30 transition-colors hover:bg-white/10 disabled:opacity-60"
                style={{ background: "rgba(255,255,255,.12)" }}
              >
                <RefreshCw className={`h-4 w-4 ${revalidating ? "animate-spin" : ""}`} />
              </button>
              <button type="button" onClick={() => navigate("/plans/new")} className="inline-flex items-center gap-1.5 bg-white px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-white/90" style={{ color: ACCENT }}>
                <Plus className="h-4 w-4" /> New Plan
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0">
          {[
            { icon: Layers, label: "Active plans", value: <AnimatedNumber value={stats.plans} />, color: "#6366f1" },
            { icon: Users, label: "Subscribers", value: <AnimatedNumber value={stats.subscribers} />, color: "#10b981" },
            { icon: DollarSign, label: "Est. MRR", value: money(stats.mrr, plansCurrency), color: "#f59e0b" },
            { icon: Activity, label: "Synced", value: <AnimatedNumber value={stats.synced} suffix={`/${stats.total}`} />, color: "#06b6d4" },
          ].map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.06, duration: 0.4, ease: "easeOut" }}
            >
              <HeaderStat icon={t.icon} label={t.label} value={t.value} color={t.color} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {!stripeEnabled && (
        <div className="mb-5 flex items-center gap-2 border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          <CloudOff className="h-4 w-4 shrink-0" /> Stripe is not configured — plans are saved but not synced to Stripe.
        </div>
      )}

      <AnimatePresence mode="wait">
      {loading ? (
        <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <SALoader />
        </motion.div>
      ) : error ? (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`${card} py-20 text-center`}
        >
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-300" />
          <p className="text-gray-600">{error}</p>
          <button
            type="button"
            onClick={hardRefresh}
            className="mt-4 inline-flex items-center gap-1.5 border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        </motion.div>
      ) : plans.length === 0 ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`${card} py-20 text-center`}
        >
          <motion.span
            className="inline-block"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.08 }}
          >
            <Layers className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          </motion.span>
          <p className="mb-4 text-gray-500">No plans yet</p>
          <button type="button" onClick={() => navigate("/plans/new")} className="inline-flex items-center gap-1.5 bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
            <Plus className="h-4 w-4" /> Create your first plan
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="grid"
          className="grid grid-cols-1 gap-5 pt-3 sm:grid-cols-2 lg:grid-cols-3"
          variants={gridVariants}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
        >
          {plans.map((p) => {
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
                layout
                variants={cardVariants}
                whileHover={{ y: -4 }}
                className={`${card} group relative flex h-full flex-col p-6 transition-shadow duration-300 hover:shadow-lg hover:shadow-black/5 ${p.archivedAt ? "opacity-60" : ""}`}
                style={popular ? { borderColor: color, boxShadow: `0 0 0 1px ${color}, 0 18px 44px -22px ${color}99` } : undefined}
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
        </motion.div>
      )}
      </AnimatePresence>

      {/* Archive confirm */}
      <AnimatePresence>
        {archiveTarget && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !archiving && setArchiveTarget(null)} />
            <motion.div
              className={`${card} relative w-full max-w-sm p-6 shadow-xl`}
              initial={{ scale: 0.92, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 16, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.08 }}
                className="mx-auto mb-4 grid h-12 w-12 place-items-center bg-red-50 ring-1 ring-red-100"
              >
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </motion.div>
              <h3 className="mb-1 text-center text-lg font-semibold text-gray-900">Archive Plan</h3>
              <p className="mb-6 text-center text-sm text-gray-500">
                Archive <strong className="text-gray-800">{archiveTarget.name}</strong>? It will be hidden from signup.
                {archiveTarget.subscribers?.active > 0 ? (
                  // "existing subscribers are unaffected" was not true: archiving
                  // deactivates the plan's Stripe prices, so a tenant left on it
                  // has nothing to renew against.
                  <>
                    {" "}
                    <strong className="text-red-600">
                      {archiveTarget.subscribers.active} active tenant
                      {archiveTarget.subscribers.active === 1 ? " is" : "s are"} still on it
                    </strong>{" "}
                    — their Stripe prices are deactivated too, so move them to another plan first unless you mean to
                    end their billing.
                  </>
                ) : (
                  " No tenants are currently on this plan."
                )}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={archiving}
                  onClick={() => setArchiveTarget(null)}
                  className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={archiving}
                  onClick={handleArchive}
                  className="flex-1 bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                >
                  {archiving ? "Archiving…" : "Archive"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
