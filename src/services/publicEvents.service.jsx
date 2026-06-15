import axiosInstance from "./axios";

// Public (visitor-facing) event endpoints — listing, detail, RSVP and the
// in-house Stripe payment flow for paid events. Kept separate from the
// admin `events.service` (which talks to /admin/events and is cached).
const publicEventsService = {
  list: () => axiosInstance.get("/events").then((r) => r.data),

  getById: (id) => axiosInstance.get(`/events/${id}`).then((r) => r.data),

  // Has the current user / this email already registered?
  registrationStatus: (id, email) =>
    axiosInstance
      .get(`/events/${id}/registration-status`, { params: email ? { email } : {} })
      .then((r) => r.data),

  // Free events — RSVP directly.
  register: (id, data) => axiosInstance.post(`/events/${id}/register`, data).then((r) => r.data),

  // Paid events — create a PaymentIntent (reserves a pending registration).
  createPaymentIntent: (id, data) =>
    axiosInstance.post(`/events/${id}/payment-intent`, data).then((r) => r.data),

  // Paid events — finalise after the PaymentElement confirms.
  confirmPayment: (id, paymentIntentId) =>
    axiosInstance.post(`/events/${id}/confirm-payment`, { paymentIntentId }).then((r) => r.data),

  // The signed-in user's own event registrations (incl. payment fields).
  myRegistrations: () => axiosInstance.get("/events/my/registrations").then((r) => r.data),
};

export default publicEventsService;
