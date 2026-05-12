// services/donation.service.js
import axios from "./axios";

const DonationService = {
  getUserDonations: async () => {
    try {
      const response = await axios.get("/orders/my-orders");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getDonationStats: async () => {
    try {
      const response = await axios.get("/orders/stats");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default DonationService;