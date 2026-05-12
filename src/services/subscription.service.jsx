import axios from "./axios";

// Helper method to handle API errors
const handleApiError = (error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    return error.response.data;
  } else if (error.request) {
    // The request was made but no response was received
    return "No response from the server";
  }
  // Something happened in setting up the request that triggered an Error
  return error.message;
};

const SubscriptionService = {
  getActiveSubscriptions: async () => {
    try {
      const response = await axios.get("/subscriptions/active");
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  pauseSubscription: async (subscriptionId, pauseDuration, reason) => {
    try {
      const response = await axios.post(
        `/subscriptions/${subscriptionId}/pause`,
        {
          pauseDuration,
          reason,
        }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  resumeSubscription: async (subscriptionId) => {
    try {
      const response = await axios.post(
        `/subscriptions/${subscriptionId}/resume`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  cancelSubscription: async (subscriptionId, reason) => {
    try {
      const response = await axios.post(
        `/subscriptions/${subscriptionId}/cancel`,
        {
          reason,
        }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  requestCancellation: async (subscriptionId, reason) => {
    try {
      const response = await axios.post(
        `/subscriptions/${subscriptionId}/request-cancellation`,
        {
          reason,
        }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateSubscriptionAmount: async (subscriptionId, newAmount) => {
    try {
      const response = await axios.post(
        `/subscriptions/${subscriptionId}/update-amount`,
        {
          newAmount,
        }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Add to subscription.service.js
  updateSubscriptionEndDate: async (subscriptionId, newEndDate) => {
    try {
      const response = await axios.post(
        `/subscriptions/${subscriptionId}/update-end-date`,
        {
          newEndDate,
        }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // New helper method to handle subscription webhooks from Stripe
  handleStripeEvent: async (eventData) => {
    try {
      const response = await axios.post("/subscriptions/webhook", eventData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Method to get a specific subscription details
  getSubscriptionById: async (subscriptionId) => {
    try {
      const response = await axios.get(`/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

export default SubscriptionService;
