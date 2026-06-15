// services/donation.service.js
import axios from "./axios";

// Session cache for the donor's orders so the Subscriptions / Donations screens
// render instantly on revisit (stale-while-revalidate). Pass { force: true }
// after a mutation (pause/cancel/etc.) to bypass it.
let _userDonations = null;
let _inFlight = null;

// Donation stats get the same stale-while-revalidate cache so the My Donations
// summary tiles render instantly on revisit.
let _stats = null;
let _statsInFlight = null;

const DonationService = {
  getCachedUserDonations: () => _userDonations,

  getUserDonations: async ({ force = false } = {}) => {
    if (_userDonations && !force) return _userDonations;
    if (_inFlight && !force) return _inFlight;
    _inFlight = axios
      .get("/orders/my-orders")
      .then((response) => {
        _userDonations = response.data;
        _inFlight = null;
        return _userDonations;
      })
      .catch((error) => {
        _inFlight = null;
        throw error.response?.data || error.message;
      });
    return _inFlight;
  },

  getCachedDonationStats: () => _stats,

  getDonationStats: async ({ force = false } = {}) => {
    if (_stats && !force) return _stats;
    if (_statsInFlight && !force) return _statsInFlight;
    _statsInFlight = axios
      .get("/orders/stats")
      .then((response) => {
        _stats = response.data;
        _statsInFlight = null;
        return _stats;
      })
      .catch((error) => {
        _statsInFlight = null;
        throw error.response?.data || error.message;
      });
    return _statsInFlight;
  },
};

export default DonationService;