import axiosInstance from "./axios";

const multipart = { headers: { "Content-Type": "multipart/form-data" } };

/**
 * Supporter fundraisers ("GoFundMe") service. Public reads, supporter create +
 * my-requests/donations, Stripe + PayPal donation flows, and admin moderation.
 */
const GoFundMeService = {
  // ── Public ──
  getPublicCampaigns: (params = {}) =>
    axiosInstance.get("/gofundme/public", { params }).then((r) => r.data),
  getCampaignBySlug: (slug) =>
    axiosInstance.get(`/gofundme/campaign/${slug}`).then((r) => r.data),
  getCategories: () => axiosInstance.get("/gofundme/categories").then((r) => r.data),

  // ── Supporter ──
  createGoFundMe: (formData) =>
    axiosInstance.post("/gofundme", formData, multipart).then((r) => r.data),
  getMyRequests: () => axiosInstance.get("/gofundme/my-requests").then((r) => r.data),
  getMyDonations: (params = {}) =>
    axiosInstance.get("/gofundme/my-donations", { params }).then((r) => r.data),

  // ── Stripe ──
  createPaymentIntent: (campaignId, data) =>
    axiosInstance.post(`/gofundme/create-payment-intent/${campaignId}`, data).then((r) => r.data),
  processDonation: (paymentIntentId) =>
    axiosInstance.post("/gofundme/process-donation", { paymentIntentId }).then((r) => r.data),

  // ── PayPal ──
  createPayPalOrder: (campaignId, data) =>
    axiosInstance.post(`/gofundme/${campaignId}/paypal/create-order`, data).then((r) => r.data),
  capturePayPalDonation: (campaignId, data) =>
    axiosInstance.post(`/gofundme/${campaignId}/paypal/capture`, data).then((r) => r.data),

  // ── Admin ──
  getAdminRequests: (params = {}) =>
    axiosInstance.get("/gofundme/admin/requests", { params }).then((r) => r.data),
  getCampaignDonors: (campaignId, params = {}) =>
    axiosInstance.get(`/gofundme/admin/donors/${campaignId}`, { params }).then((r) => r.data),
  getCampaignAnalytics: (campaignId) =>
    axiosInstance.get(`/gofundme/admin/analytics/${campaignId}`).then((r) => r.data),
  reviewRequest: (requestId, reviewData) =>
    axiosInstance.put(`/gofundme/admin/review/${requestId}`, reviewData).then((r) => r.data),
  getAdminStats: () => axiosInstance.get("/gofundme/admin/stats").then((r) => r.data),
  getAdminPayments: (params = {}) =>
    axiosInstance.get("/gofundme/admin/payments", { params }).then((r) => r.data),
  remove: (id) => axiosInstance.delete(`/gofundme/${id}`).then((r) => r.data),
};

export default GoFundMeService;
