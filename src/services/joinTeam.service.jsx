import axiosInstance from "./axios";

/**
 * Volunteer applications service.
 * The list is now server-driven (search / filter / sort / pagination + stats
 * all happen on the backend), so we don't cache the whole array. Each screen
 * action maps to a dedicated endpoint and returns the populated volunteer doc.
 */
const joinTeamService = {
  // Server-side list. `params` → { q, status, gender, assignedTo, from, to,
  // sortBy, sortOrder, page, limit }. Returns { items, total, page, pages, stats }.
  list: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    const q = qs.toString();
    return axiosInstance.get(`/join${q ? `?${q}` : ""}`).then((res) => res.data);
  },

  getById: (id) => axiosInstance.get(`/join/${id}`).then((res) => res.data),

  stats: () => axiosInstance.get(`/join/stats`).then((res) => res.data),

  team: () => axiosInstance.get(`/join/team`).then((res) => res.data),

  // Custom application questions (per-tenant). getForm is public-readable.
  getForm: () => axiosInstance.get(`/join/form`).then((res) => res.data?.questions || []),
  saveForm: (questions) =>
    axiosInstance.put(`/join/form`, { questions }).then((res) => res.data?.questions || []),

  // Full filtered set (no pagination) for CSV export.
  exportAll: ({ status } = {}) => {
    const qs = new URLSearchParams();
    if (status && status !== "all") qs.set("status", status);
    const q = qs.toString();
    return axiosInstance.get(`/join/export${q ? `?${q}` : ""}`).then((res) => res.data);
  },

  // Move through the workflow. `notify` emails the applicant for
  // shortlisted/approved/rejected. Returns the populated doc (+ `emailed`).
  setStatus: (id, status, notify = false) =>
    axiosInstance.patch(`/join/${id}/status`, { status, notify }).then((res) => res.data),

  assign: (id, assignedTo) =>
    axiosInstance.patch(`/join/${id}/assign`, { assignedTo }).then((res) => res.data),

  addNote: (id, body) => axiosInstance.post(`/join/${id}/notes`, { body }).then((res) => res.data),

  deleteNote: (id, noteId) =>
    axiosInstance.delete(`/join/${id}/notes/${noteId}`).then((res) => res.data),

  linkEvent: (id, payload) => axiosInstance.post(`/join/${id}/events`, payload).then((res) => res.data),

  updateAssignment: (id, assignmentId, payload) =>
    axiosInstance.patch(`/join/${id}/events/${assignmentId}`, payload).then((res) => res.data),

  unlinkEvent: (id, assignmentId) =>
    axiosInstance.delete(`/join/${id}/events/${assignmentId}`).then((res) => res.data),

  // Bulk: action = "status" (+status) | "delete".
  bulk: (ids, action, status) =>
    axiosInstance.patch(`/join/bulk`, { ids, action, status }).then((res) => res.data),

  remove: (id) => axiosInstance.delete(`/join/${id}`).then((res) => res.data),
};

export default joinTeamService;
