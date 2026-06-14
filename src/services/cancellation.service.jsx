import axiosInstance from "./axios";

/**
 * Subscription cancellation-requests service (admin).
 *
 * The pending-requests list is cached per session + de-duped; mutations
 * (approve/deny) change the list, so the screen refetches with { force: true }
 * to keep the cache fresh.
 */
let _cache = null; // array of pending requests
let _inFlight = null;

const cancellationService = {
  getCached: () => _cache,

  list: ({ force = false } = {}) => {
    if (_cache && !force) return Promise.resolve(_cache);
    if (_inFlight && !force) return _inFlight;
    _inFlight = axiosInstance
      .get("/admin/subscriptions/cancellation-requests/pending")
      .then((res) => {
        if (res.data?.status !== "Success") {
          _inFlight = null;
          throw new Error("Failed to fetch cancellation requests");
        }
        _cache = res.data.pendingRequests || [];
        _inFlight = null;
        return _cache;
      })
      .catch((err) => {
        _inFlight = null;
        throw err;
      });
    return _inFlight;
  },

  approve: (id) =>
    axiosInstance.post(`/admin/subscriptions/${id}/cancellation/approve`),

  deny: (id, reason) =>
    axiosInstance.post(`/admin/subscriptions/${id}/cancellation/deny`, { reason }),
};

export default cancellationService;
