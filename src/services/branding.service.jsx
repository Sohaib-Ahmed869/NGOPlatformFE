import axiosInstance from "./axios";

// Session-scoped cache so branding is fetched at most once per page load.
// `_inFlight` dedupes concurrent callers; mutations keep the cache fresh so the
// screen never has to re-fetch (or re-show its loader) on revisits.
let _cache = null; // { name, slug, branding }
let _inFlight = null;

// Asset slot → branding field, mirrored from the Branding screen so the cache
// stays in sync after uploads/deletes.
const SLOT_FIELD = {
  logo: "logo",
  "logo-dark": "logoDark",
  "icon-logo": "iconLogo",
  "icon-logo-dark": "iconLogoDark",
  favicon: "favicon",
};

const patchCacheAsset = (type, value) => {
  if (_cache && SLOT_FIELD[type]) {
    _cache = { ..._cache, branding: { ...(_cache.branding || {}), [SLOT_FIELD[type]]: value } };
  }
};

const brandingService = {
  // Synchronous peek at the cached payload (null until first load).
  getCached: () => _cache,

  // Resolves to { name, slug, branding }. Cached + de-duped; pass { force: true }
  // to bypass the cache.
  getBranding: ({ force = false } = {}) => {
    if (_cache && !force) return Promise.resolve(_cache);
    if (_inFlight && !force) return _inFlight;
    _inFlight = axiosInstance
      .get("/branding")
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

  updateBranding: async (data) => {
    const res = await axiosInstance.put("/branding", data);
    if (_cache) _cache = { ..._cache, branding: { ...(_cache.branding || {}), ...data } };
    return res;
  },

  uploadLogo: (formData) =>
    axiosInstance.post("/branding/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  deleteLogo: () => axiosInstance.delete("/branding/logo"),

  // Generic image slots — type = "logo" | "logo-dark" | "icon-logo" | ...
  // formData must carry the file under the field name "file".
  uploadAsset: async (type, formData) => {
    const res = await axiosInstance.post(`/branding/asset/${type}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    patchCacheAsset(type, res.data?.url || "");
    return res;
  },

  deleteAsset: async (type) => {
    const res = await axiosInstance.delete(`/branding/asset/${type}`);
    patchCacheAsset(type, "");
    return res;
  },

  getThemes: () => axiosInstance.get("/branding/themes"),

  // Branding change requests
  submitRequest: (data) => axiosInstance.post("/branding/request", data),
  getMyRequests: () => axiosInstance.get("/branding/requests"),
};

export default brandingService;
