import axiosInstance from "./axios";

// Session-scoped cache + in-flight de-dupe (mirrors profile/branding services),
// so the settings screen fetches at most once per page load and revisits are
// instant. Mutations keep the cache fresh so nothing has to re-fetch.
let _cache = null;
let _inFlight = null;

const settingsService = {
  // Synchronous peek at the cached settings (null until first load).
  getCached: () => _cache,

  // Resolves to the settings object. Cached + de-duped; { force: true } bypasses.
  getSettings: ({ force = false } = {}) => {
    if (_cache && !force) return Promise.resolve(_cache);
    if (_inFlight && !force) return _inFlight;
    _inFlight = axiosInstance
      .get("/settings")
      .then((res) => {
        _cache = res.data;
        _inFlight = null;
        return _cache;
      })
      .catch((err) => {
        _inFlight = null;
        throw err;
      });
    return _inFlight;
  },

  updateSettings: async (data) => {
    const res = await axiosInstance.put("/settings", data);
    // Refresh the cache from the SERVER's normalized response (not the request
    // payload) so derived values — e.g. slugged eventAudiences[].key — are kept.
    const next = res?.data?.settings || data;
    if (_cache) _cache = { ..._cache, ...next };
    return res;
  },
};

export default settingsService;
