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
import { motion } from "framer-motion";
import Modal from "../../components/Modal";
import KpiCard from "../../components/KpiCard";
import Loader from "../../components/Loader";

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

// PageLoader imported from shared components

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
    return <Loader />;
  }

  return (
    <motion.div className="lg:p-6 mt-20 lg:mt-0 space-y-6 bg-background/30 min-h-screen"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">Subscriptions</h1>
          <p className="text-sm text-text-muted mt-0.5">{pagination.total || 0} total subscriptions</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiCard title="Total Subscriptions" value={subscriptionStats.totalSubscriptions} icon={Users} color="#059669" animate={false} />
        <KpiCard title="Active Subscriptions" value={dashboardStats.activeSubscriptions || 0} icon={RefreshCw} color="#10B981" animate={false} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Daily" value={subscriptionStats.dailySubscriptions} icon={Clock} color="#059669" animate={false} />
        <KpiCard title="Weekly" value={subscriptionStats.weeklySubscriptions} icon={Calendar} color="#10B981" animate={false} />
        <KpiCard title="Monthly" value={subscriptionStats.monthlySubscriptions} icon={Calendar} color="#EC4899" animate={false} />
        <KpiCard title="Yearly" value={subscriptionStats.yearlySubscriptions} icon={Calendar} color="#F59E0B" animate={false} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Metrics Chart */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-semibold text-primary mb-4">Subscription Metrics</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboardStats?.trendData || []} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                  tickFormatter={(m) => m?.substring(0, 3)} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} />
                <Line yAxisId="left" type="monotone" dataKey="subscribers" name="Count" stroke="#059669" strokeWidth={2.5}
                  dot={{ fill: "#059669", r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="amount" name="Amount" stroke="#10B981" strokeWidth={2.5}
                  dot={{ fill: "#10B981", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Donut */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col items-center">
          <h2 className="text-sm font-semibold text-primary mb-4 self-start">Status Distribution</h2>
          {(() => {
            const DONUT_COLORS = ["#34D399", "#FB923C", "#818CF8", "#F472B6"];
            const segments = allStatusDistribution.map((s, i) => ({ ...s, color: DONUT_COLORS[i % DONUT_COLORS.length] }));
            const total = segments.reduce((s, seg) => s + seg.value, 0);
            const r = 58, c = 2 * Math.PI * r, gap = 8;
            let offset = 0;
            return (
              <>
                <svg width={160} height={160} viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
                  {total > 0 && segments.filter(s => s.value > 0).map((seg, i) => {
                    const pct = seg.value / total;
                    const dashLen = Math.max(0, pct * c - gap);
                    const el = <circle key={i} cx="70" cy="70" r={r} fill="none" stroke={seg.color} strokeWidth="16"
                      strokeLinecap="round" strokeDasharray={`${dashLen} ${c - dashLen}`}
                      strokeDashoffset={-offset} transform="rotate(-90 70 70)" />;
                    offset += pct * c;
                    return el;
                  })}
                  <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="700" fill="currentColor" className="text-primary">{total}</text>
                  <text x="70" y="82" textAnchor="middle" fontSize="10" fill="#94a3b8">total</text>
                </svg>
                <div className="flex gap-4 mt-4 flex-wrap justify-center">
                  {segments.filter(s => s.value > 0).map((s) => (
                    <div key={s.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-[11px] text-text-muted capitalize">{s.name} ({s.value})</span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search subscriptions..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none w-56" />
            </div>
            <select value={selectedFrequency} onChange={(e) => setSelectedFrequency(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none">
              <option value="All">All Frequencies</option>
              <option value="Daily">Daily</option><option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option><option value="Yearly">Yearly</option>
            </select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none">
              <option value="All">All Status</option>
              <option value="active">Active</option><option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option><option value="failed">Failed</option><option value="ended">Ended</option>
            </select>
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-10 h-10 mx-auto mb-3 text-text-muted" />
            <p className="text-primary font-medium mb-1">No subscriptions found</p>
            <p className="text-sm text-text-muted">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {[
                    { label: "Donor", key: "donorName" }, { label: "Cause", key: "cause" },
                    { label: "Amount", key: "amount" }, { label: "Frequency", key: "frequency" },
                    { label: "Next Billing", key: "nextBilling" }, { label: "Status", key: "status" },
                  ].map((h) => (
                    <th key={h.key} onClick={() => handleSort(h.key)}
                      className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider cursor-pointer hover:text-primary">
                      {h.label} <ChevronDown className="w-3 h-3 inline ml-0.5" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => {
                  const statusMap = { active: "bg-green-50 text-green-700", paused: "bg-yellow-50 text-yellow-700", failed: "bg-red-50 text-red-700", ended: "bg-gray-100 text-gray-600", cancelled: "bg-gray-100 text-gray-600", pending_cancellation: "bg-orange-50 text-orange-700" };
                  const freqMap = { Daily: "bg-emerald-50 text-emerald-700", Weekly: "bg-violet-50 text-violet-700", Monthly: "bg-pink-50 text-pink-700", Yearly: "bg-amber-50 text-amber-700" };
                  return (
                    <tr key={sub.id} className="border-b border-gray-50 last:border-0 hover:bg-background/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-primary">{sub.donorName || "Unknown"}</p>
                        <p className="text-xs text-text-muted">{sub.donorEmail || ""}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-text-muted">{sub.cause || "General"}</td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-primary">
                        ${(sub.amount || 0).toLocaleString()}/{(sub.frequency || "month").toLowerCase()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${freqMap[sub.frequency] || "bg-gray-100 text-gray-600"}`}>
                          {sub.frequency || "Monthly"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-text-muted">
                        {sub.nextBilling ? new Date(sub.nextBilling).toLocaleDateString() : sub.startDate ? new Date(sub.startDate).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${statusMap[sub.status] || "bg-gray-100 text-gray-600"}`}>
                          {sub.status || "Unknown"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {(pagination.pages || 1) > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-text-muted">
              {((pagination.currentPage || 1) - 1) * (pagination.perPage || ITEMS_PER_PAGE) + 1}–{Math.min((pagination.currentPage || 1) * (pagination.perPage || ITEMS_PER_PAGE), pagination.total || 0)} of {pagination.total || 0}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage <= 1}
                className="p-1.5 rounded-lg text-text-muted hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: Math.min(5, pagination.pages || 1) }, (_, i) => {
                let pg;
                const pages = pagination.pages || 1;
                if (pages <= 5) pg = i + 1;
                else if (currentPage <= 3) pg = i + 1;
                else if (currentPage >= pages - 2) pg = pages - (4 - i);
                else pg = currentPage - 2 + i;
                return (
                  <button key={i} onClick={() => setCurrentPage(pg)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium ${currentPage === pg ? "bg-accent text-white" : "text-text-muted hover:bg-gray-100"}`}>{pg}</button>
                );
              })}
              <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage >= (pagination.pages || 1)}
                className="p-1.5 rounded-lg text-text-muted hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

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
    </motion.div>
  );
};

export default SubscriptionsPage;