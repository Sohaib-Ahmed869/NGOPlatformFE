import axiosInstance from "./axios";

/**
 * Admin: manage the tenant's own PayPal credentials. The client secret is
 * write-only — the API never returns it, only whether it is set.
 */
let _cfg = null;
let _inFlight = null;

const paypalService = {
  getCachedConfig: () => _cfg,

  getConfig: ({ force = false } = {}) => {
    if (_cfg && !force) return Promise.resolve(_cfg);
    if (_inFlight && !force) return _inFlight;
    _inFlight = axiosInstance
      .get("/admin/paypal-config")
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
    const res = await axiosInstance.put("/admin/paypal-config", data);
    if (res.data?.config) _cfg = res.data.config;
    return res;
  },

  testConnection: (data) => axiosInstance.post("/admin/paypal-config/test", data || {}),

  clearConfig: async () => {
    const res = await axiosInstance.delete("/admin/paypal-config");
    _cfg = null;
    return res;
  },
};

export default paypalService;
