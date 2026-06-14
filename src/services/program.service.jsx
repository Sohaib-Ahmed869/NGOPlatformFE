import axiosInstance from "./axios";

const multipart = { headers: { "Content-Type": "multipart/form-data" } };

// The admin program list is cached per session + de-duped so the screen renders
// instantly on revisit (and never re-shows its loader). Mutations refresh the
// list with { force: true }, keeping the cache fresh.
let _cache = null; // array of admin programs (the res.data of getAll({ admin: "true" }))
let _inFlight = null;

const programService = {
  getAll: (params) => axiosInstance.get("/programs", { params }),

  // Sync peek at the cached admin list (null until the first load resolves).
  getCached: () => _cache,

  // Cached admin list — wraps the mount call getAll({ admin: "true" }) and
  // returns the programs array directly (the shape the screen sets into state).
  listCached: ({ force = false } = {}) => {
    if (_cache && !force) return Promise.resolve(_cache);
    if (_inFlight && !force) return _inFlight;
    _inFlight = axiosInstance
      .get("/programs", { params: { admin: "true" } })
      .then((res) => {
        _cache = res.data || [];
        _inFlight = null;
        return _cache;
      })
      .catch((err) => {
        _inFlight = null;
        throw err;
      });
    return _inFlight;
  },

  // Patch a single program in the cached list in place (e.g. a status toggle)
  // so a revisit reflects the change without a refetch.
  patchCache: (id, patch) => {
    if (_cache) _cache = _cache.map((p) => (p._id === id ? { ...p, ...patch } : p));
  },

  getById: (id, params) => axiosInstance.get(`/programs/${id}`, { params }),

  getMyDonated: () => axiosInstance.get("/programs/my/donated"),

  create: (formData) => axiosInstance.post("/programs", formData, multipart),

  update: (id, formData) => axiosInstance.put(`/programs/${id}`, formData, multipart),

  // Delete a program and drop it from the cached list immediately.
  remove: (id) =>
    axiosInstance.delete(`/programs/${id}`).then((res) => {
      if (_cache) _cache = _cache.filter((p) => p._id !== id);
      return res;
    }),

  donateToProgram: (id, data) => axiosInstance.post(`/programs/${id}/donate`, data),

  postFollowUp: (id, formData) => axiosInstance.post(`/programs/${id}/followup`, formData, multipart),

  closeProgram: (id) => axiosInstance.put(`/programs/${id}/close`),

  requestFollowUp: (id, data) => axiosInstance.post(`/programs/${id}/request-followup`, data),

  getFollowUpRequests: () => axiosInstance.get("/programs/admin/followup-requests"),

  acknowledgeRequest: (programId, requestId) =>
    axiosInstance.put(`/programs/admin/followup-requests/${programId}/${requestId}/acknowledge`),
};

export default programService;
