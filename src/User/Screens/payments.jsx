import React, { useState, useEffect } from "react";
import PageLoader from "../../components/PageLoader";
import {
  CreditCard,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import PaymentMethodService from "../../services/paymentMethod.service";
import { toast } from "react-hot-toast";
import AuthService from "../../services/auth.service";
import ProfileService from "../../services/profile.service";

const PaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: "",
    cardholderName: "",
    expiryDate: "",
    cvv: "",
    name: "",
    phone: "",
    email: "",
    street: "",
    suburb: "",
    state: "",
    postcode: ""
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchPaymentMethods();
    loadSavedFormData();
  }, []);

  const loadSavedFormData = async () => {
    try {
      // Get current user data
      const user = AuthService.getCurrentUser();
      if (user) {
        // Get profile data
        const profile = await ProfileService.getProfile();
        if (profile) {
          setFormData({
            name: profile.firstName || "",
            phone: profile.phone || "",
            email: profile.email || "",
            street: profile.address?.street || "",
            suburb: profile.address?.city || "",
            state: profile.address?.state || "",
            postcode: profile.address?.postalCode || ""
          });
        }
      }
    } catch (error) {
      console.error("Error loading saved form data:", error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const methods = await PaymentMethodService.getAllPaymentMethods();
      setPaymentMethods(methods);
    } catch (error) {
      toast.error(error.message || "Failed to fetch payment methods");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    // Card number validation (16 digits, spaces allowed)
    if (!/^\d{16}$/.test(formData.cardNumber.replace(/\s/g, ""))) {
      errors.cardNumber = "Please enter a valid 16-digit card number";
    }

    // Cardholder name validation
    if (!formData.cardholderName.trim()) {
      errors.cardholderName = "Cardholder name is required";
    }

    // Expiry date validation (MM/YY format)
    const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    if (!expiryRegex.test(formData.expiryDate)) {
      errors.expiryDate = "Please enter a valid expiry date (MM/YY)";
    } else {
      const [month, year] = formData.expiryDate.split("/");
      const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
      if (expiry < new Date()) {
        errors.expiryDate = "Card has expired";
      }
    }

    // CVV validation (3-4 digits)
    if (!/^\d{3,4}$/.test(formData.cvv)) {
      errors.cvv = "Please enter a valid CVV";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Format card number with spaces
    if (name === "cardNumber") {
      formattedValue = value
        .replace(/\s/g, "")
        .replace(/(\d{4})/g, "$1 ")
        .trim();
    }

    // Format expiry date
    if (name === "expiryDate") {
      formattedValue = value
        .replace(/\D/g, "")
        .replace(/(\d{2})(\d)/, "$1/$2")
        .slice(0, 5);
    }

    // Update form data
    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));

    // Save to profile if it's a profile field
    if (name !== "cardNumber" && name !== "expiryDate" && name !== "cvv") {
      try {
        const user = AuthService.getCurrentUser();
        if (user) {
          // Update profile
          const profileData = {
            firstName: formData.name,
            lastName: "", // Add if needed
            phone: formData.phone,
            email: formData.email,
            address: {
              street: formData.street,
              city: formData.suburb,
              state: formData.state,
              postalCode: formData.postcode
            }
          };

          await ProfileService.updateProfile(profileData);
        }
      } catch (error) {
        console.error("Error saving profile data:", error);
        toast.error("Failed to save profile data");
      }
    }

    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const [month, year] = formData.expiryDate.split("/");

      const newCard = await PaymentMethodService.addPaymentMethod({
        type: "credit_card",
        cardNumber: formData.cardNumber.replace(/\s/g, ""),
        cardholderName: formData.cardholderName,
        expiryMonth: month,
        expiryYear: `20${year}`,
      });

      setPaymentMethods((prev) => [...prev, newCard]);
      setShowAddForm(false);
      setFormData({
        cardNumber: "",
        cardholderName: "",
        expiryDate: "",
        cvv: "",
      });
      toast.success("Payment method added successfully");
    } catch (error) {
      toast.error(error.message || "Failed to add payment method");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCard = async (id) => {
    try {
      await PaymentMethodService.deletePaymentMethod(id);
      setPaymentMethods((prev) => prev.filter((method) => method.id !== id));
      toast.success("Payment method removed successfully");
    } catch (error) {
      toast.error(error.message || "Failed to remove payment method");
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await PaymentMethodService.setDefaultPaymentMethod(id);
      setPaymentMethods((prev) =>
        prev.map((method) => ({
          ...method,
          isDefault: method.id === id,
        }))
      );
      toast.success("Default payment method updated");
    } catch (error) {
      toast.error(error.message || "Failed to update default payment method");
    }
  };

  const getCardIcon = (type) => {
    switch (type.toLowerCase()) {
      case "visa":
        return "💳";
      case "mastercard":
        return "💳";
      default:
        return "💳";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-accent/10">
        <div className="flex flex-col lg:flex-row justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Payment Methods
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your payment methods for donations
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-light transition-colors"
            disabled={showAddForm}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Card
          </button>
        </div>
      </div>

      {/* Add New Card Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-accent/10">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Add New Card
          </h2>
          <form onSubmit={handleAddCard} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleInputChange}
                  placeholder="1234 5678 9012 3456"
                  maxLength="19"
                  className={`w-full px-4 py-2 border ${
                    formErrors.cardNumber ? "border-red-500" : "border-gray-200"
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-accent`}
                />
                {formErrors.cardNumber && (
                  <p className="mt-1 text-red-500 text-sm">
                    {formErrors.cardNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  name="cardholderName"
                  value={formData.cardholderName}
                  onChange={handleInputChange}
                  placeholder="Name on card"
                  className={`w-full px-4 py-2 border ${
                    formErrors.cardholderName
                      ? "border-red-500"
                      : "border-gray-200"
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-accent`}
                />
                {formErrors.cardholderName && (
                  <p className="mt-1 text-red-500 text-sm">
                    {formErrors.cardholderName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="text"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  placeholder="MM/YY"
                  maxLength="5"
                  className={`w-full px-4 py-2 border ${
                    formErrors.expiryDate ? "border-red-500" : "border-gray-200"
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-accent`}
                />
                {formErrors.expiryDate && (
                  <p className="mt-1 text-red-500 text-sm">
                    {formErrors.expiryDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVV
                </label>
                <input
                  type="text"
                  name="cvv"
                  value={formData.cvv}
                  onChange={handleInputChange}
                  placeholder="123"
                  maxLength="4"
                  className={`w-full px-4 py-2 border ${
                    formErrors.cvv ? "border-red-500" : "border-gray-200"
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-accent`}
                />
                {formErrors.cvv && (
                  <p className="mt-1 text-red-500 text-sm">{formErrors.cvv}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  placeholder="Enter your street address"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suburb
                </label>
                <input
                  type="text"
                  name="suburb"
                  value={formData.suburb}
                  onChange={handleInputChange}
                  placeholder="Enter your suburb"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Select state</option>
                  <option value="ACT">Australian Capital Territory (ACT)</option>
                  <option value="NSW">New South Wales (NSW)</option>
                  <option value="NT">Northern Territory (NT)</option>
                  <option value="QLD">Queensland (QLD)</option>
                  <option value="SA">South Australia (SA)</option>
                  <option value="TAS">Tasmania (TAS)</option>
                  <option value="VIC">Victoria (VIC)</option>
                  <option value="WA">Western Australia (WA)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postcode
                </label>
                <input
                  type="text"
                  name="postcode"
                  value={formData.postcode}
                  onChange={handleInputChange}
                  placeholder="Enter your postcode"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4 mt-6">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-light transition-colors disabled:opacity-50"
              >
                {submitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Add Card
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                disabled={submitting}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:text-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Saved Cards */}
      <div className="space-y-4">
        {loading ? (
          <PageLoader text="Loading payment methods..." />
        ) : paymentMethods.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border border-accent/10">
            <CreditCard className="w-12 h-12 mx-auto text-gray-400" />
            <p className="mt-2 text-gray-600">No payment methods added yet</p>
          </div>
        ) : (
          paymentMethods.map((method) => (
            <div
              key={method.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-accent/10 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{getCardIcon(method.type)}</div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {method.type === "credit_card"
                          ? "Credit Card"
                          : "Debit Card"}{" "}
                        ending in {method.cardNumber}
                      </h3>
                      {method.isDefault && (
                        <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mt-1">
                      Expires {method.expiryMonth}/{method.expiryYear}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                 
                  <button
                    onClick={() => handleDeleteCard(method.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove card"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Security Note */}
      <div className="bg-background rounded-lg p-4 flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
        <p className="text-sm text-accent">
          Your payment information is securely stored and encrypted. We never
          store your full card details on our servers.
        </p>
      </div>
    </div>
  );
};

export default PaymentMethods;
