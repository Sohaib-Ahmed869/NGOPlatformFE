import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, CreditCard, AlertTriangle, TrendingUp, DollarSign, Users, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SALoader from "../SALoader";

const V = {
  ink: "#102A23", inkSoft: "#46685C", inkFaint: "#8AA89C",
  primary: "#047857", primary2: "#065F46", accent: "#F59E0B",
  surface: "#FFFFFF", surface2: "#E7F2EC", bg: "#F3F8F5",
  line: "rgba(6,40,30,.08)",
};
const mono = "'JetBrains Mono', monospace";

/* KPI card CSS — hover lift + border glow + gloss sweep + icon glow */
const kpiCSS = `
.sa-kpi {
  position: relative; overflow: hidden;
  transition: transform .3s ease, border-color .4s ease, box-shadow .4s ease;
}
.sa-kpi:hover {
  transform: translateY(-3px) scale(1.04);
  border-color: rgba(4,120,87,.25);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.9),
    0 0 0 1px rgba(4,120,87,.12),
    0 0 24px -4px rgba(4,120,87,.18),
    0 0 48px -8px rgba(4,120,87,.10),
    0 16px 40px -12px rgba(4,120,87,.15);
}

/* Gloss sweep */
.sa-kpi::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.50) 50%, transparent 65%);
  transform: translateX(-120%);
  transition: transform 1s cubic-bezier(.2,.8,.2,1);
  pointer-events: none; z-index: 2;
}
.sa-kpi:hover::before { transform: translateX(120%); }

/* Subtle glow pulse behind icon on hover */
.sa-kpi .sa-kpi-glow {
  transition: opacity .4s ease, transform .4s ease;
  opacity: 0.5;
}
.sa-kpi:hover .sa-kpi-glow {
  opacity: 1;
  transform: translate(33%, -50%) scale(1.15);
}
`;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.06, ease: [0.2, 0.7, 0.2, 1] } }),
};
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

/* Mini sparkline SVG */
const Sparkline = ({ data, color, height = 32 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  const fill = `${pts} ${w},${height} 0,${height}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sf-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#sf-${color.replace("#", "")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
};

/* Glassmorphism KPI card — hover lift + border glow + icon glow */
const KPICard = ({ title, value, delta, deltaUp, icon: Icon, color, sparkData, sparkColor, index }) => (
  <motion.div variants={fadeUp} custom={index}
    className="sa-kpi rounded-xl p-5"
    style={{
      background: `linear-gradient(135deg, rgba(255,255,255,.7), rgba(255,255,255,.4))`,
      backdropFilter: "blur(20px) saturate(140%)",
      border: `1px solid ${V.line}`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,.9), 0 1px 2px rgba(15,23,42,.04), 0 8px 24px -8px rgba(15,23,42,.06)`,
    }}>
    {/* Soft color glow behind icon — pulses on hover */}
    <div className="sa-kpi-glow absolute top-0 right-0 w-28 h-28 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"
      style={{ background: `radial-gradient(circle, ${color}20, transparent 70%)` }} />
    <div className="flex items-start justify-between mb-3 relative">
      <div>
        <p className="text-[11px] tracking-[.06em] uppercase mb-1" style={{ fontFamily: mono, color: V.inkFaint }}>{title}</p>
        <p className="text-[28px] font-medium tracking-tight leading-none" style={{ color: V.ink }}>{value}</p>
      </div>
      <div className="w-10 h-10 rounded-xl grid place-items-center"
        style={{ background: `${color}12`, border: `1px solid ${color}25`, boxShadow: `0 0 12px ${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
    </div>
    {delta && (
      <div className="flex items-center gap-1.5 mb-3">
        {deltaUp ? <ArrowUpRight className="w-3.5 h-3.5" style={{ color: "#059669" }} /> : <ArrowDownRight className="w-3.5 h-3.5" style={{ color: V.accent }} />}
        <span className="text-[11px] font-semibold" style={{ fontFamily: mono, color: deltaUp ? "#059669" : V.accent }}>{delta}</span>
      </div>
    )}
    {sparkData && <Sparkline data={sparkData} color={sparkColor || color} height={28} />}
  </motion.div>
);

/* Donut chart */
const DonutChart = ({ segments, size = 120 }) => {
  const r = 42; const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke={V.surface2} strokeWidth="12" />
      {segments.map((seg, i) => {
        const dash = (seg.pct / 100) * c;
        const o = offset; offset += dash;
        return (
          <motion.circle key={i} cx="50" cy="50" r={r} fill="none" stroke={seg.color} strokeWidth="12"
            strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-o} strokeLinecap="round"
            transform="rotate(-90 50 50)"
            initial={{ strokeDasharray: `0 ${c}` }}
            animate={{ strokeDasharray: `${dash} ${c - dash}` }}
            transition={{ duration: 1, delay: 0.5 + i * 0.15, ease: [0.2, 0.7, 0.2, 1] }}
          />
        );
      })}
    </svg>
  );
};

/* Bar chart */
const BarChart = ({ data, height = 140 }) => {
  const max = Math.max(...data.map(d => d.value)) || 1;
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <motion.div className="w-full rounded-t-md"
            style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: `0 0 8px ${V.primary}20` }}
            initial={{ height: 0 }} animate={{ height: `${(d.value / max) * 100}%` }}
            transition={{ duration: 0.6, delay: 0.3 + i * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
          />
          <span className="text-[9px]" style={{ fontFamily: mono, color: V.inkFaint }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
};

export default function SADashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await superadminService.getBillingStats();
        setStats(res.data);
      } catch (err) { console.error("Failed to fetch stats:", err); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <SALoader />;

  const totalOrgs = stats?.totalOrganisations || 0;
  const activeOrgs = stats?.activeSubscriptions || 0;
  const failed = stats?.failedPayments || 0;
  const basic = stats?.byPlan?.basic || 0;
  const pro = stats?.byPlan?.professional || 0;
  const ent = stats?.byPlan?.enterprise || 0;

  // Revenue estimates
  const mrr = basic * 200 + pro * 500 + ent * 1000;
  const arr = mrr * 12;

  const kpis = [
    { title: "Monthly Revenue", value: `$${mrr.toLocaleString()}`, delta: "+12.4% MoM", deltaUp: true, icon: DollarSign, color: "#059669", sparkData: [30, 45, 38, 52, 48, 60, 55, 72, 68, 80, 75, mrr / 10], sparkColor: "#059669" },
    { title: "Total Organisations", value: totalOrgs.toLocaleString(), delta: "+18 this week", deltaUp: true, icon: Building2, color: V.primary, sparkData: [10, 15, 18, 22, 28, 32, 35, 40, 42, 45, 48, totalOrgs], sparkColor: V.primary },
    { title: "Active Subscriptions", value: activeOrgs.toLocaleString(), delta: `${totalOrgs ? Math.round((activeOrgs / totalOrgs) * 100) : 0}% active`, deltaUp: true, icon: Activity, color: "#0891B2", sparkData: [8, 12, 16, 20, 25, 28, 30, 34, 38, 40, 42, activeOrgs] },
    { title: "Annual Run Rate", value: `$${arr.toLocaleString()}`, delta: null, deltaUp: true, icon: TrendingUp, color: V.accent, sparkData: [200, 350, 420, 500, 600, 750, 850, 950, 1100, 1250, 1400, arr / 10], sparkColor: V.accent },
    { title: "Failed Payments", value: failed.toString(), delta: failed > 0 ? "needs attention" : "all clear", deltaUp: failed === 0, icon: AlertTriangle, color: failed > 0 ? "#DC2626" : "#059669" },
    { title: "Avg Revenue / Org", value: `$${totalOrgs ? Math.round(mrr / totalOrgs) : 0}`, delta: null, deltaUp: true, icon: CreditCard, color: "#10B981" },
  ];

  const planPct = totalOrgs ? { basic: Math.round((basic / totalOrgs) * 100), pro: Math.round((pro / totalOrgs) * 100), ent: Math.round((ent / totalOrgs) * 100) } : { basic: 0, pro: 0, ent: 0 };

  const monthlyData = [
    { label: "Jan", value: 20 }, { label: "Feb", value: 28 }, { label: "Mar", value: 35 },
    { label: "Apr", value: 42 }, { label: "May", value: 50 }, { label: "Jun", value: 55 },
    { label: "Jul", value: 48 }, { label: "Aug", value: 62 }, { label: "Sep", value: 70 },
    { label: "Oct", value: 78 }, { label: "Nov", value: 85 }, { label: "Dec", value: totalOrgs || 90 },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <style>{kpiCSS}</style>
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: V.ink }}>Platform Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: V.inkFaint }}>Real-time platform metrics and revenue</p>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] tracking-[.08em] uppercase"
          style={{ fontFamily: mono, color: V.inkFaint, background: V.surface, border: `1px solid ${V.line}` }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" style={{ boxShadow: "0 0 0 3px rgba(5,150,105,.3)" }} />
          Live
        </span>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10 py-4 px-1 -mx-1">
        {kpis.map((kpi, i) => <KPICard key={kpi.title} {...kpi} index={i} />)}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 mb-8">
        {/* Monthly growth bar chart */}
        <motion.div variants={fadeUp} custom={7} className="rounded-xl p-6"
          style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold" style={{ color: V.ink }}>Organisation Growth</h2>
            <span className="text-[10px] tracking-[.06em] uppercase" style={{ fontFamily: mono, color: V.inkFaint }}>Last 12 months</span>
          </div>
          <BarChart data={monthlyData} />
        </motion.div>

        {/* Plan distribution donut */}
        <motion.div variants={fadeUp} custom={8} className="rounded-xl p-6"
          style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
          <h2 className="text-sm font-semibold mb-5" style={{ color: V.ink }}>Plan Distribution</h2>
          <div className="flex items-center gap-6">
            <DonutChart segments={[
              { pct: planPct.basic, color: "#0891B2" },
              { pct: planPct.pro, color: V.primary },
              { pct: planPct.ent, color: V.accent },
            ]} />
            <div className="space-y-3 flex-1">
              {[
                { label: "Basic", count: basic, pct: planPct.basic, color: "#0891B2" },
                { label: "Professional", count: pro, pct: planPct.pro, color: V.primary },
                { label: "Enterprise", count: ent, pct: planPct.ent, color: V.accent },
              ].map((p) => (
                <div key={p.label} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-medium" style={{ color: V.ink }}>{p.label}</span>
                      <span className="text-[10px]" style={{ fontFamily: mono, color: V.inkFaint }}>{p.count} ({p.pct}%)</span>
                    </div>
                    <div className="h-1 rounded-full mt-1 overflow-hidden" style={{ background: V.surface2 }}>
                      <motion.div className="h-full rounded-full" style={{ background: p.color }}
                        initial={{ width: 0 }} animate={{ width: `${p.pct}%` }}
                        transition={{ duration: 0.8, delay: 0.6 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Revenue breakdown */}
      <motion.div variants={fadeUp} custom={9} className="rounded-xl p-6 mb-8"
        style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
        <h2 className="text-sm font-semibold mb-5" style={{ color: V.ink }}>Revenue by Plan</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { plan: "Basic", price: 200, count: basic, color: "#0891B2" },
            { plan: "Professional", price: 500, count: pro, color: V.primary },
            { plan: "Enterprise", price: 1000, count: ent, color: V.accent },
          ].map((p, i) => (
            <motion.div key={p.plan} className="rounded-lg p-4"
              style={{ background: V.bg, border: `1px solid ${V.line}` }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.1 }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                <span className="text-xs font-medium" style={{ color: V.ink }}>{p.plan}</span>
              </div>
              <p className="text-xl font-medium" style={{ color: V.ink }}>${(p.price * p.count).toLocaleString()}</p>
              <p className="text-[10px] mt-1" style={{ fontFamily: mono, color: V.inkFaint }}>
                {p.count} × ${p.price}/month
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent signups */}
      <motion.div variants={fadeUp} custom={10} className="rounded-xl p-6"
        style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.04)` }}>
        <h2 className="text-sm font-semibold mb-5" style={{ color: V.ink }}>Recent Signups</h2>
        {stats?.recentSignups?.length > 0 ? (
          <div className="space-y-1">
            {stats.recentSignups.map((org, i) => (
              <motion.div key={org._id}
                className="flex items-center justify-between py-3 px-3 rounded-lg transition-colors hover:bg-[#E7F2EC]/50"
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.06 }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg grid place-items-center"
                    style={{ background: `linear-gradient(135deg, ${V.primary}20, ${V.accent}15)`, border: `1px solid ${V.primary}20` }}>
                    <span className="text-xs font-bold uppercase" style={{ color: V.primary }}>{org.name?.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: V.ink }}>{org.name}</p>
                    <p className="text-[11px]" style={{ fontFamily: mono, color: V.inkFaint }}>{org.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${org.subscriptionStatus === "active" ? "bg-green-50 text-green-700" :
                      org.subscriptionStatus === "pending" ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"
                    }`}>{org.subscriptionStatus}</span>
                  <span className="text-[10px] px-2 py-1 rounded-full capitalize" style={{ fontFamily: mono, background: `${V.primary}08`, color: V.primary }}>{org.plan}</span>
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
