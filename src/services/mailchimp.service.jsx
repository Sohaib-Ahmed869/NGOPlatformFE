import axiosInstance from "./axios";

// Per-tenant Mailchimp connection (admin). The API key is stored encrypted on
// the server and never returned — status only reports whether it's connected.
const mailchimpService = {
  status: () => axiosInstance.get(`/admin/mailchimp`).then((r) => r.data),

  // Validate + store an API key; returns { accountLabel, audiences }.
  connect: (apiKey) => axiosInstance.post(`/admin/mailchimp/connect`, { apiKey }).then((r) => r.data),

  audiences: () => axiosInstance.get(`/admin/mailchimp/audiences`).then((r) => r.data),

  // Save audience + sender identity.
  configure: (data) => axiosInstance.post(`/admin/mailchimp/configure`, data).then((r) => r.data),

  // Push our active subscribers into the chosen audience.
  sync: () => axiosInstance.post(`/admin/mailchimp/sync`).then((r) => r.data),

  disconnect: () => axiosInstance.delete(`/admin/mailchimp`).then((r) => r.data),
};

export default mailchimpService;
