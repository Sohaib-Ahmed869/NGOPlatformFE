import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  RefreshCcw,
  Repeat,
  Layers,
  CreditCard,
  Wallet,
  HandCoins,
  HeartHandshake,
  Target,
  ChevronRight,
  Gift,
  Receipt,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import dashboardService from "../../services/dashboard.service";

/* ── helpers ──────────────────────────────────────────────────────────── */
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))";
const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const moneyShort = (n) => {
  const v = Number(n || 0);
  if (v >= 1000) return `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(v)}`;
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
const titleCase = (s) => (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const getThemeColor = (v, f) => (typeof window === "undefined" ? f : getComputedStyle(document.documentElement).getPropertyValue(v).trim() || f);

const TYPE_COLORS = { oneTime: "var(--tenant-accent, #C9A84C)", recurring: "#10B981", installments: "#F59E0B" };
const STATUS_COLOR = {
  completed: "#10B981",
  active: "#10B981",
  ended: "#9CA3AF",
  pending: "#F59E0B",
  processing: "#3B82F6",
  pending_cancellation: "#FB923C",
  failed: "#DC2626",
  cancelled: "#EF4444",
  refunded: "#6366F1",
};
const STATUS_PILL = {
  completed: "bg-emerald-50 text-emerald-700",
  active: "bg-emerald-50 text-emerald-700",
  ended: "bg-gray-100 text-gray-600",
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  pending_cancellation: "bg-orange-50 text-orange-700",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-red-50 text-red-700",
};
const pill = (s) => STATUS_PILL[(s || "").toLowerCase()] || "bg-gray-100 text-gray-600";

const METHOD_ICON = { visa: CreditCard, mastercard: CreditCard, card: CreditCard, stripe: CreditCard, paypal: Wallet, bank: Receipt };

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: Math.min(i * 0.05, 0.4), duration: 0.4 } }),
};

/* ── UI bits ──────────────────────────────────────────────────────────── */
const Card = ({ className = "", children, ...rest }) => (
  <div className={cn("border border-gray-100 bg-white shadow-sm", className)} {...rest}>{children}</div>
);

function SectionHead({ icon: Icon, title, sub, to, action }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent">
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate font-heading text-base font-bold text-primary">{title}</h2>
          {sub && <p className="truncate text-xs text-text-muted">{sub}</p>}
        </div>
      </div>
      {to && (
        <Link to={to} className="group inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent transition-colors hover:text-accent-light">
          {action || "View all"} <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function HeaderStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-heading text-lg font-bold leading-none text-primary">{value}</p>
        <p className="mt-1 text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}

function Sparkline({ data, color, height = 30 }) {
  if (!data || data.length < 2 || !data.some((v) => v > 0)) return <div style={{ height }} />;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1, w = 100;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  const id = `sk-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pts} ${w},${height} 0,${height}`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function StatTile({ icon: Icon, label, value, color, spark, sub, index = 0 }) {
  return (
    <motion.div variants={fadeUp} custom={index} className="group border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
          <p className="mt-1.5 font-heading text-2xl font-bold leading-none text-primary">{value}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center" style={{ background: `${color}14`, color }}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3"><Sparkline data={spark} color={color.startsWith("var") ? getThemeColor("--tenant-accent", "#C9A84C") : color} /></div>
      {sub && <p className="mt-1 text-[11px] font-medium text-text-muted">{sub}</p>}
    </motion.div>
  );
}

function DonutChart({ segments, size = 168, centerValue, centerLabel }) {
  const r = 58, c = 2 * Math.PI * r, gap = 8;
  let offset = 0;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  return (
    <svg width={size} height={size} viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="15" />
      {total > 0 && segments.filter((s) => s.value > 0).map((seg, i) => {
        const pct = seg.value / total;
        const dashLen = Math.max(0, pct * c - gap);
        const el = (
          <circle key={i} cx="70" cy="70" r={r} fill="none" stroke={seg.color} strokeWidth="15" strokeLinecap="round"
            strokeDasharray={`${dashLen} ${c - dashLen}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)"
            style={{ transition: "stroke-dasharray .6s ease" }} />
        );
        offset += pct * c;
        return el;
      })}
      <text x="70" y="67" textAnchor="middle" fontSize="17" fontWeight="700" fill="currentColor" className="text-primary">{centerValue}</text>
      <text x="70" y="84" textAnchor="middle" fontSize="9" fill="#94a3b8">{centerLabel || "total"}</text>
    </svg>
  );
}

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color || "var(--tenant-accent, #C9A84C)" }} />
    </div>
  );
}

const DATE_FILTERS = [
  { key: "all", label: "All time" },
  { key: "90d", label: "90 days" },
  { key: "30d", label: "30 days" },
  { key: "15d", label: "15 days" },
  { key: "7d", label: "7 days" },
];

const EMPTY = {
  dashboardData: {
    orderStats: {
      totalAmount: 0, totalAmountReceived: 0, paidAmount: 0, pendingAmount: 0, averageDonation: 0,
      recurringDonations: 0, oneTimeDonations: 0, installmentDonations: 0, activeRecurring: 0,
      monthlyRecurringRevenue: 0, successRate: 0, totalDonations: 0, monthlyTrend: [], recentDonations: [],
      uniqueDonors: 0, completedDonations: 0, statusBreakdown: {}, paymentMethods: [], topCauses: [],
    },
    subscriptionStats: { activeSubscriptions: 0, monthlyRecurringRevenue: 0, retentionRate: 0, avgLifetimeValue: 0, trendData: [] },
    topDonors: [],
  },
  donorStats: { totalDonors: 0, totalAmount: 0, averageDonation: 0, recurringDonations: 0 },
};

/* ── component ────────────────────────────────────────────────────────── */
const AdminDashboard = () => {
  const cached = dashboardService.getCached("all");
  const [data, setData] = useState(cached || EMPTY);
  const [isLoading, setIsLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState("all");
  const [metric, setMetric] = useState("amount"); // amount | count
  const firstRef = useRef(!cached);

  useEffect(() => {
    const c = dashboardService.getCached(dateFilter);
    if (c) {
      setData(c);
      setIsLoading(false);
      firstRef.current = false;
      return;
    }
    let active = true;
    const cold = firstRef.current;
    if (cold) setIsLoading(true);
    else setRefreshing(true);
    const req = dashboardService.load({ filter: dateFilter });
    (cold ? withMinDelay(req) : req)
      .then((d) => active && setData(d))
      .catch((e) => {
        console.error("Failed to fetch dashboard data:", e);
        if (active) setError("Failed to load dashboard data");
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
        setRefreshing(false);
        firstRef.current = false;
      });
    return () => { active = false; };
  }, [dateFilter]);

  const accent = getThemeColor("--tenant-accent", "#C9A84C");

  const od = data.dashboardData.orderStats;
  const subs = data.dashboardData.subscriptionStats || {};
  const topDonors = data.dashboardData.topDonors || [];
  const donorStats = data.donorStats || {};

  const trend = useMemo(() => od.monthlyTrend || [], [od.monthlyTrend]);
  const sparks = useMemo(
    () => ({
      received: trend.map((m) => m.received || 0),
      count: trend.map((m) => m.count || 0),
      recurring: trend.map((m) => m.recurring || 0),
      amount: trend.map((m) => m.amount || 0),
    }),
    [trend],
  );

  const statusSegments = useMemo(() => {
    const sb = od.statusBreakdown || {};
    return Object.entries(sb)
      .map(([k, v]) => ({ key: k, name: titleCase(k), value: v, color: STATUS_COLOR[k] || "#94a3b8" }))
      .sort((a, b) => b.value - a.value);
  }, [od.statusBreakdown]);
  const statusTotal = statusSegments.reduce((s, x) => s + x.value, 0);

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <TabLoader label="Loading dashboard…" />
      </div>
    );
  }

  const typeTotal = (od.oneTimeDonations || 0) + (od.recurringDonations || 0) + (od.installmentDonations || 0);
  const typeCards = [
    { name: "One-time", value: od.oneTimeDonations || 0, color: accent, icon: Gift },
    { name: "Recurring", value: od.recurringDonations || 0, color: TYPE_COLORS.recurring, icon: Repeat },
    { name: "Installments", value: od.installmentDonations || 0, color: TYPE_COLORS.installments, icon: Layers },
  ];
  const pendingCount = od.statusBreakdown?.pending || 0;
  const maxCause = Math.max(1, ...(od.topCauses || []).map((c) => c.amount || 0));
  const maxMethod = Math.max(1, ...(od.paymentMethods || []).map((m) => m.amount || 0));

  // Trend chart uses a single, always-populated series per metric (committed
  // amount or count) — reliable regardless of how much has been collected.
  const trendKey = metric === "amount" ? "amount" : "count";
  const trendTotal = trend.reduce((s, m) => s + (m[trendKey] || 0), 0);

  return (
    <motion.div initial="hidden" animate="visible" className="w-full space-y-6">
      {/* Hero */}
      <motion.div variants={fadeUp} custom={0}>
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Overview</p>
              <h1 className="mt-1 flex items-center gap-2 font-heading text-2xl font-bold text-white">
                Dashboard
                {refreshing && <RefreshCcw className="h-4 w-4 animate-spin text-white/70" />}
              </h1>
              <p className="mt-1 text-sm text-white/80">Monitor donations, donors and impact across your organisation.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DATE_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDateFilter(key)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold transition-colors",
                    dateFilter === key ? "bg-white text-primary shadow-sm" : "border border-white/30 bg-white/10 text-white hover:bg-white/20",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0">
            <HeaderStat icon={DollarSign} label="Total received" value={money(od.totalAmountReceived)} />
            <HeaderStat icon={TrendingUp} label="Total committed" value={money(od.totalAmount)} />
            <HeaderStat icon={HandCoins} label="Donations" value={(od.totalDonations || 0).toLocaleString()} />
            <HeaderStat icon={Users} label="Donors" value={(od.uniqueDonors || donorStats.totalDonors || 0).toLocaleString()} />
          </div>
        </Card>
      </motion.div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile index={1} icon={DollarSign} label="Total received" value={money(od.totalAmountReceived)} color={accent} spark={sparks.received} sub={`${Math.round(od.successRate || 0)}% success rate`} />
        <StatTile index={2} icon={Clock} label="Pending" value={money(od.pendingAmount)} color="#F59E0B" spark={sparks.count} sub={`${pendingCount} awaiting payment`} />
        <StatTile index={3} icon={Repeat} label="Monthly recurring" value={money(od.monthlyRecurringRevenue)} color="#8B5CF6" spark={sparks.recurring} sub={`${od.activeRecurring || 0} active plans`} />
        <StatTile index={4} icon={TrendingUp} label="Average gift" value={money(Math.round(od.averageDonation))} color="#06B6D4" spark={sparks.amount} sub={`${(od.totalDonations || 0).toLocaleString()} donations`} />
      </div>

      {/* Trend + status donut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div variants={fadeUp} custom={5} className="lg:col-span-2">
          <Card className="h-full">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent"><TrendingUp className="h-[18px] w-[18px]" /></span>
                <div>
                  <h2 className="font-heading text-base font-bold text-primary">Donations over time</h2>
                  <p className="text-xs text-text-muted">Last 12 months ({metric === "amount" ? "amount raised" : "count"})</p>
                </div>
              </div>
              <div className="flex items-center gap-1 border border-gray-200 p-0.5">
                {[{ id: "amount", label: "Amount" }, { id: "count", label: "Count" }].map((t) => (
                  <button key={t.id} onClick={() => setMetric(t.id)} className={cn("px-2.5 py-1 text-xs font-semibold transition-colors", metric === t.id ? "bg-accent text-white" : "text-text-muted hover:text-primary")}>{t.label}</button>
                ))}
              </div>
            </div>
            <div className="h-72 px-2 py-4">
              {trendTotal === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-gray-50 text-gray-400"><TrendingUp className="h-5 w-5" /></span>
                  <p className="text-sm text-text-muted">No {metric === "amount" ? "amount" : "donation"} data for this period.</p>
                  {metric === "amount" && (
                    <button type="button" onClick={() => setMetric("count")} className="text-xs font-semibold text-accent hover:text-accent-light">
                      View by count instead
                    </button>
                  )}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 6, right: 16, left: -8, bottom: 0 }} barCategoryGap="22%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false}
                      tickFormatter={(v) => (metric === "amount" ? moneyShort(v) : v)} width={48} />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.03)" }}
                      contentStyle={{ borderRadius: 0, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", fontSize: 12 }}
                      formatter={(value) => [metric === "amount" ? money(value) : value, metric === "amount" ? "Raised" : "Donations"]}
                    />
                    <Bar dataKey={trendKey} name={metric === "amount" ? "Raised" : "Donations"} fill={accent} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} custom={6}>
          <Card className="flex h-full flex-col">
            <SectionHead icon={CheckCircle} title="Payment status" sub={`${statusTotal} order${statusTotal === 1 ? "" : "s"}`} />
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-5">
              {statusTotal === 0 ? (
                <p className="py-8 text-sm text-text-muted">No orders yet.</p>
              ) : (
                <>
                  <DonutChart segments={statusSegments} centerValue={statusTotal} centerLabel="orders" />
                  <div className="w-full space-y-2">
                    {statusSegments.map((s) => {
                      const pct = statusTotal > 0 ? Math.round((s.value / statusTotal) * 100) : 0;
                      return (
                        <div key={s.key} className="flex items-center justify-between gap-2 text-sm">
                          <span className="inline-flex items-center gap-2 text-text-muted">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.name}
                          </span>
                          <span className="font-semibold text-primary">{s.value} <span className="text-xs font-normal text-text-muted">· {pct}%</span></span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Donation types + subscriptions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div variants={fadeUp} custom={7} className="lg:col-span-2">
          <Card className="h-full">
            <SectionHead icon={HandCoins} title="Donation types" sub={`${typeTotal} total — one-time, recurring & installment`} to="/admin/donations" />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
              {typeCards.map((t) => {
                const pct = typeTotal > 0 ? Math.round((t.value / typeTotal) * 100) : 0;
                return (
                  <div key={t.name} className="border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <span className="grid h-9 w-9 place-items-center" style={{ background: `${t.color}14`, color: t.color }}><t.icon className="h-[18px] w-[18px]" /></span>
                      <span className="font-heading text-2xl font-bold text-primary">{t.value}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-primary">{t.name}</p>
                    <div className="mt-2"><ProgressBar value={t.value} max={typeTotal} color={t.color} /></div>
                    <p className="mt-1 text-[11px] text-text-muted">{pct}% of donations</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} custom={8}>
          <Card className="flex h-full flex-col">
            <SectionHead icon={Repeat} title="Subscriptions" sub="Recurring giving health" to="/admin/subscriptions" />
            <div className="flex flex-1 flex-col gap-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-gray-100 p-3">
                  <p className="font-heading text-xl font-bold text-primary">{subs.activeSubscriptions || od.activeRecurring || 0}</p>
                  <p className="text-xs text-text-muted">Active subscriptions</p>
                </div>
                <div className="border border-gray-100 p-3">
                  <p className="font-heading text-xl font-bold text-primary">{Math.round(subs.retentionRate || 0)}%</p>
                  <p className="text-xs text-text-muted">Retention</p>
                </div>
              </div>
              <div className="flex items-center gap-3 border border-accent/20 bg-accent/5 p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center bg-accent/10 text-accent"><HeartHandshake className="h-5 w-5" /></span>
                <div>
                  <p className="font-heading text-lg font-bold leading-none text-primary">{money(subs.monthlyRecurringRevenue || od.monthlyRecurringRevenue)}</p>
                  <p className="mt-1 text-xs text-text-muted">Monthly recurring revenue</p>
                </div>
              </div>
              {subs.avgLifetimeValue > 0 && (
                <p className="flex items-center gap-2 text-sm text-text-muted">
                  <Wallet className="h-4 w-4 text-accent" /> Avg. lifetime value {money(subs.avgLifetimeValue)}
                </p>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Top donors + top causes + payment methods */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div variants={fadeUp} custom={9}>
          <Card className="h-full">
            <SectionHead icon={Users} title="Top donors" sub="By total contributed" to="/admin/donors" />
            {topDonors.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-text-muted">No donors yet.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {topDonors.map((dn, i) => (
                  <li key={dn.email || i} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-bold uppercase text-accent">
                      {(dn.name || "?").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-primary">{dn.name || "Anonymous"}</p>
                      <p className="truncate text-xs text-text-muted">{dn.email}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-accent">{money(dn.actualTotal != null ? dn.actualTotal : dn.total)}</p>
                      <p className="text-[11px] text-text-muted">{dn.donations} gift{dn.donations === 1 ? "" : "s"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} custom={10}>
          <Card className="h-full">
            <SectionHead icon={Target} title="Top causes" sub="Where the money goes" />
            {(od.topCauses || []).length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-text-muted">No data yet.</p>
            ) : (
              <ul className="space-y-3 p-5">
                {od.topCauses.map((c) => (
                  <li key={c.title}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-primary" title={c.title}>{c.title}</span>
                      <span className="shrink-0 font-semibold text-primary">{money(c.amount)}</span>
                    </div>
                    <div className="mt-1.5"><ProgressBar value={c.amount} max={maxCause} color={accent} /></div>
                    <p className="mt-1 text-[11px] text-text-muted">{c.count} donation{c.count === 1 ? "" : "s"}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} custom={11}>
          <Card className="h-full">
            <SectionHead icon={CreditCard} title="Payment methods" sub="By amount received" />
            {(od.paymentMethods || []).length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-text-muted">No data yet.</p>
            ) : (
              <ul className="space-y-3 p-5">
                {od.paymentMethods.map((m) => {
                  const Icon = METHOD_ICON[m.method] || CreditCard;
                  return (
                    <li key={m.method}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="inline-flex items-center gap-2 font-medium capitalize text-primary">
                          <Icon className="h-4 w-4 text-text-muted" /> {m.method}
                        </span>
                        <span className="shrink-0 font-semibold text-primary">{money(m.amount)}</span>
                      </div>
                      <div className="mt-1.5"><ProgressBar value={m.amount} max={maxMethod} color="#8B5CF6" /></div>
                      <p className="mt-1 text-[11px] text-text-muted">{m.count} transaction{m.count === 1 ? "" : "s"}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Recent donations */}
      {(od.recentDonations || []).length > 0 && (
        <motion.div variants={fadeUp} custom={12}>
          <Card>
            <SectionHead icon={Receipt} title="Recent donations" sub={`${od.recentDonations.length} latest`} to="/admin/donations" />
            <ul className="divide-y divide-gray-50">
              {od.recentDonations.map((d) => (
                <li key={d._id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent"><DollarSign className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary">#{d.donationId}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <p className="truncate text-[11px] text-text-muted">{d.donorName} · {fmtDate(d.createdAt)}</p>
                        <span className="bg-accent/8 px-1.5 py-0.5 text-[10px] font-medium capitalize text-accent/80">{d.donationType}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={cn("px-2 py-0.5 text-[10px] font-semibold capitalize", pill(d.paymentStatus))}>{titleCase(d.paymentStatus)}</span>
                    <span className="min-w-[70px] text-right text-sm font-semibold text-primary">{money(d.totalAmount)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <Link to="/admin/donations" className="flex items-center justify-center gap-1.5 border-t border-gray-100 px-5 py-3 text-xs font-semibold text-accent transition-colors hover:bg-accent/5">
              View all donations <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AdminDashboard;
