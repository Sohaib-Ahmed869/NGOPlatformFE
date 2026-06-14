import axiosInstance from "./axios";

// Subscribers are fetched in full (filtering and pagination happen client-side —
// no server-side query params), so the list is cached per session and de-duped
// via `_inFlight`.
let _cache = null;
let _inFlight = null;

const newsletterService = {
  // Synchronous peek at the cached list (null until loaded) — lets the screen
  // skip its loader on revisits within a session.
  getCached: () => _cache,

  list: ({ force = false } = {}) => {
    if (_cache && !force) return Promise.resolve(_cache);
    if (_inFlight && !force) return _inFlight;
    _inFlight = axiosInstance
      .get(`/newsletters`)
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

  // Admin: flip a subscriber between "active" and "unsubscribed".
  setStatus: async (id, status) => {
    const res = await axiosInstance.patch(`/newsletters/${id}`, { status });
    if (_cache) _cache = _cache.map((s) => (s._id === id ? { ...s, status } : s));
    return res.data;
  },

  // Admin: permanently delete a subscriber.
  remove: async (id) => {
    const res = await axiosInstance.delete(`/newsletters/${id}`);
    if (_cache) _cache = _cache.filter((s) => s._id !== id);
    return res.data;
  },
};

export default newsletterService;
