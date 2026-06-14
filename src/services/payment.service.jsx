import axiosInstance from "./axios";

/**
 * Admin: manage the tenant's own Stripe credentials. Secrets are write-only —
 * the API never returns secret/webhook key values, only whether they are set.
 *
 * Session-scoped cache + in-flight de-dupe so the config is fetched at most once
 * per page load; mutations keep the cache fresh (or invalidate it).
 */
let _cfg = null;
let _inFlight = null;

const paymentService = {
  // Synchronous peek at the cached config (null until first load).
  getCachedConfig: () => _cfg,

  // Resolves to the config object. Cached + de-duped; { force: true } bypasses.
  getConfig: ({ force = false } = {}) => {
    if (_cfg && !force) return Promise.resolve(_cfg);
    if (_inFlight && !force) return _inFlight;
    _inFlight = axiosInstance
      .get("/admin/payment-config")
      .then((res) => {
        _cfg = res.data;
        _inFlight = null;
        return _cfg;
      })
      .catch((err) => {
        _inFlight = null;
        throw err;
      });
    return _inFlight;
  },

  updateConfig: async (data) => {
    const res = await axiosInstance.put("/admin/payment-config", data);
    if (res.data?.config) _cfg = res.data.config; // keep cache fresh
    return res;
  },

  testConnection: (data) => axiosInstance.post("/admin/payment-config/test", data || {}),

  clearConfig: async () => {
    const res = await axiosInstance.delete("/admin/payment-config");
    _cfg = null; // invalidate → next read re-fetches
    return res;
  },
};

export default paymentService;
