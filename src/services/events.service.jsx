import axiosInstance from "./axios";

/**
 * Admin events service.
 * The full list (used by the table + stat cards) is cached per session and
 * de-duped, so revisits are instant and never re-show the loader. Mutations
 * invalidate the cache so the next load is fresh. Registration endpoints are
 * always live (never cached).
 */
let _cache = null; // { events, pagination } for the full list
let _inFlight = null;

const eventsService = {
  getCached: () => _cache,

  // Full list (admin table). High limit + client-side filter/sort/paginate.
  getAll: ({ force = false } = {}) => {
    if (_cache && !force) return Promise.resolve(_cache);
    if (_inFlight && !force) return _inFlight;
    _inFlight = axiosInstance
      .get(`/admin/events?limit=500&sortBy=date&sortOrder=desc`)
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

  getById: (id) => axiosInstance.get(`/admin/events/${id}`).then((res) => res.data),

  stats: () => axiosInstance.get(`/admin/events/stats`).then((res) => res.data),

  create: async (formData) => {
    const res = await axiosInstance.post("/admin/events", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    _cache = null;
    return res;
  },

  update: async (id, formData) => {
    const res = await axiosInstance.put(`/admin/events/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    _cache = null;
    return res;
  },

  remove: async (id) => {
    const res = await axiosInstance.delete(`/admin/events/${id}`);
    _cache = null;
    return res;
  },

  // ── Registrations ──
  listRegistrations: (eventId, { rsvpStatus, attended, search } = {}) => {
    const params = new URLSearchParams();
    if (rsvpStatus && rsvpStatus !== "all") params.set("rsvpStatus", rsvpStatus);
    if (attended === "true" || attended === "false") params.set("attended", attended);
    if (search) params.set("search", search);
    const qs = params.toString();
    return axiosInstance
      .get(`/admin/events/${eventId}/registrations${qs ? `?${qs}` : ""}`)
      .then((res) => res.data);
  },

  addRegistration: (eventId, data) =>
    axiosInstance.post(`/admin/events/${eventId}/registrations`, data).then((res) => res.data),

  updateRegistration: (eventId, regId, data) =>
    axiosInstance
      .patch(`/admin/events/${eventId}/registrations/${regId}`, data)
      .then((res) => res.data),

  removeRegistration: (eventId, regId) =>
    axiosInstance.delete(`/admin/events/${eventId}/registrations/${regId}`).then((res) => res.data),

  exportRegistrations: (eventId) =>
    axiosInstance.get(`/admin/events/${eventId}/registrations/export`, { responseType: "blob" }),

  // ── Event payments (cross-event paid registrations dashboard) ──
  listPayments: ({
    page,
    limit,
    search,
    paymentStatus,
    eventId,
    startDate,
    endDate,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = {}) => {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (limit) params.set("limit", limit);
    if (search) params.set("search", search);
    if (paymentStatus && paymentStatus !== "all") params.set("paymentStatus", paymentStatus);
    if (eventId && eventId !== "all") params.set("eventId", eventId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    return axiosInstance
      .get(`/admin/events/payments/list?${params.toString()}`)
      .then((res) => res.data);
  },
};

export default eventsService;
