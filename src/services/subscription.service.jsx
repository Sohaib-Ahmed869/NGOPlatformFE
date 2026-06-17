import axios from "./axios";

// Helper method to handle API errors
const handleApiError = (error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    return error.response.data;
  } else if (error.request) {
    // The request was made but no response was received
    return "No response from the server";
  }
  // Something happened in setting up the request that triggered an Error
  return error.message;
};

// The admin subscriptions table is paginated/filtered server-side, so only the
// DEFAULT (param-less) mount load is cached — filtered/searched/sorted/paged
// views fetch fresh and never overwrite the default cache. This lets the screen
// render instantly on revisit without re-showing the page loader.
let _listCache = null; // res.data of the default admin list ({ status, data: { subscriptions, pagination } })
let _listInFlight = null;

// True when the params match the table's initial mount state (page 1, no
// search/filters, default sort) — the only view that is safe to cache.
const isDefaultListParams = (params = {}) =>
  (params.page ?? 1) === 1 &&
  !params.search &&
  !params.frequency &&
  !params.status &&
  (params.sortBy ?? "startDate") === "startDate" &&
  (params.sortOrder ?? "desc") === "desc";

const SubscriptionService = {
  // Sync peek at the cached default admin list (null until the first load).
  getCachedAdminSubscriptions: () => _listCache,

  // Cached admin subscriptions list. Caches only the default mount load; any
  // filter/search/sort/page params bypass the cache (and never overwrite it).
  // Returns res.data (the { status, data: { subscriptions, pagination } } payload).
  getAdminSubscriptions: (params = {}, { force = false } = {}) => {
    const isDefault = isDefaultListParams(params);
    if (isDefault && _listCache && !force) return Promise.resolve(_listCache);
    if (isDefault && _listInFlight && !force) return _listInFlight;

    const req = axios
      .get("/admin/subscriptions", { params })
      .then((res) => {
        if (isDefault) {
          _listCache = res.data;
          _listInFlight = null;
        }
        return res.data;
      })
      .catch((error) => {
        if (isDefault) _listInFlight = null;
        throw handleApiError(error);
      });

    if (isDefault && !force) _listInFlight = req;
    return req;
  },

  getActiveSubscriptions: async () => {
    try {
      const response = await axios.get("/subscriptions/active");
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  pauseSubscription: async (subscriptionId, pauseDuration, reason) => {
    try {
      const response = await axios.post(
        `/subscriptions/${subscriptionId}/pause`,
        {
          pauseDuration,
          reason,
        }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  resumeSubscription: async (subscriptionId) => {
    try {
      const response = await axios.post(
        `/subscriptions/${subscriptionId}/resume`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  cancelSubscription: async (subscriptionId, reason) => {
    try {
      const response = await axios.post(
        `/subscriptions/${subscriptionId}/cancel`,
        {
          reason,
        }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  requestCancellation: async (subscriptionId, reason) => {
    try {
      const response = await axios.post(
        `/subscriptions/${subscriptionId}/request-cancellation`,
        {
          reason,
        }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateSubscriptionAmount: async (subscriptionId, newAmount) => {
    try {
      const response = await axios.post(
        `/subscriptions/${subscriptionId}/update-amount`,
        {
          newAmount,
        }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Add to subscription.service.js
  updateSubscriptionEndDate: async (subscriptionId, newEndDate) => {
    try {
      const response = await axios.post(
        `/subscriptions/${subscriptionId}/update-end-date`,
        {
          newEndDate,
        }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // New helper method to handle subscription webhooks from Stripe
  handleStripeEvent: async (eventData) => {
    try {
      const response = await axios.post("/subscriptions/webhook", eventData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Method to get a specific subscription details
  getSubscriptionById: async (subscriptionId) => {
    try {
      const response = await axios.get(`/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Admin: full subscription order (incl. recurringDetails.paymentHistory) for
  // the individual detail page. Returns res.data ({ status, data: { subscription } }).
  getAdminSubscriptionById: async (subscriptionId) => {
    try {
      const response = await axios.get(`/admin/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

export default SubscriptionService;
