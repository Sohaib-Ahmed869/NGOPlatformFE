import axiosInstance from "./axios";

// Contact requests are fetched in full (the screen filters, searches and
// paginates client-side — no server-side query params), so the list is cached
// per session and de-duped via `_inFlight`. The Refresh button forces a
// re-fetch with `{ force: true }`. Real-time events keep the cache fresh.
let _cache = null;
let _inFlight = null;
let _team = null;

const contactsService = {
  // Synchronous peek at the cached list (null until loaded) — lets the screen
  // skip its loader on revisits within a session.
  getCached: () => _cache,

  list: ({ force = false } = {}) => {
    if (_cache && !force) return Promise.resolve(_cache);
    if (_inFlight && !force) return _inFlight;
    _inFlight = axiosInstance
      .get(`/contact`)
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

  // Let the screen keep the session cache in sync after local/real-time changes.
  setCache: (next) => {
    _cache = typeof next === "function" ? next(_cache || []) : next;
    return _cache;
  },

  // Team members of the org — for the assignment dropdown + @mention list.
  team: ({ force = false } = {}) => {
    if (_team && !force) return Promise.resolve(_team);
    return axiosInstance.get(`/contact/team`).then((res) => {
      _team = res.data;
      return _team;
    });
  },

  // Unread-contact count for the signed-in admin (drives the nav badge).
  unreadCount: () =>
    axiosInstance.get(`/contact/unread-count`).then((res) => res.data?.count ?? 0),

  // Thread messages for a contact request.
  messages: (id) => axiosInstance.get(`/contact/${id}/messages`).then((res) => res.data),

  // Post a message. kind: "note" (internal) | "reply" (also emailed to submitter).
  sendMessage: (id, { kind = "note", body, mentions = [] }) =>
    axiosInstance
      .post(`/contact/${id}/messages`, { kind, body, mentions })
      .then((res) => res.data),

  // Assign (or unassign with null) a team member.
  assign: (id, assignedTo) =>
    axiosInstance.patch(`/contact/${id}/assign`, { assignedTo }).then((res) => res.data),

  // Mark the thread read "now" for the current admin.
  markRead: (id) => axiosInstance.post(`/contact/${id}/read`).then((res) => res.data),

  // Admin: move a request through the workflow (pending → reviewed → responded).
  setStatus: async (id, status) => {
    const res = await axiosInstance.patch(`/contact/${id}/status`, { status });
    if (_cache) _cache = _cache.map((c) => (c._id === id ? { ...c, status } : c));
    return res.data;
  },

  // Admin: permanently delete a request.
  remove: async (id) => {
    const res = await axiosInstance.delete(`/contact/${id}`);
    if (_cache) _cache = _cache.filter((c) => c._id !== id);
    return res.data;
  },
};

export default contactsService;
