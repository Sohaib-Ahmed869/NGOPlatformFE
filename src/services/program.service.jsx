import axiosInstance from "./axios";

const programService = {
  getAll: (params) => axiosInstance.get("/programs", { params }),

  getById: (id) => axiosInstance.get(`/programs/${id}`),

  create: (data) => axiosInstance.post("/programs", data),

  donateToProgram: (id, data) => axiosInstance.post(`/programs/${id}/donate`, data),

  postFollowUp: (id, data) => axiosInstance.post(`/programs/${id}/followup`, data),

  closeProgram: (id) => axiosInstance.put(`/programs/${id}/close`),
};

export default programService;
