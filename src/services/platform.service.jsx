import axiosInstance from "./axios";
import superadminService from "./superadmin.service";

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

// The Stripe config lives behind its own endpoint (it decrypts to build a mask,
// and must never ride along in the branding payload), so it gets its own cache.
// Fetched only when the Stripe tab is first opened — editing branding shouldn't
// cost a Stripe round trip.
let _stripeCache = null;
let _stripeInFlight = null;
// Set by a `platform:updated` socket event (another operator changed the keys).
// A flag rather than a cache drop, so a mounted screen keeps showing the last
// known values while it revalidates instead of flashing a loader.
let _stripeStale = false;

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

  // Aggregate platform totals for the marketing hero (no auth). Server-cached,
  // so calling this on every home render is cheap.
  getPublicStats: () => axiosInstance.get("/platform/stats"),

  // Synchronous peek at the cached settings document (null until first load) —
  // lets the screen skip the loader on revisits within a session.
  getCached: () => _cache,

  // Drop the cache so the next getSettings() hits the API again. Used on dev
  // hot-reload so a fresh call repopulates state (no-op/stripped in production).
  clearCache: () => {
    _cache = null;
    _inFlight = null;
    _stripeCache = null;
    _stripeInFlight = null;
    _stripeStale = false;
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
    superadminService.invalidateAuditCache(); // these changes are audited now
    return res.data;
  },

  // Upload returns { field, url } — patch just that branding slot into the cache.
  uploadAsset: async (type, formData) => {
    const res = await axiosInstance.post(`/platform/settings/asset/${type}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (res?.data?.field) patchBranding({ [res.data.field]: res.data.url });
    superadminService.invalidateAuditCache();
    return res.data;
  },

  // Delete clears the branding slot — mirror that in the cache.
  deleteAsset: async (type) => {
    const res = await axiosInstance.delete(`/platform/settings/asset/${type}`);
    const field = res?.data?.field || ASSET_FIELDS[type];
    if (field) patchBranding({ [field]: "" });
    superadminService.invalidateAuditCache();
    return res.data;
  },

  /* ── Platform Stripe (SaaS billing account) ──────────────────────────────
   * The server returns a MASKED view only — `secretKeyMask`, `hasSecretKey`,
   * `hasWebhookSecret`. There is no endpoint that returns a key, so nothing
   * here can cache one. Every mutation returns the fresh masked config, which
   * we adopt so the screen never re-fetches.
   */
  getStripeCached: () => _stripeCache,

  // Called from SARealtimeContext when another console changes the config.
  markStripeStale: () => {
    _stripeStale = true;
  },
  isStripeStale: () => _stripeStale,

  getStripeConfig: ({ force = false } = {}) => {
    if (_stripeCache && !force && !_stripeStale) return Promise.resolve(_stripeCache);
    if (_stripeInFlight) return _stripeInFlight; // de-dupe forced calls too
    // Cleared up front so an event arriving mid-flight isn't swallowed by the
    // response that was already on the wire when it fired.
    _stripeStale = false;
    _stripeInFlight = axiosInstance
      .get("/platform/settings/stripe")
      .then((res) => {
        _stripeCache = res.data;
        _stripeInFlight = null;
        return _stripeCache;
      })
      .catch((err) => {
        _stripeInFlight = null;
        throw err;
      });
    return _stripeInFlight;
  },

  updateStripeConfig: async (payload) => {
    const res = await axiosInstance.put("/platform/settings/stripe", payload);
    if (res?.data?.config) _stripeCache = res.data.config;
    superadminService.invalidateAuditCache(); // key changes are audited
    return res.data;
  },

  // Testing a SAVED key stamps lastVerifiedAt server-side, so adopt the config
  // it returns. Testing a typed-but-unsaved key returns none — cache untouched.
  testStripeConnection: async (secretKey) => {
    const res = await axiosInstance.post("/platform/settings/stripe/test", secretKey ? { secretKey } : {});
    if (res?.data?.config) _stripeCache = res.data.config;
    if (!secretKey) superadminService.invalidateAuditCache();
    return res.data;
  },

  /**
   * Create the SaaS billing webhook endpoint in the connected Stripe account and
   * capture its signing secret. Stripe reveals that secret ONLY on creation, so
   * replacing an existing endpoint is an explicit choice — the server answers 409
   * with `canRecreate` rather than silently deleting one.
   */
  createStripeWebhook: async ({ recreate = false } = {}) => {
    const res = await axiosInstance.post("/platform/settings/stripe/webhook", { recreate });
    if (res?.data?.config) _stripeCache = res.data.config;
    superadminService.invalidateAuditCache();
    return res.data;
  },

  clearStripeConfig: async () => {
    const res = await axiosInstance.delete("/platform/settings/stripe");
    if (res?.data?.config) _stripeCache = res.data.config;
    superadminService.invalidateAuditCache();
    return res.data;
  },

  /* ── Platform mailbox ────────────────────────────────────────────────────
     Same write-only contract as the Stripe config above: the password goes up,
     never comes back, and a blank one means "leave unchanged". Deliberately
     NOT cached — unlike the Stripe key this is read on one screen only, and a
     stale cache here would show a mailbox as healthy after a failed re-save. */
  getEmailConfig: async () => {
    const res = await axiosInstance.get("/platform/settings/email");
    return res.data;
  },

  updateEmailConfig: async (payload) => {
    const res = await axiosInstance.put("/platform/settings/email", payload);
    superadminService.invalidateAuditCache(); // mailbox changes are audited
    return res.data;
  },

  /**
   * Test a mailbox. Pass SMTP fields to test what is typed but not yet saved;
   * pass none to test the one the server is actually running on. Pass `to` to
   * actually deliver a message — authenticating proves the login, not that
   * mail arrives.
   */
  testEmailConnection: async (payload = {}) => {
    const res = await axiosInstance.post("/platform/settings/email/test", payload);
    return res.data;
  },

  clearEmailConfig: async () => {
    const res = await axiosInstance.delete("/platform/settings/email");
    superadminService.invalidateAuditCache();
    return res.data;
  },
};

export default platformService;
