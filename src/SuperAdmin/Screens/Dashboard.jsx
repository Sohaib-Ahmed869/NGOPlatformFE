import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SAPageHeader from "../components/SAPageHeader";
import SALoader from "../SALoader";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: i * 0.05, ease: [0.2, 0.7, 0.2, 1] } }),
};
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

const card = "rounded-xl border border-gray-100 bg-white shadow-sm";

/* Mini sparkline */
function Sparkline({ data, color, height = 30 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  const id = `sf-${Math.round(min)}-${Math.round(max)}-${data.length}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pts} ${w},${height} 0,${height}`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function KPICard({ title, value, delta, deltaUp, icon: Icon, color, sparkData, index }) {
  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      className={`${card} group p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">{title}</p>
          <p className="mt-1.5 text-[26px] font-bold leading-none text-gray-900">{value}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${color}14`, color }}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {delta && (
        <div className="mb-2 flex items-center gap-1.5">
          {deltaUp ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span className={`text-[11px] font-semibold ${deltaUp ? "text-emerald-600" : "text-amber-500"}`}>{delta}</span>
        </div>
      )}
      {sparkData && <Sparkline data={sparkData} color={color} height={28} />}
    </motion.div>
  );
}

/* Donut */
function DonutChart({ segments, size = 124 }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#eef2f7" strokeWidth="12" />
      {segments.map((seg, i) => {
        const dash = (seg.pct / 100) * c;
        const o = offset;
        offset += dash;
        return (
          <motion.circle
            key={i}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="12"
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            initial={{ strokeDasharray: `0 ${c}` }}
            animate={{ strokeDasharray: `${dash} ${c - dash}`, strokeDashoffset: -o }}
            transition={{ duration: 0.9, delay: 0.4 + i * 0.15, ease: [0.2, 0.7, 0.2, 1] }}
          />
        );
      })}
    </svg>
  );
}

/* Bar chart */
function BarChart({ data, height = 150 }) {
  const max = Math.max(...data.map((d) => d.value)) || 1;
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <motion.div
            className="w-full rounded-t-md"
            style={{ background: "linear-gradient(180deg, var(--tenant-accent), var(--tenant-accent-light))" }}
            initial={{ height: 0 }}
            whileInView={{ height: `${(d.value / max) * 100}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 + i * 0.04, ease: [0.2, 0.7, 0.2, 1] }}
          />
          <span className="font-mono text-[9px] text-gray-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

const statusBadge = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "active") return "bg-emerald-50 text-emerald-700";
  if (s === "pending") return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
};

export default function SADashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await superadminService.getBillingStats();
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <SALoader />;

  const totalOrgs = stats?.totalOrganisations || 0;
  const activeOrgs = stats?.activeSubscriptions || 0;
  const failed = stats?.failedPayments || 0;

  // Dynamic plan breakdown (falls back to the legacy tiers pre-seed).
  const planRowsRaw = stats?.plans?.length
    ? stats.plans
    : [
        { code: "basic", name: "Basic", count: stats?.byPlan?.basic || 0, monthly: 200, color: "#06b6d4" },
        { code: "professional", name: "Professional", count: stats?.byPlan?.professional || 0, monthly: 500, color: "#10b981" },
        { code: "enterprise", name: "Enterprise", count: stats?.byPlan?.enterprise || 0, monthly: 1000, color: "#f59e0b" },
      ];
  const planTotal = planRowsRaw.reduce((s, p) => s + (p.count || 0), 0) || 1;
  const mrr = stats?.mrr ?? planRowsRaw.reduce((s, p) => s + (p.count || 0) * (p.monthly || 0), 0);
  const arr = mrr * 12;

  const kpis = [
    { title: "Monthly Revenue", value: `$${mrr.toLocaleString()}`, delta: "+12.4% MoM", deltaUp: true, icon: DollarSign, color: "#10b981", sparkData: [30, 45, 38, 52, 48, 60, 55, 72, 68, 80, 75, mrr / 10] },
    { title: "Total Organisations", value: totalOrgs.toLocaleString(), delta: "+18 this week", deltaUp: true, icon: Building2, color: "#6366f1", sparkData: [10, 15, 18, 22, 28, 32, 35, 40, 42, 45, 48, totalOrgs] },
    { title: "Active Subscriptions", value: activeOrgs.toLocaleString(), delta: `${totalOrgs ? Math.round((activeOrgs / totalOrgs) * 100) : 0}% active`, deltaUp: true, icon: Activity, color: "#06b6d4", sparkData: [8, 12, 16, 20, 25, 28, 30, 34, 38, 40, 42, activeOrgs] },
    { title: "Annual Run Rate", value: `$${arr.toLocaleString()}`, delta: null, deltaUp: true, icon: TrendingUp, color: "#f59e0b", sparkData: [200, 350, 420, 500, 600, 750, 850, 950, 1100, 1250, 1400, arr / 10] },
    { title: "Failed Payments", value: failed.toString(), delta: failed > 0 ? "needs attention" : "all clear", deltaUp: failed === 0, icon: AlertTriangle, color: failed > 0 ? "#ef4444" : "#10b981" },
    { title: "Avg Revenue / Org", value: `$${totalOrgs ? Math.round(mrr / totalOrgs) : 0}`, delta: null, deltaUp: true, icon: CreditCard, color: "#8b5cf6" },
  ];

  const monthlyData = [
    { label: "Jan", value: 20 }, { label: "Feb", value: 28 }, { label: "Mar", value: 35 },
    { label: "Apr", value: 42 }, { label: "May", value: 50 }, { label: "Jun", value: 55 },
    { label: "Jul", value: 48 }, { label: "Aug", value: 62 }, { label: "Sep", value: 70 },
    { label: "Oct", value: 78 }, { label: "Nov", value: 85 }, { label: "Dec", value: totalOrgs || 90 },
  ];

  const planRows = planRowsRaw.map((p) => ({
    label: p.name,
    count: p.count || 0,
    pct: Math.round(((p.count || 0) / planTotal) * 100),
    price: p.monthly || 0,
    color: p.color || "#10b981",
  }));

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <SAPageHeader
        eyebrow="Overview"
        title="Platform Dashboard"
        subtitle="Real-time platform metrics and revenue across all organisations."
        actions={
          <span className="inline-flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-gray-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" style={{ boxShadow: "0 0 0 3px rgba(16,185,129,.25)" }} />
            Live
          </span>
        }
      />

      {/* KPI tiles */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi, i) => (
          <KPICard key={kpi.title} {...kpi} index={i} />
        ))}
      </div>

      {/* Growth + plan distribution */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        <motion.div variants={fadeUp} custom={7} className={`${card} p-6`}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Organisation Growth</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-gray-400">Last 12 months</span>
          </div>
          <BarChart data={monthlyData} />
        </motion.div>

        <motion.div variants={fadeUp} custom={8} className={`${card} p-6`}>
          <h2 className="mb-5 text-sm font-semibold text-gray-900">Plan Distribution</h2>
          <div className="flex items-center gap-6">
            <DonutChart segments={planRows.map((p) => ({ pct: p.pct, color: p.color }))} />
            <div className="flex-1 space-y-3">
              {planRows.map((p) => (
                <div key={p.label} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-medium text-gray-800">{p.label}</span>
                      <span className="font-mono text-[10px] text-gray-400">{p.count} ({p.pct}%)</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-100">
                      <motion.div className="h-full rounded-full" style={{ background: p.color }} initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ duration: 0.8, delay: 0.5 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Revenue by plan */}
      <motion.div variants={fadeUp} custom={9} className={`${card} mb-6 p-6`}>
        <h2 className="mb-5 text-sm font-semibold text-gray-900">Revenue by Plan</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {planRows.map((p) => (
            <div key={p.label} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                <span className="text-xs font-medium text-gray-800">{p.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">${(p.price * p.count).toLocaleString()}</p>
              <p className="mt-1 font-mono text-[10px] text-gray-400">{p.count} × ${p.price}/mo</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent signups */}
      <motion.div variants={fadeUp} custom={10} className={`${card} p-6`}>
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Recent Signups</h2>
        {stats?.recentSignups?.length > 0 ? (
          <div className="space-y-1">
            {stats.recentSignups.map((org) => (
              <div key={org._id} className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-gray-50">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold uppercase text-white"
                    style={{ background: "linear-gradient(135deg, var(--tenant-accent, #10b981), var(--tenant-accent-light, #34d399))" }}
                  >
                    {org.name?.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{org.name}</p>
                    <p className="truncate font-mono text-[11px] text-gray-400">{org.slug}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${statusBadge(org.subscriptionStatus)}`}>
                    {org.subscriptionStatus}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-1 font-mono text-[10px] capitalize text-gray-600">{org.plan}</span>
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
