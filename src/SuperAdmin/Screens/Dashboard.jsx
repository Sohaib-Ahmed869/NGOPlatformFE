import { useState, useEffect, useCallback } from "react";
import { motion, MotionConfig } from "framer-motion";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  Building2, CreditCard, TrendingUp, DollarSign, Users, Layers, Calendar,
  Megaphone, HeartHandshake, ArrowUpRight, ArrowDownRight, Wallet,
  RefreshCw, Loader2,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import { useSARealtime } from "../context/SARealtimeContext";
import SALoader from "../SALoader";
import SAErrorState from "../components/SAErrorState";
import AnimatedNumber from "../components/AnimatedNumber";
import { cn } from "../../utils/cn";

const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";
const planColors = { basic: "#06b6d4", professional: "#10b981", enterprise: "#f59e0b" };

const orgLogo = (org) => org?.branding?.iconLogoDark || org?.branding?.iconLogo || org?.branding?.logoDark || org?.branding?.logo || "";
// These double as count-up formatters, so they're handed the interpolated
// (fractional) value mid-animation — round before rendering or a tile flickers
// through "$3,999.4" and "8.7 accounts" on its way to the real figure.
const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`;
const moneyShort = (n) => {
  const v = Math.round(Number(n) || 0);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(v % 1_000 ? 1 : 0)}k`;
  return `$${v.toLocaleString()}`;
};
const compact = (n) => {
  const v = Math.round(Number(n) || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toLocaleString();
};

const statusBadge = (s) => {
  const v = String(s || "").toLowerCase();
  if (v === "active") return "bg-emerald-50 text-emerald-700";
  if (v === "pending") return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
};

function HeaderStat({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${color}1a`, color }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none text-gray-900 dark:text-white">{value}</p>
        <p className="mt-1 text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

/* Compact footprint cell — cross-tenant aggregate. */
function Footprint({ icon: Icon, value, label, sub, color }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${color}1a`, color }}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none text-gray-900 dark:text-white">{value}</p>
        <p className="mt-1 text-[11px] leading-tight text-gray-500 dark:text-white/60">{label}</p>
        {sub ? <p className="text-[10px] leading-tight text-gray-400">{sub}</p> : null}
      </div>
    </div>
  );
}

export default function SADashboard() {
  // Paint from the session cache so a revisit is instant — the full-screen
  // loader now only appears on the very first, uncached open.
  const cached = superadminService.getDashboardCached();
  const [stats, setStats] = useState(cached?.data || null);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // Every figure here is derived from organisations, plans or invoices, so all
  // three have to trigger a revalidation. It watched only `orgsVersion`, which
  // meant a plan reprice or an incoming Stripe invoice webhook left a mounted
  // dashboard showing stale MRR and lifetime-collected totals.
  const { orgsVersion, plansVersion, invoicesVersion } = useSARealtime();

  useEffect(() => {
    let alive = true;
    // The version bumps arrive AFTER the service has already dropped the cache,
    // so an ordinary (non-forced) call refetches; the manual button forces it.
    const isRefresh = !!superadminService.getDashboardCached() || refreshKey > 0;
    if (isRefresh) setRefreshing(true);
    (async () => {
      try {
        const res = await superadminService.getDashboardStats({ force: refreshKey > 0 });
        if (!alive) return;
        setStats(res.data);
        setError(null);
      } catch (err) {
        if (!alive) return;
        console.error("Failed to fetch dashboard stats:", err);
        // Without this the screen rendered a dashboard of ZEROS, which reads
        // as "the platform has no tenants" rather than "the request failed".
        setError(err?.response?.data?.error || "Couldn't load the dashboard.");
      } finally {
        if (alive) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshKey, orgsVersion, plansVersion, invoicesVersion]);

  const refresh = useCallback(() => {
    if (refreshing) return; // double-click would fire a second identical request
    setRefreshKey((k) => k + 1);
  }, [refreshing]);

  if (loading) return <SALoader label="Dashboard" />;
  // Keep showing the last good figures if a background refresh fails — only a
  // cold failure (nothing to show) takes over the screen.
  if (error && !stats) {
    return <SAErrorState message={error} onRetry={() => { setError(null); setLoading(true); setRefreshKey((k) => k + 1); }} />;
  }
  if (!stats) return <SAErrorState message="No dashboard data available." onRetry={refresh} />;

  const totalOrgs = stats?.totalOrganisations || 0;
  const activeSubs = stats?.activeSubscriptions || 0;
  const mrr = stats?.mrr || 0;
  const collected = stats?.collected || 0;
  const growthPct = stats?.growthPct || 0;
  const newThisMonth = stats?.newThisMonth || 0;
  const signupSeries = stats?.signupSeries || [];

  const plans = (stats?.plans?.length
    ? stats.plans
    : [
        { code: "basic", name: "Basic", count: 0, monthly: 0, color: planColors.basic },
        { code: "professional", name: "Professional", count: 0, monthly: 0, color: planColors.professional },
        { code: "enterprise", name: "Enterprise", count: 0, monthly: 0, color: planColors.enterprise },
      ]
  ).map((p) => ({ ...p, color: p.color || planColors[p.code] || "#10b981", revenue: (p.count || 0) * (p.monthly || 0) }));

  const donut = plans.filter((p) => p.count > 0);
  const donutTotal = donut.reduce((s, p) => s + p.count, 0);
  const revenuePlans = [...plans].sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = Math.max(1, ...revenuePlans.map((p) => p.revenue));

  // Count-ups rather than static text — this is the most number-dense screen in
  // the console and was the only one without them.
  const statTiles = [
    { label: "Tenants", value: <AnimatedNumber value={totalOrgs} />, icon: Building2, color: "#6366f1" },
    { label: "Active subscriptions", value: <AnimatedNumber value={activeSubs} />, icon: CreditCard, color: "#0ea5e9" },
    { label: "Monthly recurring", value: <AnimatedNumber value={mrr} format={money} />, icon: TrendingUp, color: "#10b981" },
    { label: "Lifetime collected", value: <AnimatedNumber value={collected} format={moneyShort} />, icon: Wallet, color: "#f59e0b" },
  ];

  const footprint = [
    { label: "Donations processed", value: <AnimatedNumber value={stats?.donationsTotal} format={moneyShort} />, sub: `${compact(stats?.donationsCount)} payments`, icon: HeartHandshake, color: "#10b981" },
    { label: "Accounts", value: <AnimatedNumber value={stats?.totalUsers} format={compact} />, icon: Users, color: "#6366f1" },
    { label: "Programs", value: <AnimatedNumber value={stats?.totalPrograms} format={compact} />, icon: Layers, color: "#0ea5e9" },
    { label: "Events", value: <AnimatedNumber value={stats?.totalEvents} format={compact} />, icon: Calendar, color: "#8b5cf6" },
    { label: "Campaigns", value: <AnimatedNumber value={stats?.totalCampaigns} format={compact} />, icon: Megaphone, color: "#f59e0b" },
  ];

  const up = growthPct >= 0;

  // One stagger container instead of hand-tuned per-card delays, so the cards
  // cascade in order however many there are.
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
  const rise = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } } };

  return (
    // MotionConfig honours the OS "reduce motion" preference for everything
    // inside — this screen was the last one in the console without it.
    <MotionConfig reducedMotion="user">
    <motion.div variants={stagger} initial="hidden" animate="show" className="[&_*]:!rounded-none">
      {/* Hero + KPI strip */}
      <motion.div variants={rise} className={`${card} mb-6 overflow-hidden`}>
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div aria-hidden className="pointer-events-none absolute bottom-4 right-12 h-10 w-24 opacity-[.20]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.95) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
          <div className="relative z-10 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Overview</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Platform dashboard</h1>
            <p className="mt-1 text-sm text-white/80">Subscription health and activity across every organisation.</p>
          </div>
          <div className="relative z-10 flex shrink-0 items-center gap-2">
            {/* A failed background refresh keeps the last good figures on
                screen, so say so here rather than silently showing stale data. */}
            {error ? (
              <span className="inline-flex items-center gap-1.5 bg-amber-400/20 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-100 ring-1 ring-amber-300/30" title={error}>
                Refresh failed
              </span>
            ) : null}
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              title="Refresh"
              className="inline-flex items-center gap-1.5 bg-white/15 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white ring-1 ring-white/20 transition hover:bg-white/25 disabled:opacity-60"
            >
              {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {refreshing ? "Syncing" : "Refresh"}
            </button>
            <span className="inline-flex items-center gap-2 bg-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-white ring-1 ring-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" style={{ boxShadow: "0 0 0 3px rgba(110,231,183,.3)" }} /> Live
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-white/10 sm:grid-cols-4 sm:divide-y-0">
          {statTiles.map((t) => <HeaderStat key={t.label} {...t} />)}
        </div>
      </motion.div>

      {/* Cross-tenant footprint */}
      <motion.div variants={rise} className={`${card} mb-6`}>
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3 dark:border-white/10">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Platform footprint · across all tenants</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-white/10 sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-5">
          {footprint.map((f) => <Footprint key={f.label} {...f} />)}
        </div>
      </motion.div>

      {/* Tenant growth + plan mix */}
      <motion.div variants={stagger} className="mb-6 grid items-start gap-5 lg:grid-cols-5">
        <motion.div variants={rise} className={`${card} p-6 lg:col-span-3`}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><TrendingUp className="h-4 w-4 text-gray-400" /> Tenant growth</h2>
              <p className="mt-0.5 text-xs text-gray-400">New organisations · last 12 months</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900 dark:text-white">+{newThisMonth}</p>
              <p className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold", up ? "text-emerald-600" : "text-amber-500")}>
                {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{Math.abs(growthPct)}% MoM
              </p>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signupSeries} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="saGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--tenant-accent, #047857)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--tenant-accent, #047857)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ stroke: "var(--tenant-accent, #047857)", strokeWidth: 1, strokeDasharray: "3 3" }}
                  formatter={(v) => [`${v} new`, "Signups"]}
                  contentStyle={{ borderRadius: 0, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="count" stroke="var(--tenant-accent, #047857)" strokeWidth={2} fill="url(#saGrowth)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={rise} className={`${card} p-6 lg:col-span-2`}>
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><Layers className="h-4 w-4 text-gray-400" /> Plan mix</h2>
          <p className="mb-4 text-xs text-gray-400">Active subscribers by plan</p>
          {donutTotal === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">No active subscriptions</p>
          ) : (
            <>
              <div className="relative h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donut} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={82} paddingAngle={donut.length > 1 ? 3 : 0} stroke="none">
                      {donut.map((p) => <Cell key={p.code} fill={p.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v}`, n]} contentStyle={{ borderRadius: 0, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeSubs}</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Active</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {donut.map((p) => (
                  <div key={p.code} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 capitalize text-gray-600 dark:text-white/70"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.name}</span>
                    <span className="font-mono text-gray-400">{p.count} · {Math.round((p.count / donutTotal) * 100)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* Revenue by plan + recent signups */}
      <motion.div variants={stagger} className="grid items-start gap-5 lg:grid-cols-5">
        <motion.div variants={rise} className={`${card} p-6 lg:col-span-2`}>
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><DollarSign className="h-4 w-4 text-gray-400" /> Revenue by plan</h2>
          <p className="mb-5 text-xs text-gray-400">Contribution to MRR ({money(mrr)})</p>
          <div className="space-y-4">
            {revenuePlans.map((p, i) => {
              const share = mrr ? Math.round((p.revenue / mrr) * 100) : 0;
              return (
                <div key={p.code}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} /><span className="truncate font-medium capitalize text-gray-800 dark:text-white/85">{p.name}</span></span>
                    <span className="shrink-0 font-semibold text-gray-900 dark:text-white">{money(p.revenue)} <span className="font-normal text-gray-400">({share}%)</span></span>
                  </div>
                  <div className="h-2.5 overflow-hidden bg-gray-100 dark:bg-white/10">
                    <motion.div className="h-full" style={{ background: p.color }} initial={{ width: 0 }} animate={{ width: `${Math.round((p.revenue / maxRevenue) * 100)}%` }} transition={{ delay: 0.3 + i * 0.08, duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div variants={rise} className={`${card} p-6 lg:col-span-3`}>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><Calendar className="h-4 w-4 text-gray-400" /> Recent signups</h2>
          {stats?.recentSignups?.length > 0 ? (
            <div className="-mx-2 divide-y divide-gray-100 dark:divide-white/10">
              {stats.recentSignups.map((org) => {
                const pc = planColors[org.plan] || "#10b981";
                return (
                  <div key={org._id} className="flex items-center justify-between gap-3 px-2 py-2.5 transition-colors hover:bg-gray-50/70 dark:hover:bg-white/5">
                    <div className="flex min-w-0 items-center gap-3">
                      {orgLogo(org) ? (
                        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden"><img src={orgLogo(org)} alt={org.name || ""} className="h-full w-full object-contain" /></span>
                      ) : (
                        <span className="grid h-9 w-9 shrink-0 place-items-center text-xs font-bold uppercase text-on-accent" style={{ background: "linear-gradient(135deg, var(--tenant-accent, #10b981), var(--tenant-accent-light, #34d399))" }}>{org.name?.charAt(0)}</span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{org.name}</p>
                        <p className="truncate font-mono text-[11px] text-gray-400">{org.adminUserId?.email || org.slug}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-medium capitalize ${statusBadge(org.subscriptionStatus)}`}>{org.subscriptionStatus}</span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: `${pc}14`, color: pc }}>{org.plan}</span>
                      <span className="hidden font-mono text-[10px] text-gray-400 sm:inline">{new Date(org.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No signups yet</p>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
    </MotionConfig>
  );
}
