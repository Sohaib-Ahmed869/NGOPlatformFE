import axios from "./axios";
const API_URL = "/admin/orders";

// ---------------------------------------------------------------------------
// Default-load caches — instant first paint on revisit.
// Only the DEFAULT (page 1, no filters) loads are cached; filtered / paginated
// loads always fetch fresh and never read or write these.
// ---------------------------------------------------------------------------
let _donationsDefaultCache = null;    // default donations table list { donations, pagination }
let _donationsInFlight = null;
let _donationsBundleCache = null;     // donations screen initial bundle (raw responses)
let _donationsBundleInFlight = null;
let _installmentsCache = null;        // installments screen default load (raw getDonations resp)
let _installmentsInFlight = null;

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

  // ---- Donations list (table) default cache ------------------------------
  // Sync peek used to seed the screen instantly on revisit (null if not loaded).
  getCachedDonations() {
    return _donationsDefaultCache;
  }

  // "Default" for the donations table = page 1, no search, status "All",
  // type "All", default sort (createdAt / desc), default page size.
  _isDefaultDonationsParams(params = {}) {
    const page = params.page == null ? 1 : Number(params.page);
    const search = params.search ?? "";
    const status = params.status;
    const type = params.type;
    const sortBy = params.sortBy ?? "createdAt";
    const sortOrder = params.sortOrder ?? "desc";
    const limit = params.limit;
    return (
      page === 1 &&
      !search &&
      (status == null || status === "" || status === "All") &&
      (type == null || type === "" || type === "All") &&
      sortBy === "createdAt" &&
      sortOrder === "desc" &&
      (limit == null || Number(limit) === 10)
    );
  }

  // Cached wrapper around getDonations: caches ONLY the default load; any
  // filtered / paginated params always fetch fresh and bypass the cache.
  async getDonationsCached(params = {}, { force = false } = {}) {
    const isDefault = this._isDefaultDonationsParams(params);
    if (isDefault && _donationsDefaultCache && !force) return _donationsDefaultCache;
    if (isDefault && _donationsInFlight && !force) return _donationsInFlight;
    const p = this.getDonations(params);
    if (isDefault) {
      _donationsInFlight = p
        .then((r) => { _donationsDefaultCache = r; _donationsInFlight = null; return r; })
        .catch((e) => { _donationsInFlight = null; throw e; });
      return _donationsInFlight;
    }
    return p;
  }

  // ---- Donations screen initial bundle cache -----------------------------
  // Sync peek of the full first-paint payload (null if not loaded).
  getCachedDonationsBundle() {
    return _donationsBundleCache;
  }

  // Fetches every call the donations screen needs for its initial paint and
  // caches the raw responses so a revisit can render instantly without a loader.
  async getDonationsBundle({ sortBy = "createdAt", sortOrder = "desc" } = {}, { force = false } = {}) {
    if (_donationsBundleCache && !force) return _donationsBundleCache;
    if (_donationsBundleInFlight && !force) return _donationsBundleInFlight;
    const work = (async () => {
      const [stats, topDonors, donorStatsRes, listResp, allResp, countsResp] = await Promise.all([
        this.getDashboardStats(),
        this.getTopDonors(),
        axios.get("/admin/donors/dashboard/stats"),
        this.getDonations({ page: 1, limit: 10, sortBy, sortOrder }),
        this.getAllDonations({ sortBy, sortOrder }),
        this.getDonations({ page: 1, limit: 10000, sortBy, sortOrder }),
      ]);
      // Seed the table default cache so the first table render is instant too.
      _donationsDefaultCache = listResp;
      return {
        stats,
        topDonors,
        donorStats: donorStatsRes?.data?.data?.stats || null,
        list: listResp,
        allDonations: allResp,
        countsResponse: countsResp,
      };
    })();
    _donationsBundleInFlight = work
      .then((r) => { _donationsBundleCache = r; _donationsBundleInFlight = null; return r; })
      .catch((e) => { _donationsBundleInFlight = null; throw e; });
    return _donationsBundleInFlight;
  }

  // Drop every cached donations / installments default so the next default load
  // refetches. Call after any mutation (status update, donor update, …).
  invalidateDonationsCache() {
    _donationsDefaultCache = null;
    _donationsInFlight = null;
    _donationsBundleCache = null;
    _donationsBundleInFlight = null;
    _installmentsCache = null;
    _installmentsInFlight = null;
  }

  // ---- Installments screen default cache ---------------------------------
  // Sync peek used to seed the installments screen instantly (null if unloaded).
  getCachedInstallments() {
    return _installmentsCache;
  }

  // The installments screen always loads the same default page (page 1, no
  // search, status "all") and filters client-side; cache that single load.
  async getInstallmentsCached(params = {}, { force = false } = {}) {
    const isDefault =
      (params.page == null || Number(params.page) === 1) &&
      !params.search &&
      (params.status == null || params.status === "" || params.status === "all");
    if (isDefault && _installmentsCache && !force) return _installmentsCache;
    if (isDefault && _installmentsInFlight && !force) return _installmentsInFlight;
    const p = this.getDonations(params);
    if (isDefault) {
      _installmentsInFlight = p
        .then((r) => { _installmentsCache = r; _installmentsInFlight = null; return r; })
        .catch((e) => { _installmentsInFlight = null; throw e; });
      return _installmentsInFlight;
    }
    return p;
  }
}

export default new AdminDonationService();
