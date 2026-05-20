import React, { useState, useEffect } from "react";
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  RefreshCw,
  AlertCircle,
  PieChartIcon,
  Loader2
} from "lucide-react";
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
  Cell,
  Legend,
} from "recharts";
import axiosInstance from "../../services/axios";
import SubscriptionService from "../../services/subscription.service";
import toast from "react-hot-toast";
import Modal from "../../components/Modal";

const ITEMS_PER_PAGE = 10;

// Colors for the pie chart
const COLORS = ["#059669", "#10B981", "#34D399", "#6EE7B7"];

// Loader Component
const LoaderSpinner = ({ size = "default", className = "" }) => {
  const sizeClasses = {
    small: "w-4 h-4",
    default: "w-6 h-6",
    large: "w-8 h-8"
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
};

// Full Page Loader
const PageLoader = () => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <LoaderSpinner size="large" className="text-accent" />
      <p className="text-accent font-medium">Loading subscriptions...</p>
    </div>
  </div>
);

// Stats Card Loader
const StatsCardLoader = () => (
  <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-2 bg-gray-200 rounded w-full"></div>
      </div>
      <div className="p-3 bg-gray-100 rounded-full">
        <div className="w-6 h-6 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

// Chart Loader
const ChartLoader = () => (
  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="h-64 bg-gray-100 rounded"></div>
  </div>
);

// Table Loader
const TableLoader = () => (
  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
    <div className="animate-pulse">
      {/* Search and Filters Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
        <div className="flex gap-2 w-full md:w-auto">
          <div className="h-10 bg-gray-200 rounded-lg w-64"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
        </div>
      </div>
      
      {/* Table Header Skeleton */}
      <div className="space-y-3">
        <div className="grid grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
        
        {/* Table Rows Skeleton */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-7 gap-4 py-4 border-t border-gray-100">
            {Array.from({ length: 7 }).map((_, j) => (
              <div key={j} className="h-4 bg-gray-100 rounded"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SubscriptionsPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFrequency, setSelectedFrequency] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortConfig, setSortConfig] = useState({
    key: "startDate",
    direction: "desc",
  });
  const [activeSubscription, setActiveSubscription] = useState([]);
  
  // State for API data
  const [subscriptions, setSubscriptions] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    activeSubscriptions: 0,
    monthlyRecurringRevenue: 0,
    retentionRate: 0,
    avgLifetimeValue: 0,
    trendData: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isChartsLoading, setIsChartsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    currentPage: 1,
    perPage: ITEMS_PER_PAGE,
  });
  
  // New state for subscription stats
  const [subscriptionStats, setSubscriptionStats] = useState({
    totalSubscriptions: 0,
    dailySubscriptions: 0,
    weeklySubscriptions: 0,
    monthlySubscriptions: 0,
    yearlySubscriptions: 0
  });

  // State for status distribution data
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [allStatusDistribution, setAllStatusDistribution] = useState([]);

  const [showCancelRequestDialog, setShowCancelRequestDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [cancelAction, setCancelAction] = useState(null);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchDashboardStats = async () => {
      setIsStatsLoading(true);
      try {
        const response = await axiosInstance.get(
          "/admin/subscriptions/dashboard/subscription-stats"
        );
        console.log("Stats response:", response.data);
        if (response.data?.status === "Success") {
          setDashboardStats(response.data.data.stats || {
            activeSubscriptions: 0,
            monthlyRecurringRevenue: 0,
            retentionRate: 0,
            avgLifetimeValue: 0,
            trendData: [],
          });
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        setError("Failed to load dashboard statistics");
      } finally {
        setIsStatsLoading(false);
      }
    };

    const fetchActiveSubscriptions = async () => {
      try {
        const response = await SubscriptionService.getActiveSubscriptions();

        if (response.status === "Success") {
          // Include all active, paused, and past_due subscriptions
          const relevantSubs = response.subscriptions.filter(
            (sub) =>
              sub.status !== "cancelled" &&
              sub.status !== "failed" &&
              sub.status !== "canceled" &&
              sub.status !== "ended"
          );
          setActiveSubscription(relevantSubs);
          console.log("Subscriptions fetched:", relevantSubs);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    fetchDashboardStats();
    fetchActiveSubscriptions();
    // Fetch frequency stats from all subscriptions, not just the paginated ones
    fetchSubscriptionFrequencyStats();
    // Fetch status distribution for all subscriptions
    fetchAllSubscriptionStatusDistribution();
  }, []);
  
  // New function to fetch status distribution for all subscriptions
  const fetchAllSubscriptionStatusDistribution = async () => {
    setIsChartsLoading(true);
    try {
      // Get all subscriptions without pagination for status distribution
      const response = await axiosInstance.get("/admin/subscriptions", {
        params: {
          limit: 1000, // Set a high limit to get all subscriptions
          page: 1
        },
      });
      
      if (response.data?.status === "Success") {
        const allSubscriptions = response.data.data.subscriptions || [];
        
        // Calculate status distribution for pie chart from all subscriptions
        const statusCounts = {};
        allSubscriptions.forEach(sub => {
          const status = sub.status || 'unknown';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        // Convert to array format for recharts
        const statusData = Object.keys(statusCounts).map(status => ({
          name: status.charAt(0).toUpperCase() + status.slice(1),
          value: statusCounts[status]
        }));
        
        setAllStatusDistribution(statusData);
      }
    } catch (error) {
      console.error("Failed to fetch all subscription status data:", error);
    } finally {
      setIsChartsLoading(false);
    }
  };
  
  // New function to fetch subscription frequency stats for all subscriptions
  const fetchSubscriptionFrequencyStats = async () => {
    try {
      // This endpoint should return counts for all subscriptions grouped by frequency
      const response = await axiosInstance.get("/admin/subscriptions/frequency-stats");
      
      if (response.data?.status === "Success") {
        // Update the stats with the complete data
        setSubscriptionStats({
          totalSubscriptions: response.data.data.total || 0,
          dailySubscriptions: response.data.data.daily || 0,
          weeklySubscriptions: response.data.data.weekly || 0,
          monthlySubscriptions: response.data.data.monthly || 0,
          yearlySubscriptions: response.data.data.yearly || 0
        });
      }
    } catch (error) {
      console.error("Failed to fetch subscription frequency stats:", error);
      // If the endpoint doesn't exist, we can fallback to calculating from all pages
      fetchAllSubscriptionsForStats();
    }
  };
  
  // Fallback method to get all subscriptions for accurate stats if the API endpoint doesn't exist
  const fetchAllSubscriptionsForStats = async () => {
    try {
      // Get all subscriptions without pagination for accurate stats
      const response = await axiosInstance.get("/admin/subscriptions", {
        params: {
          limit: 1000, // Set a high limit to get all subscriptions
          page: 1
        },
      });
      
      if (response.data?.status === "Success") {
        const allSubscriptions = response.data.data.subscriptions || [];
        const totalCount = response.data.data.pagination?.total || allSubscriptions.length;
        
        // Count subscriptions by frequency
        const dailyCount = allSubscriptions.filter(sub => 
          sub.frequency?.toLowerCase() === 'daily').length;
        const weeklyCount = allSubscriptions.filter(sub => 
          sub.frequency?.toLowerCase() === 'weekly').length;
        const monthlyCount = allSubscriptions.filter(sub => 
          sub.frequency?.toLowerCase() === 'monthly').length;
        const yearlyCount = allSubscriptions.filter(sub => 
          sub.frequency?.toLowerCase() === 'yearly').length;
          
        setSubscriptionStats({
          totalSubscriptions: totalCount,
          dailySubscriptions: dailyCount,
          weeklySubscriptions: weeklyCount,
          monthlySubscriptions: monthlyCount,
          yearlySubscriptions: yearlyCount
        });
      }
    } catch (error) {
      console.error("Failed to fetch all subscriptions for stats:", error);
    }
  };
  
  // Fetch subscriptions with filters and pagination
  useEffect(() => {
    const fetchSubscriptions = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get("/admin/subscriptions", {
          params: {
            page: currentPage,
            limit: ITEMS_PER_PAGE,
            search: searchTerm,
            frequency:
              selectedFrequency !== "All"
                ? selectedFrequency.toLowerCase()
                : undefined,
            status:
              selectedStatus !== "All"
                ? selectedStatus.toLowerCase()
                : undefined,
            sortBy: sortConfig.key,
            sortOrder: sortConfig.direction,
          },
        });
        console.log("Subscriptions response:", response.data);
        if (response.data?.status === "Success") {
          const allSubscriptions = response.data.data.subscriptions || [];
          setSubscriptions(allSubscriptions);
          setPagination(response.data.data.pagination || {
            total: 0,
            pages: 0,
            currentPage: 1,
            perPage: ITEMS_PER_PAGE,
          });
          
          // Calculate status distribution for current page subscriptions
          const statusCounts = {};
          allSubscriptions.forEach(sub => {
            const status = sub.status || 'unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });
          
          // Convert to array format for recharts
          const statusData = Object.keys(statusCounts).map(status => ({
            name: status.charAt(0).toUpperCase() + status.slice(1),
            value: statusCounts[status]
          }));
          
          setStatusDistribution(statusData);
        }
      } catch (error) {
        console.error("Failed to fetch subscriptions:", error);
        setError("Failed to load subscriptions");
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSubscriptions, 300);
    return () => clearTimeout(debounceTimer);
  }, [currentPage, searchTerm, selectedFrequency, selectedStatus, sortConfig]);

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  const handleProcessCancellationRequest = async (action) => {
    try {
      if (!selectedSubscription) return;

      await axiosInstance.post(
        `/admin/subscriptions/${selectedSubscription.id}/process-cancellation`,
        { action }
      );

      toast.success(
        `Cancellation request ${action === "approve" ? "approved" : "rejected"} successfully`
      );
      setShowCancelRequestDialog(false);
      // Refresh subscriptions
      const fetchSubscriptions = async () => {
        setIsLoading(true);
        try {
          const response = await axiosInstance.get("/admin/subscriptions", {
            params: {
              page: currentPage,
              limit: ITEMS_PER_PAGE,
              search: searchTerm,
              frequency:
                selectedFrequency !== "All"
                  ? selectedFrequency.toLowerCase()
                  : undefined,
              status:
                selectedStatus !== "All"
                  ? selectedStatus.toLowerCase()
                  : undefined,
              sortBy: sortConfig.key,
              sortOrder: sortConfig.direction,
            },
          });
          if (response.data?.status === "Success") {
            setSubscriptions(response.data.data.subscriptions || []);
            setPagination(response.data.data.pagination || {
              total: 0,
              pages: 0,
              currentPage: 1,
              perPage: ITEMS_PER_PAGE,
            });
          }
        } catch (error) {
          console.error("Failed to fetch subscriptions:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSubscriptions();
    } catch (error) {
      console.error("Process cancellation error:", error);
      toast.error(
        error?.response?.data?.message || "Failed to process cancellation request"
      );
    }
  };

  // Custom renderer for the pie chart labels
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (error) {
    return (
      <div className="p-6 text-red-600">
        <p>Error: {error}</p>
      </div>
    );
  }

  // Show page loader only on initial load
  if (isStatsLoading && isChartsLoading && isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="lg:p-6 mt-20 lg:mt-0 space-y-6 bg-background/30 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-primary">Subscriptions</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isStatsLoading ? (
          <>
            <StatsCardLoader />
            <StatsCardLoader />
          </>
        ) : (
          <>
            <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-accent">Total Subscriptions</p>
                  <p className="text-2xl font-bold text-primary">
                    {subscriptionStats.totalSubscriptions}
                  </p>
                  <p className="text-xs text-accent">Number of All Recurring Subscriptions</p>
                </div>
                <div className="p-3 bg-background rounded-full">
                  <Users className="w-6 h-6 text-accent" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-accent">Active Subscriptions</p>
                  <p className="text-2xl font-bold text-primary">
                    {dashboardStats.activeSubscriptions || 0}
                  </p>
                  <p className="text-xs text-accent">Number of Active Recurring Subscriptions</p>
                </div>
                <div className="p-3 bg-background rounded-full">
                  <RefreshCw className="w-6 h-6 text-accent" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Subscription Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isStatsLoading ? (
          <>
            <StatsCardLoader />
            <StatsCardLoader />
            <StatsCardLoader />
            <StatsCardLoader />
          </>
        ) : (
          <>
            <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-accent">Daily Subscriptions</p>
                  <p className="text-2xl font-bold text-primary">
                    {subscriptionStats.dailySubscriptions}
                  </p>
                  <p className="text-xs text-accent">Number of Daily Recurring Subscriptions</p>
                </div>
                <div className="p-3 bg-background rounded-full">
                  <Clock className="w-6 h-6 text-accent" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-accent">Weekly Subscriptions</p>
                  <p className="text-2xl font-bold text-primary">
                    {subscriptionStats.weeklySubscriptions}
                  </p>
                  <p className="text-xs text-accent">Number of Weekly Recurring Subscriptions</p>
                </div>
                <div className="p-3 bg-background rounded-full">
                  <Calendar className="w-6 h-6 text-accent" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-accent">Monthly Subscriptions</p>
                  <p className="text-2xl font-bold text-primary">
                    {subscriptionStats.monthlySubscriptions}
                  </p>
                  <p className="text-xs text-accent">Number of Monthly Recurring Subscriptions</p>
                </div>
                <div className="p-3 bg-background rounded-full">
                  <Calendar className="w-6 h-6 text-accent" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-accent">Yearly Subscriptions</p>
                  <p className="text-2xl font-bold text-primary">
                    {subscriptionStats.yearlySubscriptions}
                  </p>
                  <p className="text-xs text-accent">Number of Yearly Recurring Subscriptions</p>
                </div>
                <div className="p-3 bg-background rounded-full">
                  <Calendar className="w-6 h-6 text-accent" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isChartsLoading ? (
          <>
            <ChartLoader />
            <ChartLoader />
          </>
        ) : (
          <>
            {/* Growth Chart */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <h2 className="text-lg font-semibold text-primary mb-4">Subscription Metrics</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={dashboardStats?.trendData || []}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#374151"
                      tickFormatter={(month) => `${month.substring(0, 3)}`}
                    />
                    <YAxis 
                      yAxisId="left" 
                      stroke="#059669"
                      domain={[0, 'dataMax + 2']}
                      label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke="#0284c7"
                      domain={[0, 'dataMax + 10']}
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                      label={{ value: 'Amount', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #E5E7EB",
                        borderRadius: "0.5rem",
                        minWidth: '200px'
                      }}
                      formatter={(value, name) => {
                        if (name === 'Active Subscriptions') return [value, 'Number of recurring donations'];
                        if (name === 'Recurring Amount') return [`$${value.toFixed(2)}`, 'Total recurring amount'];
                        return [value, name];
                      }}
                      labelFormatter={(month, payload) => 
                        `${month} ${payload[0]?.payload?.year || new Date().getFullYear()}`
                      }
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="subscribers"
                      name="Active Subscriptions"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 1 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="amount"
                      name="Recurring Amount"
                      stroke="#0284c7"
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 1 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Distribution Pie Chart */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <h2 className="text-lg font-semibold text-primary mb-4">Subscription Status Distribution</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allStatusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {allStatusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend 
                      layout="vertical" 
                      verticalAlign="middle" 
                      align="right"
                      formatter={(value, entry, index) => (
                        <span style={{ color: COLORS[index % COLORS.length] }}>
                          {value} ({entry.payload.value})
                        </span>
                      )}
                    />
                    <Tooltip 
                      formatter={(value, name) => [`${value} subscriptions`, `${name} Status`]}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #E5E7EB",
                        borderRadius: "0.5rem"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Subscriptions Table */}
      {isLoading ? (
        <TableLoader />
      ) : (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
            <div className="flex flex-col lg:flex-row gap-2 items-center space-x-4 w-full md:w-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search subscriptions..."
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent w-full md:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              </div>

              <select
                className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                value={selectedFrequency}
                onChange={(e) => setSelectedFrequency(e.target.value)}
              >
                <option value="All">All Frequencies</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>

              <select
                className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
                <option value="failed">Failed</option>
                <option value="ended">Ended</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {subscriptions.length === 0 ? (
              <div className="text-center py-4 text-accent">No subscriptions found</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("donorName")}
                    >
                      Donor
                      <ChevronDown className="w-4 h-4 inline-block ml-1" />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("cause")}
                    >
                      Cause
                      <ChevronDown className="w-4 h-4 inline-block ml-1" />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("amount")}
                    >
                      Amount
                      <ChevronDown className="w-4 h-4 inline-block ml-1" />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("frequency")}
                    >
                      Frequency
                      <ChevronDown className="w-4 h-4 inline-block ml-1" />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("nextBilling")}
                    >
                      Next Billing
                      <ChevronDown className="w-4 h-4 inline-block ml-1" />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("status")}
                    >
                      Status
                      <ChevronDown className="w-4 h-4 inline-block ml-1" />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.map((subscription) => (
                    <tr key={subscription.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-primary">
                            {subscription.donorName || "Unknown"}
                          </div>
                          <div className="text-sm text-accent">
                            {subscription.donorEmail || "No email"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-primary">
                          {subscription.cause || "General Donation"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-primary">
                          ${(subscription.amount || 0).toLocaleString()}/
                          {(subscription.frequency || "month").toLowerCase()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-sm font-medium rounded-full bg-accent/10 text-primary">
                          {subscription.frequency || "Monthly"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-accent">
                        {subscription.nextBilling 
                          ? new Date(subscription.nextBilling).toLocaleDateString() 
                          : subscription.startDate 
                            ? new Date(subscription.startDate).toLocaleDateString()
                            : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${
                              subscription.status === "active"
                                ? "bg-accent/10 text-primary"
                                : subscription.status === "paused"
                                ? "bg-yellow-100 text-yellow-800"
                                : subscription.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : subscription.status === "ended"
                                ? "bg-accent/10 text-primary"
                                : subscription.status === "pending_cancellation"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {subscription.status
                            ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)
                            : "Unknown"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {subscriptions.length > 0 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-accent">
                Showing {((pagination.currentPage || 1) - 1) * (pagination.perPage || ITEMS_PER_PAGE) + 1} to{" "}
                {Math.min(
                  (pagination.currentPage || 1) * (pagination.perPage || ITEMS_PER_PAGE),
                  pagination.total || 0
                )}{" "}
                of {pagination.total || 0} entries
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className={`p-2 rounded-lg ${
                    currentPage <= 1
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-accent hover:bg-background"
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {Array.from(
                  { length: Math.min(5, pagination.pages || 1) },
                  (_, i) => i + 1
                ).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded-lg ${
                      currentPage === pageNum
                        ? "bg-accent text-white"
                        : "text-accent hover:bg-background"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= (pagination.pages || 1)}
                  className={`p-2 rounded-lg ${
                    currentPage >= (pagination.pages || 1)
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-accent hover:bg-background"
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancellation Request Dialog */}
      {showCancelRequestDialog && (
        <Modal
          isOpen={showCancelRequestDialog}
          onClose={() => setShowCancelRequestDialog(false)}
          title="Process Cancellation Request"
          description="Review the cancellation request and choose to approve or reject it."
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900">Subscription Details</h4>
              <div className="mt-2 space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium">Donor:</span>{" "}
                  {selectedSubscription?.donorName}
                </p>
                <p>
                  <span className="font-medium">Amount:</span> $
                  {selectedSubscription?.amount}
                </p>
                <p>
                  <span className="font-medium">Frequency:</span>{" "}
                  {selectedSubscription?.frequency}
                </p>
                <p>
                  <span className="font-medium">Reason:</span>{" "}
                  {selectedSubscription?.cancelReason}
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelRequestDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => handleProcessCancellationRequest("reject")}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Reject
              </button>
              <button
                onClick={() => handleProcessCancellationRequest("approve")}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Approve
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SubscriptionsPage;