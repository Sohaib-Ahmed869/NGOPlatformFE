import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CreditCard, AlertTriangle, DollarSign, TrendingUp, Layers, Users, Wallet, Calendar } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SALoader from "../SALoader";
import { cn } from "../../utils/cn";

const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";
const planColors = { basic: "#06b6d4", professional: "#10b981", enterprise: "#f59e0b" };

// Best logo for a small tile (prefers the square mark) — empty → initial badge.
const orgLogo = (org) =>
  org?.branding?.iconLogoDark || org?.branding?.iconLogo || org?.branding?.logoDark || org?.branding?.logo || "";
const money = (n) => `$${Number(n || 0).toLocaleString()}`;
// Compact money for big figures: $50k, $1.2M.
const moneyShort = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(v % 1_000 ? 1 : 0)}k`;
  return `$${v.toLocaleString()}`;
};

/* Stat cell in the attached strip under the hero banner. */
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

export default function Billing() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await superadminService.getBillingStats();
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch billing stats:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <SALoader label="Billing" />;

  // Dynamic plan breakdown (falls back to the legacy tiers pre-seed).
  const planRowsRaw = stats?.plans?.length
    ? stats.plans
    : [
        { code: "basic", name: "Basic", count: stats?.byPlan?.basic || 0, monthly: 200, color: planColors.basic },
        { code: "professional", name: "Professional", count: stats?.byPlan?.professional || 0, monthly: 500, color: planColors.professional },
        { code: "enterprise", name: "Enterprise", count: stats?.byPlan?.enterprise || 0, monthly: 1000, color: planColors.enterprise },
      ];

  const plans = planRowsRaw.map((p) => ({
    code: p.code,
    label: p.name,
    price: p.monthly || 0,
    count: p.count || 0,
    color: p.color || planColors[p.code] || "#10b981",
    revenue: (p.count || 0) * (p.monthly || 0),
  }));

  const mrr = stats?.mrr ?? plans.reduce((s, p) => s + p.revenue, 0);
  const arr = mrr * 12;
  const activeSubs = stats?.activeSubscriptions || 0;
  const arpa = activeSubs ? Math.round(mrr / activeSubs) : 0;
  const failed = stats?.failedPayments || 0;
  const collected = stats?.collected || 0;

  // Revenue-by-plan, biggest contributor first.
  const revenuePlans = [...plans].sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = Math.max(1, ...revenuePlans.map((p) => p.revenue));
  // Donut data — only plans with subscribers.
  const donut = plans.filter((p) => p.count > 0);
  const totalSubsForDonut = donut.reduce((s, p) => s + p.count, 0);

  const statTiles = [
    { label: "Monthly recurring", value: money(mrr), icon: TrendingUp, color: "#10b981" },
    { label: "Annual run-rate", value: moneyShort(arr), icon: DollarSign, color: "#6366f1" },
    { label: "Active subscriptions", value: activeSubs.toLocaleString(), icon: CreditCard, color: "#0ea5e9" },
    { label: "Failed payments", value: failed.toLocaleString(), icon: AlertTriangle, color: failed > 0 ? "#ef4444" : "#10b981" },
  ];

  return (
    // Sharp-corner variant: square every descendant's corners — matches the rest.
    <div className="[&_*]:!rounded-none">
      {/* Hero — gradient banner + attached stat strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`${card} mb-6 overflow-hidden`}
      >
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div aria-hidden className="pointer-events-none absolute bottom-4 right-12 h-10 w-24 opacity-[.20]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.95) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
          <div className="relative z-10 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Revenue</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Billing overview</h1>
            <p className="mt-1 text-sm text-white/80">Subscription revenue and payment health across the platform.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-white/10 sm:grid-cols-4 sm:divide-y-0">
          {statTiles.map((t) => (
            <HeaderStat key={t.label} {...t} />
          ))}
        </div>
      </motion.div>

      {/* Plan mix + Revenue by plan */}
      <div className="mb-6 grid items-start gap-5 lg:grid-cols-5">
        {/* Plan mix donut */}
        <motion.div className={`${card} p-6 lg:col-span-2`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><Layers className="h-4 w-4 text-gray-400" /> Plan mix</h2>
          <p className="mb-4 text-xs text-gray-400">Active subscribers by plan</p>
          {totalSubsForDonut === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">No active subscriptions</p>
          ) : (
            <>
              <div className="relative h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donut} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={62} outerRadius={88} paddingAngle={donut.length > 1 ? 3 : 0} stroke="none">
                      {donut.map((p) => <Cell key={p.code} fill={p.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v, n) => [`${v} subscriber${v === 1 ? "" : "s"}`, n]}
                      contentStyle={{ borderRadius: 0, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeSubs}</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Active</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {donut.map((p) => (
                  <div key={p.code} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 capitalize text-gray-600 dark:text-white/70"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.label}</span>
                    <span className="font-mono text-gray-400">{p.count} · {Math.round((p.count / totalSubsForDonut) * 100)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Revenue by plan */}
        <motion.div className={`${card} p-6 lg:col-span-3`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><DollarSign className="h-4 w-4 text-gray-400" /> Revenue by plan</h2>
          <p className="mb-5 text-xs text-gray-400">Each plan's contribution to MRR ({money(mrr)})</p>
          <div className="space-y-4">
            {revenuePlans.map((p, i) => {
              const share = mrr ? Math.round((p.revenue / mrr) * 100) : 0;
              return (
                <div key={p.code}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                      <span className="truncate font-medium capitalize text-gray-800 dark:text-white/85">{p.label}</span>
                      <span className="rounded px-1.5 py-0.5 font-mono text-[10px]" style={{ color: p.color, background: `${p.color}14` }}>{money(p.price)}/mo</span>
                      <span className="font-mono text-[11px] text-gray-400">× {p.count}</span>
                    </span>
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
      </div>

      {/* Payment health + Recent signups */}
      <div className="grid items-start gap-5 lg:grid-cols-5">
        {/* Payment health */}
        <motion.div className={`${card} p-6 lg:col-span-2`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><Wallet className="h-4 w-4 text-gray-400" /> Payment health</h2>
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Lifetime collected</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{money(collected)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 dark:bg-white/5">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400"><Users className="h-3 w-3" /> Avg / account</p>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{money(arpa)}<span className="text-xs font-medium text-gray-400">/mo</span></p>
            </div>
            <div className={cn("p-3", failed > 0 ? "bg-red-50 dark:bg-red-500/10" : "bg-gray-50 dark:bg-white/5")}>
              <p className={cn("flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider", failed > 0 ? "text-red-500" : "text-gray-400")}><AlertTriangle className="h-3 w-3" /> Past-due</p>
              <p className={cn("mt-1 text-lg font-bold", failed > 0 ? "text-red-600" : "text-gray-900 dark:text-white")}>{failed}</p>
            </div>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-gray-400">
            {failed > 0
              ? `${failed} organisation${failed === 1 ? " is" : "s are"} past due — review them on the Organisations screen.`
              : "All active subscriptions are paid up. Nice and healthy."}
          </p>
        </motion.div>

        {/* Recent signups */}
        <motion.div className={`${card} p-6 lg:col-span-3`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><Calendar className="h-4 w-4 text-gray-400" /> Recent signups</h2>
          {stats?.recentSignups?.length > 0 ? (
            <div className="-mx-2 divide-y divide-gray-100 dark:divide-white/10">
              {stats.recentSignups.map((org) => {
                const pc = planColors[org.plan] || "#10b981";
                return (
                  <div key={org._id} className="flex items-center justify-between gap-3 px-2 py-2.5 transition-colors hover:bg-gray-50/70 dark:hover:bg-white/5">
                    <div className="flex min-w-0 items-center gap-3">
                      {orgLogo(org) ? (
                        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden">
                          <img src={orgLogo(org)} alt={org.name || ""} className="h-full w-full object-contain" />
                        </span>
                      ) : (
                        <span className="grid h-9 w-9 shrink-0 place-items-center text-xs font-bold uppercase" style={{ background: `${pc}14`, color: pc }}>{org.name?.charAt(0)}</span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{org.name}</p>
                        <p className="truncate font-mono text-[11px] text-gray-400">{org.adminUserId?.email || org.slug}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: `${pc}14`, color: pc }}>{org.plan}</span>
                      <span className="font-mono text-[10px] text-gray-400">{new Date(org.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No signups yet</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
