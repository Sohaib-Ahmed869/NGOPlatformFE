import axiosInstance from "./axios";

/**
 * Platform settings + branding for the public SaaS marketing site.
 * - getPublic: safe fields, used by the marketing site (no auth).
 * - the rest are superadmin-only (token auto-attached by the axios instance).
 *
 * Session-scoped cache + in-flight de-dupe (mirrors profile/settings services),
 * so the superadmin Platform Settings screen fetches at most once per page load
 * and revisits are instant. Every mutation keeps the cache fresh so nothing has
 * to re-fetch.
 */
let _cache = null;
let _inFlight = null;

// asset :type → branding field (matches the backend ASSET_FIELDS whitelist).
const ASSET_FIELDS = {
  logo: "logo",
  "logo-dark": "logoDark",
  "icon-logo": "iconLogo",
  "icon-logo-dark": "iconLogoDark",
  favicon: "favicon",
};

// Merge a partial branding patch into the cache without dropping other fields.
function patchBranding(patch) {
  if (!_cache) return;
  _cache = { ..._cache, branding: { ...(_cache.branding || {}), ...patch } };
}

const platformService = {
  getPublic: () => axiosInstance.get("/platform/public"),

  // Synchronous peek at the cached settings document (null until first load) —
  // lets the screen skip the loader on revisits within a session.
  getCached: () => _cache,

  // Drop the cache so the next getSettings() hits the API again. Used on dev
  // hot-reload so a fresh call repopulates state (no-op/stripped in production).
  clearCache: () => {
    _cache = null;
    _inFlight = null;
  },

  // Resolves to the full settings document. Cached + de-duped; { force: true }
  // bypasses the cache for an explicit refresh.
  getSettings: ({ force = false } = {}) => {
    if (_cache && !force) return Promise.resolve(_cache);
    if (_inFlight && !force) return _inFlight;
    _inFlight = axiosInstance
      .get("/platform/settings")
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

  // PUT returns the full, server-normalized settings document — adopt it as the
  // new cache so derived/clamped values stay in sync without a re-fetch.
  updateSettings: async (data) => {
    const res = await axiosInstance.put("/platform/settings", data);
    if (res?.data) _cache = res.data;
    return res.data;
  },

  // Upload returns { field, url } — patch just that branding slot into the cache.
  uploadAsset: async (type, formData) => {
    const res = await axiosInstance.post(`/platform/settings/asset/${type}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (res?.data?.field) patchBranding({ [res.data.field]: res.data.url });
    return res.data;
  },

  // Delete clears the branding slot — mirror that in the cache.
  deleteAsset: async (type) => {
    const res = await axiosInstance.delete(`/platform/settings/asset/${type}`);
    const field = res?.data?.field || ASSET_FIELDS[type];
    if (field) patchBranding({ [field]: "" });
    return res.data;
  },
};

export default platformService;
