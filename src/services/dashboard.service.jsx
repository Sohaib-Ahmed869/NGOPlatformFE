import axiosInstance from "./axios";

/**
 * Admin dashboard service.
 *
 * The dashboard pulls four resources in parallel (order stats, subscription
 * stats, top donors, donor stats); only the order-stats call varies with the
 * selected date filter. We cache the combined result per filter key (session
 * scoped) + de-dupe concurrent loads, so navigating back to the dashboard — or
 * returning to a filter already viewed — is instant and skips the loader.
 */
const _cache = {}; // { [filter]: { dashboardData, donorStats } }
const _inFlight = {}; // { [filter]: Promise }

// Translate a filter preset into the startDate query param the API expects.
function getDateRange(preset) {
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
}

const dashboardService = {
  // SYNC peek — the combined dashboard payload for a filter (null if not loaded).
  getCached: (filter = "all") => _cache[filter] || null,

  load: ({ filter = "all", force = false } = {}) => {
    if (_cache[filter] && !force) return Promise.resolve(_cache[filter]);
    if (_inFlight[filter] && !force) return _inFlight[filter];

    const dateParams = getDateRange(filter);
    _inFlight[filter] = Promise.all([
      axiosInstance.get("/admin/orders/dashboard/stats", { params: dateParams }),
      axiosInstance.get("/admin/subscriptions/dashboard/subscription-stats"),
      axiosInstance.get("/admin/orders/dashboard/top-donors"),
      axiosInstance.get("/admin/donors/dashboard/stats"),
    ])
      .then(([orderStats, subscriptionStats, topDonors, donorStats]) => {
        const s = orderStats.data.stats;
        const data = {
          dashboardData: {
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
              // enriched
              uniqueDonors: s.uniqueDonors || 0,
              completedDonations: s.completedDonations || 0,
              statusBreakdown: s.statusBreakdown || {},
              paymentMethods: s.paymentMethods || [],
              topCauses: s.topCauses || [],
            },
            subscriptionStats: subscriptionStats.data.data.stats,
            topDonors: topDonors.data.topDonors,
          },
          donorStats: donorStats.data.data.stats || {
            totalDonors: 0,
            totalAmount: 0,
            averageDonation: 0,
            recurringDonations: 0,
          },
        };
        _cache[filter] = data;
        _inFlight[filter] = null;
        return data;
      })
      .catch((err) => {
        _inFlight[filter] = null;
        throw err;
      });
    return _inFlight[filter];
  },
};

export default dashboardService;
