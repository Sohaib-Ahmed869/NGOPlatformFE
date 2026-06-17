import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, Building2, AlertTriangle, DollarSign } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SAPageHeader from "../components/SAPageHeader";
import SALoader from "../SALoader";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: i * 0.05, ease: [0.2, 0.7, 0.2, 1] } }),
};
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

const card = "rounded-xl border border-gray-100 bg-white shadow-sm";
const planColors = { basic: "#06b6d4", professional: "#10b981", enterprise: "#f59e0b" };

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

  if (loading) return <SALoader />;

  // Dynamic plan breakdown (falls back to the legacy tiers pre-seed).
  const planRowsRaw = stats?.plans?.length
    ? stats.plans
    : [
        { code: "basic", name: "Basic", count: stats?.byPlan?.basic || 0, monthly: 200, color: planColors.basic },
        { code: "professional", name: "Professional", count: stats?.byPlan?.professional || 0, monthly: 500, color: planColors.professional },
        { code: "enterprise", name: "Enterprise", count: stats?.byPlan?.enterprise || 0, monthly: 1000, color: planColors.enterprise },
      ];
  const mrr = stats?.mrr ?? planRowsRaw.reduce((s, p) => s + (p.count || 0) * (p.monthly || 0), 0);

  const statCards = [
    { title: "Active Subscriptions", value: stats?.activeSubscriptions || 0, icon: CreditCard, color: "#10b981" },
    { title: "Total Organisations", value: stats?.totalOrganisations || 0, icon: Building2, color: "#6366f1" },
    { title: "Monthly Revenue", value: `$${mrr.toLocaleString()}`, icon: DollarSign, color: "#06b6d4" },
    { title: "Failed Payments", value: stats?.failedPayments || 0, icon: AlertTriangle, color: (stats?.failedPayments || 0) > 0 ? "#ef4444" : "#10b981" },
  ];

  const planData = planRowsRaw.map((p) => ({
    plan: p.code,
    label: p.name,
    price: p.monthly || 0,
    count: p.count || 0,
    color: p.color || "#10b981",
  }));
  const totalSubs = stats?.activeSubscriptions || 1;

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <SAPageHeader eyebrow="Revenue" title="Billing Overview" subtitle="Subscription revenue and payment health across the platform." />

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((c, i) => (
          <motion.div
            key={c.title}
            variants={fadeUp}
            custom={i}
            className={`${card} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5`}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${c.color}14`, color: c.color }}>
                <c.icon className="h-5 w-5" />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-gray-400">{c.title}</span>
            </div>
            <p className="text-[26px] font-bold leading-none text-gray-900">{c.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Plan distribution */}
      <motion.div variants={fadeUp} custom={5} className={`${card} mb-6 p-6`}>
        <h2 className="mb-5 text-sm font-semibold text-gray-900">Subscriptions by Plan</h2>
        <div className="space-y-4">
          {planData.map((p, i) => {
            const pct = Math.round((p.count / totalSubs) * 100) || 0;
            return (
              <div key={p.plan}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                    <span className="font-medium capitalize text-gray-800">{p.label}</span>
                    <span className="rounded px-1.5 py-0.5 font-mono text-[10px]" style={{ color: p.color, background: `${p.color}14` }}>${p.price}/mo</span>
                  </div>
                  <span className="font-mono text-xs text-gray-400">{p.count} ({pct}%)</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: p.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Recent signups */}
      <motion.div variants={fadeUp} custom={6} className={`${card} p-6`}>
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Recent Signups</h2>
        {stats?.recentSignups?.length > 0 ? (
          <div className="space-y-1">
            {stats.recentSignups.map((org) => (
              <div key={org._id} className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-gray-50">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold uppercase" style={{ background: `${planColors[org.plan] || "#10b981"}14`, color: planColors[org.plan] || "#10b981" }}>
                    {org.name?.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{org.name}</p>
                    <p className="truncate font-mono text-[11px] text-gray-400">{org.slug}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: `${planColors[org.plan] || "#10b981"}14`, color: planColors[org.plan] || "#10b981" }}>
                    {org.plan}
                  </span>
                  <span className="font-mono text-[10px] text-gray-400">{new Date(org.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-gray-400">No signups yet</p>
        )}
      </motion.div>
    </motion.div>
  );
}
