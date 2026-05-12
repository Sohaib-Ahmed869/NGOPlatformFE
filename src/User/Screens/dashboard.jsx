import { useState, useEffect } from "react"
import { CreditCard, Calendar, DollarSign, RepeatIcon, ChevronRight, Hash, Layers } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
} from "recharts"
import axiosInstance from "../../services/axios"

const StatCard = ({ title, value, icon: Icon, color, tooltip }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg border border-emerald-100">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-[#C9A84C]">{title}</p>
        <p className="text-2xl font-bold text-[#2C2418] mt-1">{value}</p>
      </div>
      <div className="p-3 bg-[#FAF7F2] rounded-full">
        <Icon className="w-6 h-6 text-[#C9A84C]" />
      </div>
    </div>
    {tooltip && <div className="mt-2 text-xs text-[#C9A84C]">{tooltip}</div>}
  </div>
)

const DonationCard = ({ donation }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-[#C9A84C]/10 text-[#2C2418]"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-emerald-100 p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-[#2C2418]">Donation #{donation.donationId}</p>
          <p className="text-sm text-[#C9A84C] mt-1">{new Date(donation.createdAt).toLocaleDateString()}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(donation.paymentStatus)}`}>
          {donation.paymentStatus.charAt(0).toUpperCase() + donation.paymentStatus.slice(1)}
        </span>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center text-sm text-[#C9A84C]">
          <DollarSign className="w-4 h-4 mr-2 text-teal-400" />${donation.totalAmount.toFixed(2)}
        </div>
        <div className="flex items-center text-sm text-[#C9A84C]">
          <CreditCard className="w-4 h-4 mr-2 text-teal-400" />
          {donation.paymentMethod?.type ? 
            donation.paymentMethod.type.charAt(0).toUpperCase() + donation.paymentMethod.type.slice(1) :
            (typeof donation.paymentMethod === 'string' ? 
              donation.paymentMethod.charAt(0).toUpperCase() + donation.paymentMethod.slice(1) : 
              'N/A')
          }
        </div>
        {donation.paymentType === "recurring" && (
          <div className="flex items-center text-sm text-[#C9A84C]">
            <RepeatIcon className="w-4 h-4 mr-2 text-teal-400" />
            Recurring ({donation.recurringDetails?.frequency || 'N/A'})
          </div>
        )}
      </div>
    </div>
  )
}

const UserDashboard = () => {
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const [statsResponse, ordersResponse] = await Promise.all([
          axiosInstance.get("/orders/stats"),
          axiosInstance.get("/orders/my-orders"),
        ])

        // Get the updated stats from the API (includes totalDonated, paidDonated, pendingAmount, etc.)
        const baseStats = statsResponse.data.stats

        // Calculate donation type counts from the orders
        const singleDonations = ordersResponse.data.orders.filter((order) => order.paymentType === "single").length

        const recurringDonations = ordersResponse.data.orders.filter(
          (order) => order.paymentType === "recurring",
        ).length

        const installmentDonations = ordersResponse.data.orders.filter(
          (order) => order.paymentType === "installments",
        ).length

        const totalDonationCount = ordersResponse.data.orders.length
        const averageDonation = totalDonationCount > 0 ? (baseStats.totalDonated || 0) / totalDonationCount : 0
        const completedOrders = ordersResponse.data.orders.filter((order) => order.paymentStatus === "completed")

        const updatedStats = {
          ...baseStats,
          averageDonation,
          completedOrders: completedOrders.length,
          totalDonationCount,
          singleDonations,
          recurringDonations,
          installmentDonations,
        }

        setStats(updatedStats)
        setOrders(ordersResponse.data.orders)
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Format currency in USD
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="lg:p-6 mt-20 lg:mt-0 space-y-6 bg-[#FAF7F2]/30 min-h-screen">
      <h1 className="text-xl font-bold text-[#2C2418]">My Donations Dashboard</h1>

      {/* First Row - 3 KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Donations Amount"
          value={formatCurrency(stats?.totalDonated || 0)}
          icon={Hash}
          color="bg-[#FAF7F2]"
          tooltip="Total amount of all donations from user (including future recurring payments)"
        />

        <StatCard
          title="Paid Donations Amount"
          value={formatCurrency(stats?.paidDonated || 0)}
          icon={Calendar}
          color="bg-[#FAF7F2]"
          tooltip="Total amount of payments actually received"
        />

        <StatCard
          title="Average Donation"
          value={formatCurrency(stats?.averageDonation || 0)}
          icon={DollarSign}
          color="bg-[#FAF7F2]"
          tooltip="Total donations amount / Total number of donations"
        />
      </div>

      {/* Second Row - 4 KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Donations"
          value={stats?.totalDonationCount || 0}
          icon={Hash}
          color="bg-[#FAF7F2]"
          tooltip="Total count of all donations made"
        />
        <StatCard
          title="Single Donations"
          value={stats?.singleDonations || 0}
          icon={CreditCard}
          color="bg-[#FAF7F2]"
          tooltip="One-time payments"
        />
        <StatCard
          title="Recurring Donations"
          value={stats?.recurringDonations || 0}
          icon={RepeatIcon}
          color="bg-[#FAF7F2]"
          tooltip="Ongoing subscriptions"
        />
        <StatCard
          title="Installment Donations"
          value={stats?.installmentDonations || 0}
          icon={Layers}
          color="bg-[#FAF7F2]"
          tooltip="Fixed-term payments"
        />
      </div>

      {/* Charts Section - Row Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Donation Trend */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-emerald-100">
          <h2 className="text-lg font-semibold text-[#2C2418] mb-4">Monthly Donation Trend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={
                  stats?.monthlyStats
                    ?.map((item) => {
                      // More robust month parsing
                      const monthNames = [
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                      ];
                      
                      const shortMonthNames = [
                        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                      ];
                      
                      // Clean the month string
                      const cleanMonth = item.month?.toString().trim();
                      
                      // Find month index - try full names first, then short names
                      let monthIndex = monthNames.findIndex(m => 
                        m.toLowerCase() === cleanMonth?.toLowerCase()
                      );
                      
                      if (monthIndex === -1) {
                        monthIndex = shortMonthNames.findIndex(m => 
                          m.toLowerCase() === cleanMonth?.toLowerCase()
                        );
                      }
                      
                      // If still not found, try parsing as number
                      if (monthIndex === -1 && !isNaN(cleanMonth)) {
                        monthIndex = parseInt(cleanMonth) - 1;
                      }
                      
                      // Default to 0 if parsing failed
                      if (monthIndex === -1) {
                        monthIndex = 0;
                      }
                      
                      return {
                        ...item,
                        monthNumber: monthIndex + 1,
                        monthName: shortMonthNames[monthIndex],
                        count: item.count || 0,
                      };
                    })
                    // Sort by month number to ensure correct order
                    .sort((a, b) => a.monthNumber - b.monthNumber) || []
                }
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="monthName"
                  label={{ value: "Month", position: "insideBottomRight", offset: -5 }}
                  tickFormatter={(value) => value}
                />
                <YAxis
                  label={{ value: "Donations", angle: -90, position: "insideLeft", offset: 15 }}
                  tickMargin={10}
                  width={80}
                  domain={[0, "dataMax + 5"]}
                />
                <Tooltip formatter={(value) => [`${value} donations`, "Count"]} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Number of Donations"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ stroke: "#059669", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donation Types Pie Chart */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-emerald-100">
          <h2 className="text-lg font-semibold text-[#2C2418] mb-4">Donation Types Distribution</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Single Donations", value: stats?.singleDonations || 0, fill: "#059669" },
                    { name: "Recurring Donations", value: stats?.recurringDonations || 0, fill: "#10B981" },
                    { name: "Installment Donations", value: stats?.installmentDonations || 0, fill: "#34D399" },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                ></Pie>
                <Tooltip formatter={(value, name) => [`${value} donations`, name]} />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Paid vs Pending Donations Chart */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-emerald-100">
        <h2 className="text-lg font-semibold text-[#2C2418] mb-4">Donation Status Overview</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: "Paid Donations", value: stats?.paidDonated || 0, fill: "#059669" },
                  { name: "Pending Donations", value: stats?.pendingAmount || 0, fill: "#F59E0B" },
                ]}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent, value }) => 
                  value > 0 ? `${name}: ${formatCurrency(value)} (${(percent * 100).toFixed(0)}%)` : ''
                }
              ></Pie>
              <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
              <Legend layout="vertical" verticalAlign="middle" align="right" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Donations */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-emerald-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-[#2C2418]">Recent Donations</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.slice(0, 6).map((order) => (
            <DonationCard key={order._id} donation={order} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default UserDashboard