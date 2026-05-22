"use client"

import { useState, useEffect } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import { DollarSign, TrendingUp, Users, Calendar, ArrowUp, ArrowDown, Clock, RefreshCcw } from "lucide-react"
import axiosInstance from "../../services/axios"
import Loader from "../../components/Loader"
import KpiCard, { DEFAULT_SPARKS } from "../../components/KpiCard"

// Chart colors read from CSS variables at runtime
function getChartColors() {
  const s = getComputedStyle(document.documentElement);
  const a = s.getPropertyValue("--tenant-accent").trim() || "#C9A84C";
  const p = s.getPropertyValue("--tenant-primary").trim() || "#2C2418";
  const al = s.getPropertyValue("--tenant-accent-light").trim() || "#D4B85A";
  return [a, p, al, "#8B7E6A"];
}

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-lg border border-gray-100 ${className}`}>{children}</div>
)

const DONUT_COLORS = ["#34D399", "#818CF8", "#FB923C", "#F472B6", "#38BDF8", "#FBBF24"];

/* SVG Donut with rounded caps */
const DonutChart = ({ segments, size = 160, label }) => {
  const r = 58; const c = 2 * Math.PI * r; const gap = 8;
  let offset = 0;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  return (
    <svg width={size} height={size} viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
      {total > 0 && segments.filter(s => s.value > 0).map((seg, i) => {
        const pct = seg.value / total;
        const dashLen = Math.max(0, pct * c - gap);
        const el = (
          <circle key={i} cx="70" cy="70" r={r} fill="none"
            stroke={seg.color} strokeWidth="16" strokeLinecap="round"
            strokeDasharray={`${dashLen} ${c - dashLen}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 70 70)" />
        );
        offset += pct * c;
        return el;
      })}
      <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="700" fill="currentColor" className="text-primary">{total}</text>
      <text x="70" y="82" textAnchor="middle" fontSize="10" fill="#94a3b8">{label || "total"}</text>
    </svg>
  );
};


const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dashboardData, setDashboardData] = useState({
    orderStats: {
      totalAmount: 0,
      totalAmountReceived: 0,
      paidAmount: 0,
      pendingAmount: 0,
      averageDonation: 0,
      recurringDonations: 0,
      oneTimeDonations: 0,
      installmentDonations: 0,
      activeRecurring: 0,
      monthlyRecurringRevenue: 0,
      successRate: 0,
    },
    subscriptionStats: {
      activeSubscriptions: 0,
      monthlyRecurringRevenue: 0,
      retentionRate: 0,
      avgLifetimeValue: 0,
      trendData: [],
    },
    topDonors: [],
    recentActivity: [],
  })

  const [donorStats, setDonorStats] = useState({
    totalDonors: 0,
    totalAmount: 0,
    averageDonation: 0,
    recurringDonations: 0,
  })
  const [dateFilter, setDateFilter] = useState("all")

  const getDateRange = (preset) => {
    const now = new Date();
    const params = {};
    if (preset === "7d") {
      params.startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
    } else if (preset === "15d") {
      params.startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 15).toISOString();
    } else if (preset === "30d") {
      params.startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
    } else if (preset === "90d") {
      params.startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString();
    }
    return params;
  };

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true)
      try {
        const dateParams = getDateRange(dateFilter);
        const [orderStats, subscriptionStats, topDonors, donorStats] = await Promise.all([
          axiosInstance.get("/admin/orders/dashboard/stats", { params: dateParams }),
          axiosInstance.get("/admin/subscriptions/dashboard/subscription-stats"),
          axiosInstance.get("/admin/orders/dashboard/top-donors"),
          axiosInstance.get("/admin/donors/dashboard/stats"), // Added donor stats endpoint
        ])

        console.log("Order Stats Response:", orderStats.data.stats)

        const s = orderStats.data.stats;
        setDashboardData({
          orderStats: {
            totalAmount: s.totalAmount || s.totalDonated || 0,
            totalAmountReceived: s.totalAmountReceived || s.paidDonated || s.paidAmount || 0,
            paidAmount: s.paidAmount || s.paidDonated || 0,
            pendingAmount: s.pendingAmount || 0,
            averageDonation: s.averageDonation || 0,
            recurringDonations: s.recurringDonations || 0,
            oneTimeDonations: s.oneTimeDonations || 0,
            installmentDonations: s.installmentDonations || 0,
            activeRecurring: s.activeRecurring || 0,
            monthlyRecurringRevenue: s.monthlyRecurringRevenue || 0,
            successRate: s.successRate || 0,
            totalDonations: s.totalDonations || 0,
            monthlyTrend: s.monthlyTrend || [],
            recentDonations: s.recentDonations || [],
          },
          subscriptionStats: subscriptionStats.data.data.stats,
          topDonors: topDonors.data.topDonors,
        })

        // Set donor stats separately
        setDonorStats(
          donorStats.data.data.stats || {
            totalDonors: 0,
            totalAmount: 0,
            averageDonation: 0,
            recurringDonations: 0,
          },
        )
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
        setError("Failed to load dashboard data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [dateFilter])

  if (error) {
    return (
      <div className="p-6 text-red-600">
        <p>Error: {error}</p>
      </div>
    )
  }

  if (isLoading) return <Loader />

  const { orderStats, subscriptionStats, topDonors } = dashboardData

  // Calculate total donations count from topDonors data
  // Sum up the donations count from each top donor
  const totalDonationsCount = topDonors.reduce((total, donor) => total + donor.donations, 0)

  // Generate donor retention data based on available information
  const retentionData = [
    { name: "One-Time", value: orderStats.oneTimeDonations || 0 },
    { name: "Recurring", value: orderStats.recurringDonations || 0 },
    { name: "Installments", value: orderStats.installmentDonations || 0 },
  ]

  // Create revenue breakdown data for the pie chart
  const revenueBreakdownData = [
    { 
      name: "Amount Received", 
      value: orderStats.totalAmountReceived,
      color: getChartColors()[0] 
    },
    { 
      name: "Pending Amount", 
      value: orderStats.pendingAmount,
      color: getChartColors()[2] 
    },
  ]

  // Create revenue breakdown data for the stacked area chart
  const processSubscriptionTrendData = () => {
    // Check if we have subscription trend data, otherwise create fallback data
    if (!subscriptionStats.trendData || subscriptionStats.trendData.length === 0) {
      // Create fallback data based on current stats
      const currentDate = new Date()
      const currentMonth = currentDate.toLocaleString('default', { month: 'long' })
      const currentYear = currentDate.getFullYear()
      
      return [{
        month: currentMonth,
        year: currentYear,
        amount: orderStats.totalAmountReceived || 0,
        count: orderStats.totalDonations || 0,
        recurring: orderStats.recurringDonations || 0,
        oneTime: orderStats.oneTimeDonations || 0,
        monthNumber: currentDate.getMonth() + 1,
        newRevenue: Math.round((orderStats.totalAmountReceived || 0) * 0.3),
        retainedRevenue: Math.round((orderStats.totalAmountReceived || 0) * 0.7),
        displayLabel: `${currentMonth.substring(0, 3)} ${currentYear}`,
      }]
    }

    return subscriptionStats.trendData
      .map((item) => {
        // Use the month and year directly from the API response
        const monthName = item.month || 'Unknown'
        const year = item.year || new Date().getFullYear()
        const monthNumber = new Date(`${monthName} 1, ${year}`).getMonth() + 1
        
        return {
          ...item,
          monthNumber,
          displayLabel: `${monthName.substring(0, 3)} ${year}`,
          // Calculate new vs retained revenue (estimated)
          newRevenue: Math.round((item.amount || 0) * 0.3),
          retainedRevenue: Math.round((item.amount || 0) * 0.7),
        }
      })
      .sort((a, b) => {
        // First sort by year
        if (a.year !== b.year) {
          return a.year - b.year
        }
        // Then sort by month number
        return a.monthNumber - b.monthNumber
      })
  }

  const processedTrendData = processSubscriptionTrendData()

  // Helper function to calculate adaptive Y-axis ticks
  const getAdaptiveTicks = (data) => {
    if (!data || data.length === 0) return [0, 10, 20, 30]
    
    const maxValue = Math.max(...data.map(item => item.amount || 0))
    
    if (maxValue === 0) return [0, 10, 20, 30]
    
    // Determine appropriate tick interval based on max value
    let tickInterval
    if (maxValue <= 50) tickInterval = 5
    else if (maxValue <= 100) tickInterval = 10
    else if (maxValue <= 500) tickInterval = 50
    else if (maxValue <= 1000) tickInterval = 100
    else tickInterval = Math.ceil(maxValue / 10 / 100) * 100
    
    // Calculate number of ticks (aim for 5-8 ticks)
    const maxTick = Math.ceil(maxValue / tickInterval) * tickInterval
    const ticks = []
    for (let i = 0; i <= maxTick; i += tickInterval) {
      ticks.push(i)
    }
    
    return ticks
  }

  const calculateTickValues = (data, key = "amount", increment = 100) => {
    if (!data || data.length === 0) return [0, 100, 200, 300, 400, 500]

    // Find the maximum value in the data
    const maxValue = Math.max(
      ...data.map((item) => {
        if (Array.isArray(key)) {
          return Math.max(...key.map((k) => item[k] || 0))
        }
        return item[key] || 0
      }),
    )

    // Round up to the next increment
    const maxTick = Math.ceil(maxValue / increment) * increment

    // Generate tick values from 0 to maxTick in steps of increment
    const ticks = []
    for (let i = 0; i <= maxTick; i += increment) {
      ticks.push(i)
    }

    return ticks
  }

  return (
    <div className="min-h-screen bg-background/30 lg:p-6 space-y-6">
      <div className="flex justify-between items-start flex-col lg:flex-row gap-4 mt-20 lg:mt-0">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">Dashboard Overview</h1>
          <p className="text-sm text-text-muted mt-0.5">Monitor your donation metrics and impact</p>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-gray-100 shadow-sm">
          {[
            { key: "all", label: "All Time" },
            { key: "90d", label: "90 Days" },
            { key: "30d", label: "30 Days" },
            { key: "15d", label: "15 Days" },
            { key: "7d", label: "This Week" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setDateFilter(key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                dateFilter === key
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-muted hover:text-primary hover:bg-gray-50"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard title="Total Donations" value={`$${orderStats.totalAmount.toLocaleString()}`}
          icon={DollarSign} color="#059669"
          sparkData={orderStats.monthlyTrend?.map(m => m.amount)} defaultSpark={DEFAULT_SPARKS.rising} />
        <KpiCard title="Amount Received" value={`$${orderStats.totalAmountReceived.toLocaleString()}`}
          icon={DollarSign} color="#10B981"
          sparkData={orderStats.monthlyTrend?.map(m => m.count)} defaultSpark={DEFAULT_SPARKS.steady} />
        <KpiCard title="Pending" value={`$${orderStats.pendingAmount.toLocaleString()}`}
          icon={Clock} color="#F59E0B" defaultSpark={DEFAULT_SPARKS.dip} />
        <KpiCard title="Monthly Recurring" value={`$${orderStats.monthlyRecurringRevenue.toLocaleString()}`}
          icon={TrendingUp} color="#EC4899" defaultSpark={DEFAULT_SPARKS.wave} />
        <KpiCard title="Active Recurring" value={orderStats.activeRecurring}
          icon={RefreshCcw} color="#06B6D4"
          delta={`${Math.round(orderStats.successRate || 0)}% success`} defaultSpark={DEFAULT_SPARKS.rising} />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Total Count" value={orderStats.totalDonations}
          icon={Users} color="#059669" defaultSpark={DEFAULT_SPARKS.rising} />
        <KpiCard title="One-Time" value={orderStats.oneTimeDonations}
          icon={DollarSign} color="#10B981" defaultSpark={DEFAULT_SPARKS.steady} />
        <KpiCard title="Recurring" value={orderStats.recurringDonations}
          icon={RefreshCcw} color="#EC4899" defaultSpark={DEFAULT_SPARKS.dip} />
        <KpiCard title="Installments" value={orderStats.installmentDonations}
          icon={Calendar} color="#F59E0B" defaultSpark={DEFAULT_SPARKS.flat} />
        <KpiCard title="Average" value={`$${Math.round(orderStats.averageDonation).toLocaleString()}`}
          icon={TrendingUp} color="#06B6D4" defaultSpark={DEFAULT_SPARKS.wave} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donations per Month Trend Chart */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-primary mb-6">Donations per Month</h2>
          <div className="h-80">
            {processedTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={processedTrendData}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="displayLabel" 
                    stroke="#374151" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="#374151"
                    tickFormatter={(value) => `${value}`}
                    domain={[0, "dataMax + 10"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(value, name) => [`${value}`, name === "amount" ? "Donations" : name]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Donations"
                    stroke={getChartColors()[0]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No donation data available</p>
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-background rounded-lg p-3">
              <p className="text-sm text-accent">Total Committed</p>
              <p className="text-lg font-semibold text-primary">${orderStats.totalAmount.toLocaleString()}</p>
            </div>
            <div className="bg-accent/10 rounded-lg p-3">
              <p className="text-sm text-accent">Amount Received</p>
              <p className="text-lg font-semibold text-accent">
                ${orderStats.totalAmountReceived.toLocaleString()}
              </p>
            </div>
            <div className="bg-accent/5 rounded-lg p-3">
              <p className="text-sm text-text-muted">Monthly Average</p>
              <p className="text-lg font-semibold text-primary">
                $
                {processedTrendData.length > 0
                  ? Math.round(
                      processedTrendData.reduce((sum, item) => sum + item.amount, 0) / processedTrendData.length,
                    ).toLocaleString()
                  : Math.round(orderStats.totalAmountReceived / Math.max(1, processedTrendData.length || 1)).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        {/* Payment Status Donut */}
        <Card className="p-6 flex flex-col items-center">
          <h2 className="text-lg font-semibold text-primary mb-6 self-start">Payment Status</h2>
          <DonutChart label="payments" segments={[
            { name: "Received", value: orderStats.totalAmountReceived || 0, color: DONUT_COLORS[0] },
            { name: "Pending", value: orderStats.pendingAmount || 0, color: DONUT_COLORS[2] },
          ]} />
          <div className="flex gap-4 mt-4">
            {[
              { name: "Received", color: DONUT_COLORS[0], val: `$${orderStats.totalAmountReceived?.toLocaleString()}` },
              { name: "Pending", color: DONUT_COLORS[2], val: `$${orderStats.pendingAmount?.toLocaleString()}` },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                <span className="text-[11px] text-text-muted">{item.name}: {item.val}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Donation Types Donut */}
        <Card className="p-6 flex flex-col items-center">
          <h2 className="text-lg font-semibold text-primary mb-6 self-start">Donation Types</h2>
          <DonutChart label="donations" segments={[
            { name: "One-Time", value: orderStats.oneTimeDonations || 0, color: DONUT_COLORS[0] },
            { name: "Recurring", value: orderStats.recurringDonations || 0, color: DONUT_COLORS[1] },
            { name: "Installments", value: orderStats.installmentDonations || 0, color: DONUT_COLORS[2] },
          ]} />
          <div className="flex gap-4 mt-4">
            {[
              { name: "One-Time", color: DONUT_COLORS[0], val: orderStats.oneTimeDonations },
              { name: "Recurring", color: DONUT_COLORS[1], val: orderStats.recurringDonations },
              { name: "Installments", color: DONUT_COLORS[2], val: orderStats.installmentDonations },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                <span className="text-[11px] text-text-muted">{item.name} ({item.val})</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Donors */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-primary">Top Donors</h2>
            <Users className="w-5 h-5 text-accent" />
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {topDonors.map((donor, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                <div>
                  <p className="font-medium text-primary">{donor.name}</p>
                  <p className="text-sm text-accent">{donor.email}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-accent">${donor.total.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">{donor.donations} donations</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Donations */}
      {orderStats.recentDonations?.length > 0 && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-primary">Recent Donations</h2>
            <span className="text-[11px] text-text-muted">{orderStats.recentDonations.length} latest</span>
          </div>
          <div>
            {orderStats.recentDonations.map((d) => {
              const statusStyles = {
                completed: "bg-green-50 text-green-700",
                pending: "bg-yellow-50 text-yellow-700",
                processing: "bg-blue-50 text-blue-700",
                failed: "bg-red-50 text-red-700",
                active: "bg-green-50 text-green-700",
              };
              return (
                <div key={d._id} className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">#{d.donationId}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-text-muted">{d.donorName} · {new Date(d.createdAt).toLocaleDateString()}</p>
                        <span className="text-[10px] bg-accent/8 text-accent/80 px-1.5 py-0.5 rounded font-medium capitalize">{d.donationType}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${statusStyles[d.paymentStatus] || "bg-gray-100 text-gray-600"}`}>
                      {d.paymentStatus}
                    </span>
                    <span className="text-sm font-semibold text-primary min-w-[70px] text-right">
                      ${d.totalAmount?.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

export default AdminDashboard