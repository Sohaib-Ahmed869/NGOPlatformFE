import axiosInstance from "./axios";

const multipart = { headers: { "Content-Type": "multipart/form-data" } };

const programService = {
  getAll: (params) => axiosInstance.get("/programs", { params }),

  getById: (id, params) => axiosInstance.get(`/programs/${id}`, { params }),

  getMyDonated: () => axiosInstance.get("/programs/my/donated"),

  create: (formData) => axiosInstance.post("/programs", formData, multipart),

  update: (id, formData) => axiosInstance.put(`/programs/${id}`, formData, multipart),

  donateToProgram: (id, data) => axiosInstance.post(`/programs/${id}/donate`, data),

  postFollowUp: (id, formData) => axiosInstance.post(`/programs/${id}/followup`, formData, multipart),

  closeProgram: (id) => axiosInstance.put(`/programs/${id}/close`),

  requestFollowUp: (id, data) => axiosInstance.post(`/programs/${id}/request-followup`, data),

  getFollowUpRequests: () => axiosInstance.get("/programs/admin/followup-requests"),

  acknowledgeRequest: (programId, requestId) =>
    axiosInstance.put(`/programs/admin/followup-requests/${programId}/${requestId}/acknowledge`),
};

export default programService;
