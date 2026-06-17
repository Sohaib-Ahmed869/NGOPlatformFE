import axiosInstance from "./axios";

/**
 * Admin: manage the tenant's marketing sending mailboxes. Passwords are
 * write-only — the API returns only `hasPassword`, never the secret.
 */
const mailboxService = {
  list: () => axiosInstance.get("/admin/mailboxes").then((r) => r.data),

  create: (data) => axiosInstance.post("/admin/mailboxes", data).then((r) => r.data),

  update: (id, data) => axiosInstance.put(`/admin/mailboxes/${id}`, data).then((r) => r.data),

  test: (id) => axiosInstance.post(`/admin/mailboxes/${id}/test`).then((r) => r.data),

  setDefault: (id) => axiosInstance.post(`/admin/mailboxes/${id}/default`).then((r) => r.data),

  remove: (id) => axiosInstance.delete(`/admin/mailboxes/${id}`).then((r) => r.data),
};

export default mailboxService;
