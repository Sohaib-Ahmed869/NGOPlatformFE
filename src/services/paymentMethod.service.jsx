// services/paymentMethod.service.js
import axios from "./axios";

class PaymentMethodService {
  static BASE_URL = "/payment-methods";

  static async getAllPaymentMethods() {
    try {
      const response = await axios.get(this.BASE_URL);
      return response.data.paymentMethods;
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      throw error.response?.data || error.message;
    }
  }

  static async addPaymentMethod(paymentMethodData) {
    try {
      const response = await axios.post(this.BASE_URL, paymentMethodData);
      return response.data.paymentMethod;
    } catch (error) {
      console.error("Error adding payment method:", error);
      throw error.response?.data || error.message;
    }
  }

  static async deletePaymentMethod(paymentMethodId) {
    try {
      const response = await axios.delete(
        `${this.BASE_URL}/${paymentMethodId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error deleting payment method:", error);
      throw error.response?.data || error.message;
    }
  }

  static async setDefaultPaymentMethod(paymentMethodId) {
    try {
      const response = await axios.patch(
        `${this.BASE_URL}/${paymentMethodId}/default`
      );
      return response.data.paymentMethod;
    } catch (error) {
      console.error("Error setting default payment method:", error);
      throw error.response?.data || error.message;
    }
  }
}

export default PaymentMethodService;
