import axiosInstance from "./axios";

// Tickets are fetched in full (the screen filters/searches client-side), so the
// list is cached per session and de-duped via `_inFlight` — revisits are instant.
// The Refresh button / sockets force a re-fetch with { force: true }.
let _cache = null;
let _inFlight = null;
let _team = null;

const supportService = {
  // Synchronous peek at the cached list (null until loaded).
  getCached: () => _cache,

  // Resolve to the tickets array. Cached + de-duped; { force: true } refetches.
  list: ({ force = false } = {}) => {
    if (_cache && !force) return Promise.resolve(_cache);
    if (_inFlight && !force) return _inFlight;
    _inFlight = axiosInstance
      .get("/support-tickets")
      .then((res) => {
        _cache = res.data.tickets || [];
        _inFlight = null;
        return _cache;
      })
      .catch((err) => {
        _inFlight = null;
        throw err;
      });
    return _inFlight;
  },

  // Keep the session cache in step with optimistic/socket-driven UI changes.
  setCache: (next) => {
    _cache = typeof next === "function" ? next(_cache || []) : next;
    return _cache;
  },

  // Org team (admins) for the assignee dropdown + @mention list — reuses the
  // contacts team endpoint (same org admins).
  team: ({ force = false } = {}) => {
    if (_team && !force) return Promise.resolve(_team);
    return axiosInstance.get("/contact/team").then((res) => {
      _team = res.data;
      return _team;
    });
  },

  stats: () => axiosInstance.get("/support-tickets/stats"),
  get: (id) => axiosInstance.get(`/support-tickets/${id}`),
  create: (body) => axiosInstance.post("/support-tickets", body),
  update: (id, body) => axiosInstance.put(`/support-tickets/${id}`, body),
  assign: (id, userId) => axiosInstance.post(`/support-tickets/${id}/assign`, { userId }),
  setStatus: (id, body) => axiosInstance.patch(`/support-tickets/${id}/status`, body),
  comment: (id, body) => axiosInstance.post(`/support-tickets/${id}/comments`, body),
  addAttachment: (id, formData) => axiosInstance.post(`/support-tickets/${id}/attachments`, formData),
  remove: (id) => axiosInstance.delete(`/support-tickets/${id}`),

  // Tenant customer (logged-in donor) — their own tickets
  myList: () => axiosInstance.get("/support-tickets/my"),
  myCreate: (body) => axiosInstance.post("/support-tickets/my", body),
  myGet: (id) => axiosInstance.get(`/support-tickets/my/${id}`),
  myReply: (id, body) => axiosInstance.post(`/support-tickets/my/${id}/messages`, body),
  // Logged-in donor rates their own resolved ticket from the portal (no token).
  mySatisfaction: (id, body) => axiosInstance.post(`/support-tickets/my/${id}/satisfaction`, body),

  // Public (no auth)
  publicOrg: () => axiosInstance.get("/support-tickets/public/org"),
  publicSubmit: (body) => axiosInstance.post("/support-tickets/public/submit", body),
  // CSAT from the email link — token validates the link before/with submitting.
  getPublicSatisfaction: (id, token) => axiosInstance.get(`/support-tickets/public/satisfaction/${id}`, { params: { token } }),
  publicSatisfaction: (id, body) => axiosInstance.post(`/support-tickets/public/satisfaction/${id}`, body),
};

export default supportService;
