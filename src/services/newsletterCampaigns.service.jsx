import axiosInstance from "./axios";

// Newsletter campaigns — compose, draft, schedule and send broadcasts to
// subscribers. No session cache: the list reflects live send progress, so the
// screen refetches as needed.
const newsletterCampaignsService = {
  list: () => axiosInstance.get(`/newsletter-campaigns`).then((r) => r.data),

  get: (id) => axiosInstance.get(`/newsletter-campaigns/${id}`).then((r) => r.data),

  // How many subscribers a given audience currently resolves to.
  recipientCount: (audience) =>
    axiosInstance
      .get(`/newsletter-campaigns/recipients`, {
        params: { type: audience?.type, days: audience?.days, source: audience?.source },
      })
      .then((r) => r.data?.count ?? 0),

  create: (data) => axiosInstance.post(`/newsletter-campaigns`, data).then((r) => r.data),

  update: (id, data) => axiosInstance.put(`/newsletter-campaigns/${id}`, data).then((r) => r.data),

  remove: (id) => axiosInstance.delete(`/newsletter-campaigns/${id}`).then((r) => r.data),

  sendNow: (id) => axiosInstance.post(`/newsletter-campaigns/${id}/send`).then((r) => r.data),

  schedule: (id, scheduledAt) =>
    axiosInstance.post(`/newsletter-campaigns/${id}/schedule`, { scheduledAt }).then((r) => r.data),

  cancelSchedule: (id) => axiosInstance.post(`/newsletter-campaigns/${id}/cancel`).then((r) => r.data),

  // Send a preview of the content to the signed-in admin.
  test: (data) => axiosInstance.post(`/newsletter-campaigns/test`, data).then((r) => r.data),
};

export default newsletterCampaignsService;
