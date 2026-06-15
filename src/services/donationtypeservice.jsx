import axios from "./axios";

/**
 * Donation types — tenant-scoped cache, served stale-while-revalidate.
 *
 * The public giving screens (Donate, QuickDonate, checkout) used to call
 * getAll() on every mount, so each visit/refresh hit the API and flashed a
 * loading state. We now cache the list in memory (instant on SPA navigation)
 * and in localStorage (instant across refreshes / new tabs), keyed per tenant.
 *
 * Callers render the cached copy immediately via getCached() and revalidate in
 * the background via refresh(); mutations invalidate the cache so an edit shows
 * up on the next list()/revalidation. Mirrors the CMS page-content cache.
 */
let _cache = null; // in-memory array (fastest path within a tab)
let _inFlight = null; // de-dupe concurrent network refreshes

const _scope = () => {
  if (typeof window === "undefined") return "default";
  return window.location.hostname.split(".")[0] || "default";
};
const _lsKey = () => `donationtypes:${_scope()}`;

function _readLS() {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(_lsKey());
      if (raw) return JSON.parse(raw);
    }
  } catch {
    /* ignore parse/storage errors */
  }
  return null;
}

function _writeCache(list) {
  _cache = list;
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(_lsKey(), JSON.stringify(list));
  } catch {
    /* quota / private mode — memory cache still works */
  }
}

function _invalidate() {
  _cache = null;
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(_lsKey());
  } catch {
    /* ignore */
  }
}

const service = {
  // Synchronous peek for an instant first paint: memory first, then localStorage
  // (promoted into memory). Returns the array, or null when nothing's cached.
  getCached() {
    if (_cache) return _cache;
    const ls = _readLS();
    if (ls) _cache = ls;
    return _cache;
  },

  // Always hit the network, write through the cache, and return the fresh list.
  // Concurrent callers share one request — this is the revalidation path.
  refresh() {
    if (_inFlight) return _inFlight;
    _inFlight = axios
      .get("/donationtypes")
      .then((res) => {
        const list = res.data?.success ? res.data.data || [] : [];
        _writeCache(list);
        _inFlight = null;
        return list;
      })
      .catch((err) => {
        _inFlight = null;
        throw err;
      });
    return _inFlight;
  },

  // Cache-first loader: returns the cached array when present (no request),
  // otherwise fetches. Pass { force: true } to bypass the cache.
  list({ force = false } = {}) {
    if (_cache && !force) return Promise.resolve(_cache);
    return this.refresh();
  },

  async create(donationTypeData) {
    try {
      const response = await axios.post("/donationtypes", donationTypeData);
      _invalidate();
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async getAll() {
    try {
      const response = await axios.get("/donationtypes");
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async getById(id) {
    try {
      const response = await axios.get(`/donationtypes/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async update(id, donationTypeData) {
    try {
      const response = await axios.put(`/donationtypes/${id}`, donationTypeData);
      _invalidate();
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async delete(id) {
    try {
      const response = await axios.delete(`/donationtypes/${id}`);
      _invalidate();
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Persist a new display order (array of ids in the desired order).
  async reorder(ids) {
    try {
      const response = await axios.put("/donationtypes/reorder", { ids });
      _invalidate();
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  handleError(error) {
    if (error.response) {
      throw new Error(error.response.data.message || "An error occurred");
    }
    throw new Error("Network error occurred");
  },
};

export default service;
