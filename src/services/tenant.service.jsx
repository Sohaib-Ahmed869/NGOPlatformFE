import axiosInstance from "./axios";

const tenantService = {
  checkSlug: (slug) => axiosInstance.get(`/saas/register/check-slug?slug=${slug}`),

  checkEmail: (email) => axiosInstance.get(`/saas/register/check-email?email=${encodeURIComponent(email)}`),

  register: (data) => axiosInstance.post("/saas/register", data),

  uploadRegistrationLogo: (formData) =>
    axiosInstance.post("/saas/register/upload-logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  getOrgStatus: (slug) => axiosInstance.get(`/saas/organisations/status?slug=${slug}`),

  // Finish a paid registration without waiting on Stripe's webhook — the server
  // re-verifies the subscription against Stripe before activating anything.
  confirmRegistration: (slug) => axiosInstance.post("/saas/register/confirm", { slug }),

  getOrgBySlug: (slug) => axiosInstance.get(`/saas/organisations/slug/${slug}`),

  getPlans: () => axiosInstance.get("/saas/plans"),

  getPublicPlans: () => axiosInstance.get("/saas/plans/public"),

  validateCoupon: (code, plan) =>
    axiosInstance.get(`/saas/coupon/${encodeURIComponent(code)}${plan ? `?plan=${encodeURIComponent(plan)}` : ""}`),

  // "Express interest" lead capture (the SuperAdmin Leads CRM) + its activation-link
  // prefill for /register.
  submitLead: (data) => axiosInstance.post("/saas/lead", data),
  getLeadPrefill: (token) => axiosInstance.get(`/saas/lead/prefill/${encodeURIComponent(token)}`),
};

export default tenantService;
