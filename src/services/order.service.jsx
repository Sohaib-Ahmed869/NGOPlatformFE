import axios from "./axios";

export const OrderService = {
  createOrder: async (orderData) => {
    try {
      const response = await axios.post("/orders/create", orderData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getDonationReceiptUrl: async (donationId) => {
    try {
      const response = await axios.get(`/orders/donations/${donationId}/receipt`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching receipt for donation ${donationId}:`, error);
      throw error;
    }
  },

  updateDonationStatus: async (donationId, statusData) => {
    try {
      const status =
        typeof statusData === "string"
          ? statusData
          : statusData.status || statusData.paymentStatus;
      const requestData = { status };
      if (status === "cancelled" && statusData.reason) {
        requestData.reason = statusData.reason;
      }
      console.log(`Attempting to update donation ${donationId} status to ${status}`);
      console.log("Request data:", requestData);
      const response = await axios.put(`/orders/donations/${donationId}/status`, requestData);
      return response.data;
    } catch (error) {
      console.error(`Error updating donation ${donationId} status:`, error);
      throw error.response?.data || error.message;
    }
  },

  // Upload receipt
  uploadReceipt: async (formData) => {
    try {
      const response = await axios.post("/orders/upload-receipt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get receipt info
  getReceiptInfo: async (donationId) => {
    try {
      const response = await axios.get(`/orders/donation/${donationId}`);
      console.log("getReceiptInfo response:", response.data);
      if (response.data && response.data.success && response.data.order) {
        const { receiptUrl, receiptUploadedAt, paymentStatus } = response.data.order;
        // Only allow receipt access for completed donations
        if (paymentStatus !== 'completed') {
          throw new Error('Receipt access is only available for completed donations');
        }
        return {
          success: true,
          receipt: receiptUrl
            ? {
                fileUrl: receiptUrl,
                fileName: receiptUrl.split("/").pop(),
                uploadDate: receiptUploadedAt,
              }
            : null,
        };
      }
      return { success: false };
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete receipt
  deleteReceipt: async (donationId) => {
    try {
      const response = await axios.delete(`/orders/donation/${donationId}/receipt`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getReceiptViewUrl: async (donationId) => {
    try {
      // Request the file as an array buffer
      const response = await axios.get(
        `/orders/donation/${donationId}/view-receipt`,
        { responseType: "arraybuffer" }  // Important!
      );
      return response;  // We'll return the entire Axios response
    } catch (error) {
      console.error(`Error getting receipt view URL for donation ${donationId}:`, error);
      throw error.response?.data || error.message;
    }
  },
};
