import axiosInstance from "./axios";

/**
 * Tenant website (CMS) service.
 * Public: fetch a single page's content (cached, stale-while-revalidate).
 * Admin:  list/get/update pages and upload page images.
 *
 * The admin page list is cached per session + de-duped; mutations keep the
 * cache fresh so the screen never re-fetches (or re-shows its loader).
 */
let _pagesCache = null; // array of pages (admin)
let _inFlight = null;

/* ── Public page-content cache (stale-while-revalidate) ──────────────────────
 * Public page content rarely changes, but the old code re-fetched on every
 * mount — so each visit/refresh flashed a loading state before the content
 * arrived. We now cache content in memory (instant on SPA navigation) and in
 * localStorage (instant across refreshes / new tabs), keyed per tenant. The
 * hook serves the cached copy immediately and revalidates in the background,
 * so fresh edits still show up without the flash. */
const _contentMem = new Map(); // key -> content object
const _contentInFlight = new Map(); // key -> Promise<content>

const _tenantScope = () => {
  if (typeof window === "undefined") return "default";
  return window.location.hostname.split(".")[0] || "default";
};
const _lsKey = (key) => `cms:${_tenantScope()}:${key}`;

function _readContent(key) {
  if (_contentMem.has(key)) return _contentMem.get(key);
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(_lsKey(key));
      if (raw) {
        const parsed = JSON.parse(raw);
        _contentMem.set(key, parsed);
        return parsed;
      }
    }
  } catch {
    /* ignore parse/storage errors */
  }
  return null;
}

function _writeContent(key, content) {
  _contentMem.set(key, content);
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(_lsKey(key), JSON.stringify(content));
  } catch {
    /* quota / private mode — memory cache still works */
  }
}

function _invalidateContent(key) {
  _contentMem.delete(key);
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(_lsKey(key));
  } catch {
    /* ignore */
  }
}

// Fetch + cache one page's content. De-duped: concurrent callers (e.g. the
// page's own hook + the startup prefetch) share a single in-flight request.
function _fetchPageContent(key) {
  if (_contentInFlight.has(key)) return _contentInFlight.get(key);
  const p = axiosInstance
    .get(`/pages/${key}`)
    .then((res) => {
      const content = res.data?.content || {};
      _writeContent(key, content);
      _contentInFlight.delete(key);
      return content;
    })
    .catch((err) => {
      _contentInFlight.delete(key);
      throw err;
    });
  _contentInFlight.set(key, p);
  return p;
}

const siteService = {
  // Public — raw request (kept for callers that want the full response).
  getPage: (key) => axiosInstance.get(`/pages/${key}`),

  // Public — cached content (stale-while-revalidate).
  getCachedPageContent: (key) => _readContent(key),
  fetchPageContent: (key) => _fetchPageContent(key),

  // Warm the cache for many pages in the background (fire-and-forget). Skips
  // pages already cached or in flight, so it never duplicates work.
  prefetchPages: (keys = []) => {
    keys.forEach((k) => {
      if (k && !_contentMem.has(k) && !_contentInFlight.has(k)) _fetchPageContent(k).catch(() => {});
    });
  },

  // Admin
  getCachedPages: () => _pagesCache,

  listPages: ({ force = false } = {}) => {
    if (_pagesCache && !force) return Promise.resolve(_pagesCache);
    if (_inFlight && !force) return _inFlight;
    _inFlight = axiosInstance
      .get(`/admin/pages`)
      .then((res) => {
        _pagesCache = res.data.pages || [];
        _inFlight = null;
        return _pagesCache;
      })
      .catch((err) => {
        _inFlight = null;
        throw err;
      });
    return _inFlight;
  },

  getPageAdmin: (key) => axiosInstance.get(`/admin/pages/${key}`),

  updatePage: async (key, data) => {
    const res = await axiosInstance.put(`/admin/pages/${key}`, data);
    if (_pagesCache) {
      const updated = res.data?.page;
      _pagesCache = _pagesCache.map((p) => (p.key === key ? { ...p, ...(updated || data) } : p));
    }
    // Drop the public content cache for this page so visitors revalidate to the
    // freshly-saved content on their next view.
    _invalidateContent(key);
    return res;
  },

  uploadPageImage: (key, formData) =>
    axiosInstance.post(`/admin/pages/${key}/image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export default siteService;
