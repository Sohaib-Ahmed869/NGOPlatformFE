"use client"

import { useState, useEffect } from "react"
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
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

// Professional green color palette
const COLORS = {
  primary: "#0F766E",
  secondary: "#14B8A6",
  accent: "#2DD4BF",
  light: "#99F6E4",
}

const CHART_COLORS = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.light]

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-lg border border-emerald-100 ${className}`}>{children}</div>
)

const StatCard = ({ title, value, change, icon: Icon, trend, tooltip }) => (
  <Card className="p-6 hover:shadow-xl transition-shadow duration-300">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm text-gray-600 font-medium">{title}</p>
        <h3 className="text-2xl font-bold mt-1 text-[#2C2418]">{value}</h3>
        {change && (
          <div className="flex items-center mt-2">
            {trend === "up" ? (
              <ArrowUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <ArrowDown className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm ml-1 ${trend === "up" ? "text-emerald-600" : "text-red-600"}`}>{change}</span>
          </div>
        )}
      </div>
      <div className="p-4 bg-[#FAF7F2] rounded-full">
        <Icon className="w-6 h-6 text-[#C9A84C]" />
      </div>
    </div>
    {tooltip && <div className="mt-2 text-xs text-gray-500">{tooltip}</div>}
  </Card>
)

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

  // Add state for donor stats
  const [donorStats, setDonorStats] = useState({
    totalDonors: 0,
    totalAmount: 0,
    averageDonation: 0,
    recurringDonations: 0,
  })

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true)
      try {
        const [orderStats, subscriptionStats, topDonors, donorStats] = await Promise.all([
          axiosInstance.get("/admin/orders/dashboard/stats"),
          axiosInstance.get("/admin/subscriptions/dashboard/subscription-stats"),
          axiosInstance.get("/admin/orders/dashboard/top-donors"),
          axiosInstance.get("/admin/donors/dashboard/stats"), // Added donor stats endpoint
        ])

        console.log("Order Stats Response:", orderStats.data.stats)

        setDashboardData({
          orderStats: {
            // Use the new stats structure
            totalAmount: orderStats.data.stats.totalAmount || orderStats.data.stats.totalDonated || 0,
            totalAmountReceived: orderStats.data.stats.totalAmountReceived || orderStats.data.stats.paidDonated || orderStats.data.stats.paidAmount || 0,
            paidAmount: orderStats.data.stats.paidAmount || orderStats.data.stats.paidDonated || 0,
            pendingAmount: orderStats.data.stats.pendingAmount || 0,
            averageDonation: orderStats.data.stats.averageDonation || 0,
            recurringDonations: orderStats.data.stats.recurringDonations || 0,
            oneTimeDonations: orderStats.data.stats.oneTimeDonations || 0,
            installmentDonations: orderStats.data.stats.installmentDonations || 0,
            activeRecurring: orderStats.data.stats.activeRecurring || 0,
            monthlyRecurringRevenue: orderStats.data.stats.monthlyRecurringRevenue || 0,
            successRate: orderStats.data.stats.successRate || 0,
            totalDonations: orderStats.data.stats.totalDonations || 0,
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
  }, [])

  if (error) {
    return (
      <div className="p-6 text-red-600">
        <p>Error: {error}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2]/30 p-6 flex items-center justify-center">
        <p className="text-[#C9A84C]">Loading dashboard data...</p>
      </div>
    )
  }

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
      color: COLORS.primary 
    },
    { 
      name: "Pending Amount", 
      value: orderStats.pendingAmount,
      color: COLORS.accent 
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
    <div className="min-h-screen bg-[#FAF7F2]/30 lg:p-6 space-y-6">
      <div className="flex justify-between items-center flex-col lg:flex-row mt-20 lg:mt-0">
        <div>
          <h1 className="text-3xl font-bold text-[#2C2418]">Dashboard Overview</h1>
          <p className="text-[#C9A84C] mt-1">Monitor your donation metrics and impact</p>
        </div>
        <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm">
          <Calendar className="w-4 h-4 text-[#C9A84C]" />
          <span className="text-sm text-gray-600">Last updated: </span>
          <span className="text-sm font-medium text-[#2C2418]">{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard
          title="Total Donations Amount"
          value={`$${orderStats.totalAmount.toLocaleString()}`}
          icon={DollarSign}
          tooltip="Total amount of all donations from all users"
        />

        <StatCard
          title="Total Amount Received"
          value={`$${orderStats.totalAmountReceived.toLocaleString()}`}
          icon={DollarSign}
          tooltip="Total amount of payments received (including paid recurring and installments)"
        />

        <StatCard
          title="Pending Amount"
          value={`$${orderStats.pendingAmount.toLocaleString()}`}
          icon={Clock}
          tooltip="Remaining payments to be received from all users"
        />

        <StatCard
          title="Monthly Recurring Revenue"
          value={`$${orderStats.monthlyRecurringRevenue.toLocaleString()}`}
          icon={TrendingUp}
          tooltip="Monthly revenue from paid recurring transactions"
        />

        <StatCard
          title="Active Recurring"
          value={orderStats.activeRecurring}
          icon={RefreshCcw}
          tooltip="Number of active recurring and installment donations"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          title="Total Donations"
          value={orderStats.totalDonations}
          icon={Users}
          tooltip="Total number of donations made"
        />

        <StatCard
          title="One-Time Donations"
          value={orderStats.oneTimeDonations}
          icon={DollarSign}
          tooltip="Number of one-time donations"
        />

        <StatCard
          title="Recurring Donations"
          value={orderStats.recurringDonations}
          icon={RefreshCcw}
          tooltip="Number of recurring donations"
        />

        <StatCard
          title="Installment Donations"
          value={orderStats.installmentDonations}
          icon={Calendar}
          tooltip="Number of installment donations"
        />

        <StatCard
          title="Average Donation"
          value={`${orderStats.averageDonation.toLocaleString()}`}
          icon={TrendingUp}
          tooltip="Average donation amount across all users"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donations per Month Trend Chart */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-[#2C2418] mb-6">Donations per Month</h2>
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
                    stroke={COLORS.primary}
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
            <div className="bg-[#FAF7F2] rounded-lg p-3">
              <p className="text-sm text-[#C9A84C]">Total Committed</p>
              <p className="text-lg font-semibold text-[#2C2418]">${orderStats.totalAmount.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3">
              <p className="text-sm text-emerald-600">Amount Received</p>
              <p className="text-lg font-semibold text-emerald-700">
                ${orderStats.totalAmountReceived.toLocaleString()}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-sm text-orange-600">Monthly Average</p>
              <p className="text-lg font-semibold text-orange-700">
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

        {/* Payment Status Breakdown Pie Chart */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-[#2C2418] mb-6">Payment Status Breakdown</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueBreakdownData}
                  cx="50%"
                  cy="45%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                >
                  {revenueBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value.toLocaleString()}`, ""]}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "0.5rem",
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  wrapperStyle={{
                    paddingTop: "20px",
                    fontSize: "14px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-[#FAF7F2] rounded-lg p-3">
              <p className="text-sm text-[#C9A84C]">Amount Received</p>
              <p className="text-lg font-semibold text-[#2C2418]">
                ${orderStats.totalAmountReceived.toLocaleString()}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-sm text-orange-600">Pending Amount</p>
              <p className="text-lg font-semibold text-orange-700">
                ${orderStats.pendingAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        {/* Donation Types Breakdown */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-[#2C2418] mb-6">Donation Types</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={retentionData}
                  cx="50%"
                  cy="45%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                >
                  {retentionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [value, "Count"]}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "0.5rem",
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  wrapperStyle={{
                    paddingTop: "20px",
                    fontSize: "14px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="bg-[#FAF7F2] rounded-lg p-3">
              <p className="text-sm text-[#C9A84C]">One-Time</p>
              <p className="text-lg font-semibold text-[#2C2418]">{orderStats.oneTimeDonations}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3">
              <p className="text-sm text-emerald-600">Recurring</p>
              <p className="text-lg font-semibold text-emerald-700">{orderStats.recurringDonations}</p>
            </div>
            <div className="bg-cyan-50 rounded-lg p-3">
              <p className="text-sm text-cyan-600">Installments</p>
              <p className="text-lg font-semibold text-cyan-700">{orderStats.installmentDonations}</p>
            </div>
          </div>
        </Card>

        {/* Top Donors */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-[#2C2418]">Top Donors</h2>
            <Users className="w-5 h-5 text-[#C9A84C]" />
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {topDonors.map((donor, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-[#FAF7F2]/50 rounded-lg">
                <div>
                  <p className="font-medium text-[#2C2418]">{donor.name}</p>
                  <p className="text-sm text-[#C9A84C]">{donor.email}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-emerald-600">${donor.total.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">{donor.donations} donations</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard