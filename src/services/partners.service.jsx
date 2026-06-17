import axiosInstance from "./axios";

// Partner enquiries — public "Become a partner" submission + admin management.
const partnersService = {
  // Public — accepts a plain object (JSON) or FormData (when a logo is attached).
  apply: (data) => {
    const isForm = typeof FormData !== "undefined" && data instanceof FormData;
    return axiosInstance
      .post("/partners/apply", data, isForm ? { headers: { "Content-Type": "multipart/form-data" } } : undefined)
      .then((r) => r.data);
  },

  // Public — approved + published partners for the website logo wall.
  publicList: () => axiosInstance.get("/partners/public").then((r) => r.data),

  // Admin
  list: (params = {}) => axiosInstance.get("/partners", { params }).then((r) => r.data),
  get: (id) => axiosInstance.get(`/partners/${id}`).then((r) => r.data),
  update: (id, data) => axiosInstance.patch(`/partners/${id}`, data).then((r) => r.data),
  remove: (id) => axiosInstance.delete(`/partners/${id}`).then((r) => r.data),
  // Upload/replace the public-facing logo (multipart, field name "logo").
  replaceLogo: (id, formData) =>
    axiosInstance
      .post(`/partners/${id}/public-logo`, formData, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data),
};

export default partnersService;
