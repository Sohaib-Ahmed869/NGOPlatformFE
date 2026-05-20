import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, Calendar, DollarSign, RepeatIcon, Hash, Layers, TrendingUp } from "lucide-react";
import Loader from "../../components/Loader";
import KpiCard, { DEFAULT_SPARKS } from "../../components/KpiCard";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import axiosInstance from "../../services/axios";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

const getThemeColor = (varName, fallback) => {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
};

// Soft donut colors
const DONUT_COLORS = ["#34D399", "#818CF8", "#FB923C", "#F472B6", "#38BDF8", "#FBBF24"];

/* SVG Donut with rounded stroke caps and gaps */
const DonutChart = ({ segments, size = 160 }) => {
  const r = 58;
  const c = 2 * Math.PI * r;
  const gap = 8; // gap in stroke-dasharray units
  let offset = 0;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
        </svg>
      </div>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const pct = seg.value / total;
        const dashLen = Math.max(0, pct * c - gap);
        const dashGap = c - dashLen;
        const el = (
          <circle key={i} cx="70" cy="70" r={r} fill="none"
            stroke={seg.color} strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${dashLen} ${dashGap}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 70 70)"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        );
        offset += pct * c;
        return el;
      })}
      <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="700" fill="currentColor" className="text-primary">{total}</text>
      <text x="70" y="82" textAnchor="middle" fontSize="10" fill="#94a3b8">total</text>
    </svg>
  );
};

const DonationRow = ({ donation, formatCurrency }) => {
  const statusStyles = {
    completed: "bg-green-50 text-green-700",
    pending: "bg-yellow-50 text-yellow-700",
    processing: "bg-blue-50 text-blue-700",
    failed: "bg-red-50 text-red-700",
  };
  const typeLabel = donation.donationType || donation.items?.[0]?.donationType || donation.paymentType || "Donation";

  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
          <DollarSign className="w-4 h-4 text-accent" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">#{donation.donationId}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[11px] text-text-muted">{new Date(donation.createdAt).toLocaleDateString()}</p>
            <span className="text-[10px] text-accent/80 bg-accent/8 px-1.5 py-0.5 rounded font-medium capitalize">{typeLabel}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${statusStyles[donation.paymentStatus] || "bg-gray-100 text-gray-600"}`}>
          {donation.paymentStatus}
        </span>
        <span className="text-sm font-semibold text-primary min-w-[70px] text-right">
          {formatCurrency(donation.totalAmount)}
        </span>
      </div>
    </div>
  );
};

const CHART_COLORS = ["var(--tenant-accent, #C9A84C)", "var(--tenant-primary, #2C2418)", "#94a3b8"];

const UserDashboard = () => {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsResponse, ordersResponse] = await Promise.all([
          axiosInstance.get("/orders/stats"),
          axiosInstance.get("/orders/my-orders"),
        ]);

        const baseStats = statsResponse.data.stats;
        const allOrders = ordersResponse.data.orders;

        const singleDonations = allOrders.filter((o) => o.paymentType === "single").length;
        const recurringDonations = allOrders.filter((o) => o.paymentType === "recurring").length;
        const installmentDonations = allOrders.filter((o) => o.paymentType === "installments").length;
        const totalDonationCount = allOrders.length;
        const averageDonation = totalDonationCount > 0 ? (baseStats.totalDonated || 0) / totalDonationCount : 0;

        setStats({
          ...baseStats,
          averageDonation,
          completedOrders: allOrders.filter((o) => o.paymentStatus === "completed").length,
          totalDonationCount,
          singleDonations,
          recurringDonations,
          installmentDonations,
        });
        setOrders(allOrders);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);

  if (loading) return <Loader />;

  // Chart data
  const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = (stats?.monthlyStats || [])
    .map((item) => {
      const clean = item.month?.toString().trim();
      let idx = shortMonthNames.findIndex((m) => m.toLowerCase() === clean?.toLowerCase());
      if (idx === -1) {
        const fullNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        idx = fullNames.findIndex((m) => m.toLowerCase() === clean?.toLowerCase());
      }
      if (idx === -1 && !isNaN(clean)) idx = parseInt(clean) - 1;
      if (idx === -1) idx = 0;
      return { month: shortMonthNames[idx], monthNum: idx + 1, count: item.count || 0 };
    })
    .sort((a, b) => a.monthNum - b.monthNum);

  const pieData = [
    { name: "Single", value: stats?.singleDonations || 0 },
    { name: "Recurring", value: stats?.recurringDonations || 0 },
    { name: "Installment", value: stats?.installmentDonations || 0 },
  ].filter((d) => d.value > 0);

  const accentColor = getThemeColor("--tenant-accent", "#C9A84C");
  const primaryColor = getThemeColor("--tenant-primary", "#2C2418");

  // Real sparkline data from monthly stats
  const sparkAmounts = monthlyData.map((d) => d.count);
  // Monthly totals for amount sparkline
  const monthlyAmounts = (stats?.monthlyStats || [])
    .map((item) => item.total || 0)
    .slice(-6);

  return (
    <motion.div
      className="lg:p-6 mt-20 lg:mt-0 min-h-screen"
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={fadeUp} custom={0} className="mb-6">
        <h1 className="text-xl font-heading font-bold text-primary">My Donations</h1>
        <p className="text-sm text-text-muted mt-0.5">Track your giving and impact</p>
      </motion.div>

      {/* KPI Row 1 — Financial */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <KpiCard title="Total Donated" value={formatCurrency(stats?.totalDonated)} icon={DollarSign}
          color={accentColor} sparkData={monthlyAmounts} defaultSpark={DEFAULT_SPARKS.rising} index={1} />
        <KpiCard title="Paid Amount" value={formatCurrency(stats?.paidDonated)} icon={CreditCard}
          color="#8B5CF6" sparkData={sparkAmounts} defaultSpark={DEFAULT_SPARKS.steady} index={2} />
        <KpiCard title="Average Donation" value={formatCurrency(stats?.averageDonation)} icon={TrendingUp}
          color="#06B6D4" defaultSpark={DEFAULT_SPARKS.wave} index={3} />
      </div>

      {/* KPI Row 2 — Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total Donations" value={stats?.totalDonationCount || 0} icon={Hash}
          color={accentColor} delta={`${stats?.completedOrders || 0} completed`} defaultSpark={DEFAULT_SPARKS.rising} index={4} />
        <KpiCard title="One-Time" value={stats?.singleDonations || 0} icon={CreditCard}
          color="#059669" defaultSpark={DEFAULT_SPARKS.steady} index={5} />
        <KpiCard title="Recurring" value={stats?.recurringDonations || 0} icon={RepeatIcon}
          color="#8B5CF6" defaultSpark={DEFAULT_SPARKS.dip} index={6} />
        <KpiCard title="Installments" value={stats?.installmentDonations || 0} icon={Layers}
          color="#F59E0B" defaultSpark={DEFAULT_SPARKS.flat} index={7} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Area Chart — 2 cols */}
        <motion.div variants={fadeUp} custom={9}
          className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-semibold text-primary mb-4">Monthly Trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="donationGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                  formatter={(value) => [`${value} donations`, "Count"]}
                />
                <Area type="monotone" dataKey="count" stroke={accentColor} strokeWidth={2.5}
                  fill="url(#donationGrad)" dot={{ fill: accentColor, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Donut Chart — 1 col */}
        <motion.div variants={fadeUp} custom={10}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col items-center justify-center">
          <h2 className="text-sm font-semibold text-primary mb-4 self-start">Donation Types</h2>
          <DonutChart segments={[
            { name: "Single", value: stats?.singleDonations || 0, color: DONUT_COLORS[0] },
            { name: "Recurring", value: stats?.recurringDonations || 0, color: DONUT_COLORS[1] },
            { name: "Installment", value: stats?.installmentDonations || 0, color: DONUT_COLORS[2] },
          ]} />
          <div className="flex gap-4 mt-4">
            {[
              { name: "Single", color: DONUT_COLORS[0], val: stats?.singleDonations || 0 },
              { name: "Recurring", color: DONUT_COLORS[1], val: stats?.recurringDonations || 0 },
              { name: "Installment", color: DONUT_COLORS[2], val: stats?.installmentDonations || 0 },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                <span className="text-[11px] text-text-muted">{item.name} ({item.val})</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Donations Table */}
      <motion.div variants={fadeUp} custom={11}
        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-primary">Recent Donations</h2>
          <span className="text-[11px] text-text-muted">{orders.length} total</span>
        </div>
        {orders.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-muted">No donations yet</div>
        ) : (
          <div>
            {orders.slice(0, 8).map((order) => (
              <DonationRow key={order._id} donation={order} formatCurrency={formatCurrency} />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default UserDashboard;
