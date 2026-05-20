import axiosInstance from "./axios";

const tenantService = {
  checkSlug: (slug) => axiosInstance.get(`/saas/register/check-slug?slug=${slug}`),

  register: (data) => axiosInstance.post("/saas/register", data),

  getOrgStatus: (slug) => axiosInstance.get(`/saas/organisations/status?slug=${slug}`),

  getOrgBySlug: (slug) => axiosInstance.get(`/saas/organisations/slug/${slug}`),

  getPlans: () => axiosInstance.get("/saas/plans"),
};

export default tenantService;
