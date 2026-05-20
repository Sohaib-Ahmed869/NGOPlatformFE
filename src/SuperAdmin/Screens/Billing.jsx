import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, Building2, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SALoader from "../SALoader";

const V = {
  ink: "#1A0D2E", inkSoft: "#5B4A7A", inkFaint: "#9D90B5",
  primary: "#7C3AED", primary2: "#6D28D9", accent: "#DB2777",
  surface: "#FFFFFF", surface2: "#F2EDF8", bg: "#F7F4FB",
  line: "rgba(28,15,55,.08)",
};
const mono = "'JetBrains Mono', monospace";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.06, ease: [0.2, 0.7, 0.2, 1] } }),
};
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

const planColors = { basic: "#0891B2", professional: "#7C3AED", enterprise: "#DB2777" };

export default function Billing() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const res = await superadminService.getBillingStats(); setStats(res.data); }
      catch (err) { console.error("Failed to fetch billing stats:", err); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <SALoader />;

  const basic = stats?.byPlan?.basic || 0;
  const pro = stats?.byPlan?.professional || 0;
  const ent = stats?.byPlan?.enterprise || 0;
  const mrr = basic * 29 + pro * 79 + ent * 199;

  const statCards = [
    { title: "Active Subscriptions", value: stats?.activeSubscriptions || 0, icon: CreditCard, color: "#059669", bg: "rgba(5,150,105,.08)" },
    { title: "Total Organisations", value: stats?.totalOrganisations || 0, icon: Building2, color: V.primary, bg: `${V.primary}08` },
    { title: "Monthly Revenue", value: `$${mrr.toLocaleString()}`, icon: DollarSign, color: "#0891B2", bg: "rgba(8,145,178,.08)" },
    { title: "Failed Payments", value: stats?.failedPayments || 0, icon: AlertTriangle, color: "#DC2626", bg: "rgba(220,38,38,.08)" },
  ];

  const planData = [
    { plan: "basic", label: "Basic", price: 29, count: basic, color: planColors.basic },
    { plan: "professional", label: "Professional", price: 79, count: pro, color: planColors.professional },
    { plan: "enterprise", label: "Enterprise", price: 199, count: ent, color: planColors.enterprise },
  ];
  const totalSubs = stats?.activeSubscriptions || 1;

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: V.ink }}>Billing Overview</h1>
          <p className="text-sm mt-1" style={{ color: V.inkFaint }}>Subscription revenue and payment health</p>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <motion.div key={card.title} variants={fadeUp} custom={i}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="rounded-xl p-5 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, rgba(255,255,255,.7), rgba(255,255,255,.4))`,
              backdropFilter: "blur(20px) saturate(140%)",
              border: `1px solid ${V.line}`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,.9), 0 1px 2px rgba(15,23,42,.04), 0 8px 24px -8px rgba(15,23,42,.06)`,
            }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${card.color}15, transparent 70%)` }} />
            <div className="flex items-center gap-3 mb-3 relative">
              <div className="w-10 h-10 rounded-xl grid place-items-center"
                style={{ background: card.bg, border: `1px solid ${card.color}20` }}>
                <card.icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
              <span className="text-[11px] tracking-[.06em] uppercase" style={{ fontFamily: mono, color: V.inkFaint }}>{card.title}</span>
            </div>
            <p className="text-[28px] font-medium tracking-tight leading-none relative" style={{ color: V.ink }}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Plan distribution */}
      <motion.div variants={fadeUp} custom={5} className="rounded-xl p-6 mb-8"
        style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
        <h2 className="text-sm font-semibold mb-5" style={{ color: V.ink }}>Subscriptions by Plan</h2>
        <div className="space-y-4">
          {planData.map((p, i) => {
            const pct = Math.round((p.count / totalSubs) * 100) || 0;
            return (
              <motion.div key={p.plan}
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}>
                <div className="flex justify-between text-sm mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                    <span className="capitalize font-medium" style={{ color: V.ink }}>{p.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ fontFamily: mono, color: p.color, background: `${p.color}10` }}>
                      ${p.price}/mo
                    </span>
                  </div>
                  <span className="text-xs" style={{ fontFamily: mono, color: V.inkFaint }}>{p.count} ({pct}%)</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: V.surface2 }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${p.color}, ${p.color}cc)`, boxShadow: `0 0 8px ${p.color}30` }}
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Recent signups */}
      <motion.div variants={fadeUp} custom={6} className="rounded-xl p-6"
        style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
        <h2 className="text-sm font-semibold mb-5" style={{ color: V.ink }}>Recent Signups</h2>
        {stats?.recentSignups?.length > 0 ? (
          <div className="space-y-1">
            {stats.recentSignups.map((org, i) => (
              <motion.div key={org._id}
                className="flex items-center justify-between py-3 px-3 rounded-lg transition-colors hover:bg-[#F2EDF8]/50"
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg grid place-items-center"
                    style={{ background: `${planColors[org.plan] || V.primary}12`, border: `1px solid ${planColors[org.plan] || V.primary}20` }}>
                    <span className="text-xs font-bold uppercase" style={{ color: planColors[org.plan] || V.primary }}>{org.name?.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: V.ink }}>{org.name}</p>
                    <p className="text-[11px]" style={{ fontFamily: mono, color: V.inkFaint }}>{org.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                    style={{ background: `${planColors[org.plan] || V.primary}10`, color: planColors[org.plan] || V.primary }}>{org.plan}</span>
                  <span className="text-[10px]" style={{ fontFamily: mono, color: V.inkFaint }}>{new Date(org.createdAt).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-sm py-8 text-center" style={{ color: V.inkFaint }}>No signups yet</p>
        )}
      </motion.div>
    </motion.div>
  );
}
