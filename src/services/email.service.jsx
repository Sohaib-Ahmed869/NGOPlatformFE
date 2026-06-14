import axiosInstance from "./axios";

/**
 * Admin: manage the tenant's own SMTP credentials. The password is write-only —
 * the API never returns it, only whether it is set (`hasPassword`).
 *
 * Session-scoped cache + in-flight de-dupe so the config is fetched at most once
 * per page load; mutations keep the cache fresh (or invalidate it).
 */
let _cfg = null;
let _inFlight = null;

const emailService = {
  getCachedConfig: () => _cfg,

  getConfig: ({ force = false } = {}) => {
    if (_cfg && !force) return Promise.resolve(_cfg);
    if (_inFlight && !force) return _inFlight;
    _inFlight = axiosInstance
      .get("/admin/email-config")
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
    const res = await axiosInstance.put("/admin/email-config", data);
    if (res.data?.config) _cfg = res.data.config;
    return res;
  },

  testConnection: (data) => axiosInstance.post("/admin/email-config/test", data || {}),

  clearConfig: async () => {
    const res = await axiosInstance.delete("/admin/email-config");
    _cfg = null;
    return res;
  },
};

export default emailService;
