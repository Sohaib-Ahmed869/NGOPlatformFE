import axiosInstance from "./axios";

const superadminService = {
  getStats: () => axiosInstance.get("/superadmin/stats"),

  getOrganisations: (params) =>
    axiosInstance.get("/superadmin/organisations", { params }),

  updateOrgPlan: (id, plan) =>
    axiosInstance.patch(`/superadmin/organisations/${id}/plan`, { plan }),

  suspendOrg: (id) =>
    axiosInstance.patch(`/superadmin/organisations/${id}/suspend`),

  getBillingStats: () => axiosInstance.get("/superadmin/billing"),

  // Branding requests
  getBrandingRequests: (status) =>
    axiosInstance.get(`/superadmin/branding-requests?status=${status || "pending"}`),

  approveBrandingRequest: (id, note) =>
    axiosInstance.patch(`/superadmin/branding-requests/${id}/approve`, { note }),

  rejectBrandingRequest: (id, note) =>
    axiosInstance.patch(`/superadmin/branding-requests/${id}/reject`, { note }),

  // Contact queries
  getContactQueries: (status) =>
    axiosInstance.get(`/superadmin/contact-queries${status && status !== "all" ? `?status=${status}` : ""}`),

  updateContactQueryStatus: (id, data) =>
    axiosInstance.patch(`/superadmin/contact-queries/${id}/status`, data),
};

export default superadminService;
