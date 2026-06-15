// services/paymentMethod.service.js
import axios from "./axios";

// Session-scoped cache (mirrors profile.service) so the Payment Methods screen
// renders instantly on revisits instead of flashing a loader every time.
// `getCached()` is a synchronous peek; mutations keep the cache in sync.
let _cache = null;
let _inFlight = null;

class PaymentMethodService {
  static BASE_URL = "/payment-methods";

  // Synchronous peek at the cached cards (null until first load).
  static getCached() {
    return _cache;
  }

  static async getAllPaymentMethods({ force = false } = {}) {
    if (_cache && !force) return _cache;
    if (_inFlight && !force) return _inFlight;
    _inFlight = axios
      .get(this.BASE_URL)
      .then((response) => {
        _cache = response.data.paymentMethods || [];
        _inFlight = null;
        return _cache;
      })
      .catch((error) => {
        _inFlight = null;
        console.error("Error fetching payment methods:", error);
        throw error.response?.data || error.message;
      });
    return _inFlight;
  }

  // Start saving a card — returns a Stripe SetupIntent client secret.
  static async createSetupIntent() {
    try {
      const response = await axios.post(`${this.BASE_URL}/setup-intent`);
      return response.data.clientSecret;
    } catch (error) {
      console.error("Error creating setup intent:", error);
      throw error.response?.data || error.message;
    }
  }

  // Persist a card after the SetupIntent confirms in the browser.
  static async addPaymentMethod(paymentMethodData) {
    try {
      const response = await axios.post(this.BASE_URL, paymentMethodData);
      _cache = null; // list needs a fresh fetch (ordering/default/heal)
      return response.data.paymentMethod;
    } catch (error) {
      console.error("Error adding payment method:", error);
      throw error.response?.data || error.message;
    }
  }

  static async deletePaymentMethod(paymentMethodId) {
    try {
      const response = await axios.delete(`${this.BASE_URL}/${paymentMethodId}`);
      if (_cache) _cache = _cache.filter((m) => m._id !== paymentMethodId);
      return response.data;
    } catch (error) {
      console.error("Error deleting payment method:", error);
      throw error.response?.data || error.message;
    }
  }

  static async setDefaultPaymentMethod(paymentMethodId) {
    try {
      const response = await axios.patch(`${this.BASE_URL}/${paymentMethodId}/default`);
      if (_cache) _cache = _cache.map((m) => ({ ...m, isDefault: m._id === paymentMethodId }));
      return response.data.paymentMethod;
    } catch (error) {
      console.error("Error setting default payment method:", error);
      throw error.response?.data || error.message;
    }
  }
}

export default PaymentMethodService;
