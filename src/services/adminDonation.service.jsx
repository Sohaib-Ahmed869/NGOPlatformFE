import axios from "./axios";
const API_URL = "/admin/orders";
class AdminDonationService {
  // Get dashboard statistics
  async getDashboardStats() {
    try {
      const response = await axios.get(`${API_URL}/dashboard/stats`);
      return response.data.stats;
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw error;
    }
  }

  // Get top donors
  async getTopDonors() {
    try {
      const response = await axios.get(`${API_URL}/dashboard/top-donors`);
      return response.data.topDonors;
    } catch (error) {
      console.error("Error fetching top donors:", error);
      throw error;
    }
  }

  // Get donations with filtering and pagination
  async getDonations(params = {}) {
    try {
      console.log('Frontend: Sending params', params);
      const response = await axios.get(`${API_URL}/donations`, { params });
      console.log('Frontend: Received response', response.data);
      return {
        donations: response.data.donations,
        pagination: response.data.pagination,
      };
    } catch (error) {
      console.error("Frontend: Error fetching donations:", error);
      throw error;
    }
  }

  // In AdminDonationService.js
async getAllDonations(params = {}) {
  try {
    const response = await axios.get(`${API_URL}/donations/all`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching all donations:", error);
    throw error;
  }
}


  // Get single donation by ID
  async getDonationById(id) {
    try {
      console.log(
        `Fetching donation with ID: ${id} from ${API_URL}/donations/${id}`
      );
      const response = await axios.get(`${API_URL}/donations/${id}`);
      console.log("Response from server:", response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching donation ${id}:`, error);
      throw error;
    }
  }

  // Update donation status
  async updateDonationStatus(id, statusData) {
    try {
      // Format data correctly
      let paymentStatus = typeof statusData === 'string' 
        ? statusData 
        : statusData.paymentStatus || (statusData.status && statusData.status.paymentStatus) || statusData.status;
      
      const isRecurring = statusData.isRecurring || (statusData.paymentType === 'recurring');
      
      // For bank transfer approval, set status to 'completed' for the payment
      if (paymentStatus === 'bank_transfer_approved') {
        paymentStatus = 'completed';
      }
      
      const requestData = { 
        paymentStatus,
        ...(statusData.reason && { reason: statusData.reason }),
        ...(statusData.cancellationReason && { reason: statusData.cancellationReason })
      };
      
      // Handle recurring donations
      if (isRecurring) {
        // For recurring donations, we need to set both payment status and recurring status
        if (paymentStatus === 'completed') {
          // When a recurring donation is approved, set it to active
          requestData.recurringStatus = 'active';
          // Also ensure the payment status is set to completed
          requestData.paymentStatus = 'completed';
        } else if (paymentStatus === 'paused') {
          requestData.recurringStatus = 'paused';
        } else if (paymentStatus === 'cancelled' || paymentStatus === 'ended') {
          requestData.recurringStatus = 'cancelled';
        }
      }
      
      // Log the request for debugging
      console.log(`Attempting to update donation ${id} status to ${paymentStatus}`);
      console.log("Request data:", requestData);
      
      // Try to match URL format from other successful API calls
      // This uses the exact same format as your getDonationById method
      const url = `/admin/orders/donations/${id}/status`;
      console.log(`Sending to ${url}`);
      
      const response = await axios.put(url, requestData);
      return response.data;
    } catch (error) {
      console.error(`Error updating donation ${id} status:`, error);
      
      // Enhanced error logging to help with debugging
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error('Headers:', error.response.headers);
        console.error('Data:', error.response.data);
      } else if (error.request) {
        console.error('Request made but no response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      
      throw error;
    }
  }

  // Export donations as CSV
  async exportDonations(filters = {}) {
    try {
      const response = await axios.get(`${API_URL}/export`, {
        params: filters,
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      console.error("Error exporting donations:", error);
      throw error;
    }
  }

  // Add a follow-up / close-off update for the donor (with optional images)
  async addDonorUpdate(id, { type, comment, images = [] }) {
    try {
      const formData = new FormData();
      formData.append("type", type);
      if (comment) formData.append("comment", comment);
      images.forEach((file) => formData.append("images", file));

      const response = await axios.post(
        `${API_URL}/donations/${id}/updates`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return response.data;
    } catch (error) {
      console.error(`Error adding donor update for donation ${id}:`, error);
      throw error;
    }
  }

  // Get donations for a specific user
  async getUserDonations(userId) {
    try {
      const response = await axios.get(`${API_URL}/donations/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching donations for user ${userId}:`, error);
      throw error;
    }
  }
}

export default new AdminDonationService();
