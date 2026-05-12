import React, { useState } from "react";
import { useCart } from "./cart";
import { useAuth } from "../../context/AuthContext";
import { useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import axiosInstance from "../../services/axios";
import donationTypeService from "../../services/donationtypeservice";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
// Initialize Stripe with your publishable key
const stripePromise = loadStripe(
  "pk_live_51QXz3MRpf6nBaPfeHrMN5CbwAY2KoguP7mB8rt400veyvix4VLmHPfNnQ1M2xlWMJBszylk6hweYYk0CDWySvhTA00Z6ayoPJ5"
// "pk_test_51R4HwEP1U1i66wzc0CML1t20v7wPQrvuXPKrrXpnBJ0XVdIEDHuPazuL1ZPIVlQcbk4fSpCTrjla8nsMFog708Vl0031BNIGKo"

);
//  maryam's test key

//  "pk_live_51QXz3MRpf6nBaPfeHrMN5CbwAY2KoguP7mB8rt400veyvix4VLmHPfNnQ1M2xlWMJBszylk6hweYYk0CDWySvhTA00Z6ayoPJ5"

// const stripePromise = loadStripe(
//   "pk_test_51OpbgVEUOaf2osppFuZpU9bkzw5Lml8DnipRkYfyRwXkyCubUe6gdvAjHvtMRLN8KLBI11eCDqk36ScyDj1kdfCI002FULOKh8"
// );
import {
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import give from "../../assets/give.png";
import { OrderService } from "../../services/order.service";
import { toast } from "react-hot-toast";
import mastercard from "../../assets/mastercard.png";
import visa from "../../assets/visa.png";
import paypal from "../../assets/paypal.png";
import apple from "../../assets/applepay.png";
import google from "../../assets/gpay.png";

const StripeCardForm = ({ onPaymentMethodCreated, isSubmitting }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState("");
  const [cardComplete, setCardComplete] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const processCard = async () => {
    if (!stripe || !elements) return false;
    setIsVerifying(true);
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setIsVerifying(false);
      return false;
    }
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
    });
    if (error) {
      setCardError(error.message);
      setIsVerifying(false);
      return false;
    } else {
      setCardError("");
      setIsVerifying(false);
      setIsVerified(true);
      onPaymentMethodCreated(paymentMethod);
      toast.success("Card details verified");
      return true;
    }
  };
  // Fetch donation types on component mount

  return (
    <div className="mt-4">
      <div className="p-4 border rounded-2xl mb-4">
        <label className="block text-sm font-medium mb-2">Card Details</label>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#424770",
                "::placeholder": {
                  color: "#aab7c4",
                },
              },
              invalid: {
                color: "#9e2146",
              },
            },
          }}
          onChange={(e) => {
            setCardComplete(e.complete);
            if (e.error) {
              setCardError(e.error.message);
            } else {
              setCardError("");
            }
          }}
        />
        {cardError && (
          <div className="text-red-500 text-sm mt-2">{cardError}</div>
        )}

        {cardComplete && !isSubmitting && (
          <button
            type="button"
            onClick={processCard}
            className="mt-4 px-4 py-2 text-[#2C2418] rounded-xl hover:scale-[1.01] transition-transform flex items-center"
            style={{ background: "linear-gradient(180deg, #D4B85A 0%, #C9A84C 100%)" }}
            disabled={isVerifying || isVerified}
          >
            {isVerifying ? (
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : isVerified ? (
              <Check className="h-5 w-5 mr-2" />
            ) : null}
            {isVerifying
              ? "Verifying..."
              : isVerified
              ? "Verified"
              : "Verify Card Details"}
          </button>
        )}
      </div>
    </div>
  );
};
const UnifiedCheckout = () => {
  const navigate = useNavigate();
  const {
    items,
    total,
    clearCart,
    addItem,
    removeItem,
    updateQuantity,
    UpdateItemType,
  } = useCart();
  const [activeStep, setActiveStep] = useState(1);
  const [paymentType, setPaymentType] = useState("single");
  const [adminCostPercentage, setAdminCostPercentage] = useState(2);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [donationId] = useState("1234578");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { user } = useAuth();
  const [onBehalfOf, setOnBehalfOf] = useState({});
  const [recurringFrequency, setRecurringFrequency] = useState("monthly");
  const [billingDay, setBillingDay] = useState(new Date().getDate());
  const [recurringAmount, setRecurringAmount] = useState(total);
  const [stripePaymentMethod, setStripePaymentMethod] = useState(null);
  const [stripeError, setStripeError] = useState(null);
  const [submittingCardForm, setSubmittingCardForm] = useState(false);
  const [selectedDonationType, setSelectedDonationType] = useState("");
  const [installmentMonths, setInstallmentMonths] = useState(3);
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [totalRecurringPayments, setTotalRecurringPayments] = useState(0);
  const [hasRamadanRecurringItems, setHasRamadanRecurringItems] =
    useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [donationTypes, setDonationTypes] = useState([]);
  const [loadingDonationTypes, setLoadingDonationTypes] = useState(true);
  const [savedDataIndicator, setSavedDataIndicator] = useState({
    name: false,
    phone: false,
    email: false,
    address: {
      street: false,
      city: false,
      state: false,
      postalCode: false,
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    streetAddress: "",
    townCity: "",
    state: "",
    postcode: "",
    rememberDetails: false,
    agreeToMessages: false,
  });
  useEffect(() => {
    window.scrollTo(0, 0);

    // If user is logged in, fetch their profile data to prefill the form
    if (user) {
      fetchUserProfile();
    }
  }, [user]); // Re-run when user changes (login/logout)

  // Add this function to fetch user profile data
  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      // Get the token from auth context or localStorage
      const token = localStorage.getItem("token"); // adjust based on how you store the token

      // Make API call to get user profile
      const response = await axiosInstance.get("/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.status === "Success") {
        const profileData = response.data.user;
        console.log("User profile data fetched:", profileData);

        // Now prefill the form with this data
        prefillFormWithUserData(profileData);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };
  useEffect(() => {
    const fetchDonationTypes = async () => {
      try {
        setLoadingDonationTypes(true);
        const response = await donationTypeService.getAll();
        if (response.success && response.data) {
          setDonationTypes(response.data);
          console.log("Donation types fetched:", response.data);
        } else {
          // Fallback to hardcoded types if API fails
          const fallbackTypes = [
            { donationType: "Sadaqah" },
            { donationType: "Zakat ul Maal" },
            { donationType: "Zakat ul Fitr" },
            { donationType: "Education Fund" },
            { donationType: "Water Fund" },
            { donationType: "Food Fund" },
            { donationType: "Emergency Fund" },
          ];
          setDonationTypes(fallbackTypes);
        }
      } catch (err) {
        console.error("Error fetching donation types:", err);
        // Fallback to hardcoded types
        const fallbackTypes = [
          { donationType: "Sadaqah" },
          { donationType: "Zakat ul Maal" },
          { donationType: "Zakat ul Fitr" },
          { donationType: "Education Fund" },
          { donationType: "Water Fund" },
          { donationType: "Food Fund" },
          { donationType: "Emergency Fund" },
        ];
        setDonationTypes(fallbackTypes);
      } finally {
        setLoadingDonationTypes(false);
      }
    };
    fetchDonationTypes();
  }, []);

  const onChangeDonationType = (item, donationType) => {
    const updatedItems = items.map((i) =>
      i.id === item.id ? { ...i, donationType } : i
    );

    UpdateItemType(item.id, donationType);
    setSelectedDonationType(donationType);
    toast.success(`Donation type set to ${donationType}`);
  };

  const isCartEmpty = items.length === 0;

  // Modify the handleUpdateProfile function to handle null/empty postal code
  const handleUpdateProfile = async () => {
    // Only attempt to update if user exists and checkbox is checked
    if (user && formData.rememberDetails) {
      try {
        setIsUpdatingProfile(true);

        // Validate inputs before sending
        const validateInput = () => {
          const errors = {};

          // Name validation
          if (!formData.name.trim()) {
            errors.name = "Name is required";
          }

          // Phone validation (optional: add more robust validation if needed)
          if (!formData.phone.trim()) {
            errors.phone = "Phone number is required";
          }

          // Email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!formData.email.trim()) {
            errors.email = "Email is required";
          } else if (!emailRegex.test(formData.email)) {
            errors.email = "Invalid email format";
          }

          // Postal code validation - make it optional or validate based on your requirements
          if (formData.postcode && formData.postcode.trim() === "") {
            errors.postcode = "Postal code cannot be an empty string";
          }

          return errors;
        };

        // Check for validation errors
        const validationErrors = validateInput();
        if (Object.keys(validationErrors).length > 0) {
          // Display validation errors
          Object.values(validationErrors).forEach((error) => {
            toast.error(error);
          });
          return;
        }

        // Prepare update payload with more robust name splitting
        const nameParts = formData.name.trim().split(" ");
        const updatePayload = {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" ") || "", // Handle single name scenarios
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          address: {
            street: formData.streetAddress.trim(),
            city: formData.townCity.trim(),
            state: formData.state.trim(),
            // Only include postalCode if it's not an empty string
            postalCode: formData.postcode.trim(),
          },
          agreeToMessages: formData.agreeToMessages,
        };

        // Log payload for debugging (remove in production)
        console.log("Update Payload:", JSON.stringify(updatePayload, null, 2));

        // Call update profile API with improved error handling
        const response = await axiosInstance.put(
          "/users/update",
          updatePayload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
            timeout: 10000, // 10 second timeout
          }
        );
        if (response.data.status === "Success") {
          // Successful update
          toast.success("Profile updated successfully", {
            duration: 3000,
            position: "top-right",
          });

          // Optional: Trigger a re-fetch of user profile to ensure latest data
          if (fetchUserProfile) {
            fetchUserProfile();
          }
        } else {
          // Server returned error status
          toast.error(response.data.message || "Failed to update profile", {
            duration: 3000,
            position: "top-right",
          });
        }
      } catch (error) {
        // Comprehensive error handling
        console.error("Profile update error:", error);

        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          toast.error(
            error.response.data.message ||
              error.response.data.error ||
              "Server error occurred while updating profile",
            { duration: 3000, position: "top-right" }
          );
        } else if (error.request) {
          // The request was made but no response was received
          toast.error("No response received from server", {
            duration: 3000,
            position: "top-right",
          });
        } else {
          // Something happened in setting up the request that triggered an Error
          toast.error("Error setting up profile update request", {
            duration: 3000,
            position: "top-right",
          });
        }
      } finally {
        // Always reset updating state
        setIsUpdatingProfile(false);
      }
    }
  };

  // Modify the prefillFormWithUserData function to handle null postal code
  const prefillFormWithUserData = (profileData) => {
    if (!profileData) return;

    // Prepare name from different possible sources
    let fullName = "";
    if (profileData.name) {
      fullName = profileData.name;
    } else if (profileData.firstName || profileData.lastName) {
      fullName = `${profileData.firstName || ""} ${
        profileData.lastName || ""
      }`.trim();
    }

    // Extract address safely, handling both object and nested structure
    const address = profileData.address || {};

    // Build the form data from profile data
    const newFormData = {
      name: fullName,
      phone: profileData.phone || "",
      email: profileData.email || "",
      streetAddress: address.street || "",
      townCity: address.city || "",
      state: address.state || "",
      // Explicitly handle null or undefined postal code
      postcode: address.postalCode || "", // Use nullish coalescing to default to empty string
      rememberDetails: true, // Default to true when user is logged in
      agreeToMessages: profileData.agreeToMessages || false,
    };

    // Track which fields were pre-filled
    const fieldsPreFilled = {
      name: Boolean(fullName),
      phone: Boolean(profileData.phone),
      email: Boolean(profileData.email),
      address: {
        street: Boolean(address.street),
        city: Boolean(address.city),
        state: Boolean(address.state),
        // Check if postal code exists (handle null or empty string)
        postalCode: Boolean(address.postalCode),
      },
    };

    // Check if any field was pre-filled
    const hasPreFilledData =
      fieldsPreFilled.name ||
      fieldsPreFilled.phone ||
      fieldsPreFilled.email ||
      Object.values(fieldsPreFilled.address).some(Boolean);

    // Update state
    setFormData(newFormData);
    setSavedDataIndicator(fieldsPreFilled);

    // Show notification only if some data was pre-filled (once)
    if (hasPreFilledData && !window.__profileToastShown) {
      window.__profileToastShown = true;
      toast.success("We've filled some information from your saved profile");
    }
  };

  const handleBackButton = () => {
    if (activeStep === 1) {
      // Redirect to home page when back is clicked on first step
      navigate("/");
    } else {
      // Otherwise just go back one step
      setActiveStep((prev) => Math.max(1, prev - 1));
    }
  };

  const handleRemoveItem = (itemId) => {
    removeItem(itemId);
    // If this will be the last item, consider moving back to previous page
    if (items.length === 1) {
      toast.info("Your cart is now empty");
    }
  };
  // Helper to calculate the total number of payments
  const calculateTotalPayments = (startDate, endDate, frequency) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    switch (frequency) {
      case "daily":
        count = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        break;
      case "weekly":
        count = Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 7)) + 1;
        break;
      case "monthly":
        count =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()) +
          1;
        break;
      case "yearly":
        count = end.getFullYear() - start.getFullYear() + 1;
        break;
      default:
        count = 0;
    }
    return count;
  };

  // Check for Ramadan donations and pre-configure checkout
  useEffect(() => {
    // Check if any items in the cart are from Ramadan page and have recurring details
    const ramadanRecurringItems = items.filter(
      (item) =>
        item.source === "ramadan" && item.isRecurring && item.recurringDetails
    );

    setHasRamadanRecurringItems(ramadanRecurringItems.length > 0);

    // If we have Ramadan recurring items, set up the checkout form accordingly
    if (ramadanRecurringItems.length > 0) {
      // Get the first Ramadan recurring item to use its settings
      const ramadanItem = ramadanRecurringItems[0];

      // Set payment type to recurring
      setPaymentType("recurring");

      // Set frequency (usually daily for Ramadan last 10 nights)
      setRecurringFrequency(ramadanItem.recurringDetails.frequency || "daily");

      // Set amount from the item price
      setRecurringAmount(ramadanItem.price);

      // Set end date from recurring details
      if (ramadanItem.recurringDetails.endDate) {
        setRecurringEndDate(ramadanItem.recurringDetails.endDate);
      }

      // Set total payments
      if (ramadanItem.recurringDetails.totalPayments) {
        setTotalRecurringPayments(ramadanItem.recurringDetails.totalPayments);
      } else {
        // Calculate based on end date and frequency if not provided
        const startDate = new Date(
          ramadanItem.recurringDetails.startDate || new Date()
        );
        const endDate = new Date(ramadanItem.recurringDetails.endDate);
        const total = calculateTotalPayments(
          startDate,
          endDate,
          ramadanItem.recurringDetails.frequency
        );
        setTotalRecurringPayments(total);
      }

      // Set donation type to Sadaqa (common for Ramadan)
      setSelectedDonationType("Sadaqa");

      // Show a notification to the user
      toast.success("Your Ramadan recurring donation has been configured");
    }
  }, [items]); // This will run whenever the cart items change

  useEffect(() => {
    if (recurringEndDate) {
      const total = calculateTotalPayments(
        new Date(),
        recurringEndDate,
        recurringFrequency
      );
      setTotalRecurringPayments(total);
    } else {
      setTotalRecurringPayments(0);
    }
  }, [recurringEndDate, recurringFrequency]);

  // Add this function to handle Stripe payment method creation
  const handlePaymentMethodCreated = (paymentMethod) => {
    setStripePaymentMethod(paymentMethod);
    setStripeError(null);
  };

  const validateDonorDetails = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.phone) newErrors.phone = "Phone is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Add onBehalfOf handler
  const handleOnBehalfOfChange = (itemId, value) => {
    setOnBehalfOf((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  // Handle adding the same item again
  const handleAddAgain = (item) => {
    addItem(item);
    toast.success(`Added another ${item.title} to your donations`);
  };

  // Handle quantity updates
  const handleQuantityChange = (itemId, delta) => {
    updateQuantity(itemId, delta);
  };

  const handleSubmitOrder = async () => {
    // Form validation
    if (!validateDonorDetails()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.name === "") {
      toast.error("Please enter your name");
      return;
    }

    if (!selectedPaymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (
      (selectedPaymentMethod === "visa" ||
        selectedPaymentMethod === "mastercard") &&
      !stripePaymentMethod
    ) {
      setSubmittingCardForm(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!stripePaymentMethod) {
        toast.error("Please enter valid card details");
        setSubmittingCardForm(false);
        return;
      }
    }

    setLoading(true);

    try {
      if (formData.rememberDetails && user) {
        try {
          let firstName = "";
          let lastName = "";
          if (formData.name.includes(" ")) {
            const nameParts = formData.name.split(" ");
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(" ");
          } else {
            firstName = formData.name;
          }

          console.log("Saving user details:", {
            firstName,
            lastName,
            phone: formData.phone,
            address: {
              street: formData.streetAddress,
              city: formData.townCity,
              state: formData.state,
              postalCode: formData.postcode,
            },
          });
          const userUpdateResponse = await axiosInstance.put("/users/update", {
            firstName,
            lastName,
            phone: formData.phone,
            address: {
              street: formData.streetAddress,
              city: formData.townCity,
              state: formData.state,
              postalCode: formData.postcode,
            },
          });

          if (userUpdateResponse.data.status === "Success") {
            toast.success("Your details have been saved for future donations");
          }
        } catch (userUpdateError) {
          console.error("Failed to save user details:", userUpdateError);
          toast.error(
            "Could not save your details, but your donation will still be processed"
          );
        }
      }
      const processedItems = items.map((item) => ({
        title: item.title,
        price: item.price,
        quantity: item.quantity || 1,
        onBehalfOf: onBehalfOf[item.id] || null,
        donationType: item.donationType || "Sadaqah",
        ...(item.source && { source: item.source }),
        ...(item.isRecurring && { isRecurring: true }),
        ...(item.recurringDetails && {
          recurringDetails: item.recurringDetails,
        }),
      }));
      const orderData = {
        items: processedItems,
        paymentType,
        adminCostContribution: (total * adminCostPercentage) / 100,
        donorDetails: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          streetAddress: formData.streetAddress,
          townCity: formData.townCity,
          state: formData.state,
          postcode: formData.postcode,
          agreeToMessages: formData.agreeToMessages,
          rememberDetails: formData.rememberDetails,
        },
        donationType: selectedDonationType,
        paymentMethod: selectedPaymentMethod,
        totalAmount: total + (total * adminCostPercentage) / 100,
        // Payment-specific details
        ...(paymentType === "recurring" && {
          recurringDetails: {
            frequency: recurringFrequency,
            amount: recurringAmount,
            endDate: recurringEndDate,
            totalPayments: totalRecurringPayments,
            billingDay: billingDay, // Add this line
            ...(hasRamadanRecurringItems && { source: "ramadan" }),
          },
        }),
        ...(paymentType === "installments" && {
          installmentDetails: {
            numberOfInstallments: installmentMonths,
            installmentAmount:
              (total + (total * adminCostPercentage) / 100) / installmentMonths,
          },
        }),
        ...((selectedPaymentMethod === "visa" ||
          selectedPaymentMethod === "mastercard") && {
          stripePaymentMethodId: stripePaymentMethod.id,
        }),
      };

      console.log("Submitting order:", orderData);

      const response = await OrderService.createOrder(orderData);

      if (response.status === "Success") {
        toast.success("Order created successfully!");
        clearCart();
        navigate("/order-confirmation", {
          state: {
            orderDetails: response.order,
            paymentMethod: selectedPaymentMethod,
          },
        });
      } else {
        toast.error(response.message || "Failed to create order");
      }
    } catch (error) {
      console.error("Order submission error:", error);
      toast.error(error.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const PaymentTypeCard = ({ type, title, icon, selected, onClick }) => (
    <div
      onClick={onClick}
      className={`flex flex-col p-6 border rounded-2xl cursor-pointer transition-all ${
        selected
          ? "border-[#C9A84C] bg-[#C9A84C]/5"
          : "border-gray-200 hover:border-[#C9A84C]"
      }`}
    >
      <div className="flex items-center gap-2">
        <img src={give} alt="give" className="w-8 h-8 rounded" loading="lazy" />
        <p className="text-sm">Donate</p>
      </div>
      <span className="mt-2 text-sm font-medium">{title}</span>
    </div>
  );

  const PaymentMethodCard = ({ children, onClick, selected }) => {
    return (
      <div
        onClick={onClick}
        className={`
          p-6 border rounded-2xl cursor-pointer transition-all
          ${selected ? "border-[#C9A84C] bg-[#C9A84C]/5" : "border-gray-200"}
          hover:border-[#C9A84C]
        `}
      >
        {children}
      </div>
    );
  };

  const renderStepIndicator = () => (
    <div className=" justify-between hidden md:flex md:flex-row mb-8">
      {[
        { number: 1, label: "Donations" },
        { number: 2, label: "Donor" },
        { number: 3, label: "Payment Method" },
      ].map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className={`flex items-center ${index > 0 ? "ml-4" : ""}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step.number < activeStep
                  ? "bg-[#C9A84C] text-white"
                  : step.number === activeStep
                  ? "bg-[#C9A84C] text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {step.number < activeStep ? (
                <Check className="w-5 h-5" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={`ml-2 text-sm font-medium ${
                step.number <= activeStep ? "text-[#C9A84C]" : "text-gray-600"
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < 2 && (
            <div
              className={`ml-4 w-24 h-px ${
                step.number < activeStep ? "bg-[#C9A84C]" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderDonationStep = () => (
    <>
      <h2 className="text-xl font-bold mb-4 font-heading">Your Donations</h2>

      {isCartEmpty ? (
        <div className="py-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
          <p className="text-gray-600 mb-4">
            Add some donations to continue checkout.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 text-[#2C2418] rounded-xl hover:scale-[1.01] transition-transform"
            style={{ background: "linear-gradient(180deg, #D4B85A 0%, #C9A84C 100%)" }}
          >
            Browse Donations
          </button>
        </div>
      ) : (
        <>
          {/* Donation Items */}
          {items.map((item) => (
            <div
              key={item.id}
              className="flex md:items-center flex-col gap-6 md:gap-1 md:flex-row py-4 border-b last:border-0"
            >
              <img
                src={item.image || give}
                alt={give}
                className="w-16 h-16 object-cover rounded"
                loading="lazy"
              />
              <div className="md:ml-4 flex-1">
                <h3 className="font-semibold">{item.title}</h3>
                <div className="text-xs text-gray-500 mt-1">PRODUCT CODE</div>

                {/* Donation Type Selection */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Donation Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                    value={
                      item.donationType ||
                      (donationTypes.length > 0
                        ? donationTypes[0].donationType
                        : "")
                    }
                    onChange={(e) => onChangeDonationType(item, e.target.value)}
                    required
                    disabled={loadingDonationTypes}
                  >
                    {loadingDonationTypes ? (
                      <option value="">Loading donation types...</option>
                    ) : donationTypes.length === 0 ? (
                      <option value="">No donation types available</option>
                    ) : (
                      donationTypes.map((type) => (
                        <option
                          key={type._id || type.donationType}
                          value={type.donationType}
                        >
                          {type.donationType}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="mt-2 flex items-center">
                  <label className="text-sm text-gray-600">
                    Who is this donation on behalf of?
                    <span className="relative inline-block ml-2 group">
                      <Info size={16} className="text-gray-400 cursor-help" />
                      <span className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 bg-black text-white text-xs rounded py-2 px-3 z-10 before:content-[''] before:absolute before:top-full before:left-1/2 before:-ml-1 before:border-4 before:border-t-black before:border-l-transparent before:border-r-transparent before:border-b-transparent">
                        Please write the name of the person, community,
                        organisation or masjid you are donating on behalf of.
                      </span>
                    </span>
                  </label>
                </div>
                <input
                  type="text"
                  className="mt-1 w-full p-2 border rounded-md"
                  placeholder="Enter name or organization"
                  value={onBehalfOf[item.id] || ""}
                  onChange={(e) =>
                    handleOnBehalfOfChange(item.id, e.target.value)
                  }
                />
              </div>
              <div className="ml-4 text-right">
                <div className="flex items-center justify-end">
                  <button
                    className="px-3 py-1 border rounded-l hover:bg-gray-50"
                    onClick={() => handleQuantityChange(item.id, -1)}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    readOnly
                    className="w-12 text-center border-t border-b"
                  />
                  <button
                    className="px-3 py-1 border rounded-r hover:bg-gray-50"
                    onClick={() => handleQuantityChange(item.id, 1)}
                  >
                    +
                  </button>
                </div>
                <div className="mt-2">
                  <button
                    className="text-red-600 hover:text-red-800"
                    onClick={() => removeItem(item.id)}
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-2 text-lg font-semibold">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            </div>
          ))}

          {/* Donation Type Dropdown
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Donation Type
            </label>
            <select
              className="p-2 border rounded-md w-full"
              value={selectedDonationType}
              onChange={(e) => setSelectedDonationType(e.target.value)}
            >
              <option value="" disabled>
                Select Donation Type
              </option>
              <option value="Sadaqa">Sadaqa</option>
              <option value="Zakat_Al_Mal">Zakat Al Maal</option>
              <option value="Zakat_Al_Fitr">Zakat Al Fitr</option>
              <option value="Other">Other</option>
            </select>
          </div> */}

          {/* Payment Type Selection */}
          <div className="mt-8">
            <h3 className="font-bold mb-4">
              How often would you like to pay this?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PaymentTypeCard
                type="single"
                title="Single/One-Time"
                selected={paymentType === "single"}
                onClick={() =>
                  !hasRamadanRecurringItems && setPaymentType("single")
                }
              />
              <PaymentTypeCard
                type="recurring"
                title="Recurring"
                icon={<span className="text-2xl">🔄</span>}
                selected={paymentType === "recurring"}
                onClick={() =>
                  !hasRamadanRecurringItems && setPaymentType("recurring")
                }
              />
              <PaymentTypeCard
                type="installments"
                title="Installments"
                icon={<span className="text-2xl">📅</span>}
                selected={paymentType === "installments"}
                onClick={() =>
                  !hasRamadanRecurringItems && setPaymentType("installments")
                }
              />

              {hasRamadanRecurringItems && (
                <p className="text-sm text-[#C9A84C] mt-2 flex items-center">
                  <Info className="w-4 h-4 mr-2" />
                  Payment type set to recurring for Ramadan last 10 nights
                  donations
                </p>
              )}
            </div>
          </div>

          {paymentType === "recurring" && (
            <div className="mt-6 p-6 bg-background border border-[#C9A84C]/10 rounded-2xl shadow-sm space-y-6">
              {/* Section Title */}
              <h4 className="text-lg font-semibold text-gray-800">
                Recurring Payment Details
                {hasRamadanRecurringItems && (
                  <span className="ml-2 text-sm font-normal text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-1 rounded">
                    Last 10 Nights of Ramadan
                  </span>
                )}
              </h4>

              {/* Frequency & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <select
                    value={recurringFrequency}
                    onChange={(e) => setRecurringFrequency(e.target.value)}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-white"
                    disabled={hasRamadanRecurringItems}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  {hasRamadanRecurringItems && (
                    <p className="text-xs text-[#C9A84C] mt-1">
                      Pre-configured for Ramadan last 10 nights
                    </p>
                  )}
                </div>

                {recurringFrequency === "monthly" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Billing Day
                    </label>
                    <select
                      value={billingDay}
                      onChange={(e) => setBillingDay(parseInt(e.target.value))}
                      className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-white"
                      disabled={hasRamadanRecurringItems}
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(
                        (day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        )
                      )}
                    </select>
                    <p className="text-xs text-gray-600 mt-1">
                      Your donation will be processed on this day each month
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount Charged {recurringFrequency}
                  </label>
                  <input
                    type="number"
                    value={recurringAmount}
                    onChange={(e) =>
                      setRecurringAmount(parseFloat(e.target.value))
                    }
                    disabled
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-white"
                  />
                </div>
              </div>

              {/* End Date & Payment Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date (Stop recurring payments)
                  </label>
                  <input
                    type="date"
                    value={recurringEndDate}
                    onChange={(e) => setRecurringEndDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]} // disallows past dates
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-white"
                    disabled={hasRamadanRecurringItems}
                  />
                  {hasRamadanRecurringItems && (
                    <p className="text-xs text-[#C9A84C] mt-1">
                      Pre-configured for 10 days of donations
                    </p>
                  )}
                </div>
                <div className="flex items-center">
                  <div className="flex-1 text-sm text-gray-700">
                    <p className="mb-1 font-medium">Total Payments</p>
                    <div className="flex items-center justify-center p-3 border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#C9A84C] rounded-md font-semibold">
                      {totalRecurringPayments > 0 ? totalRecurringPayments : 0}{" "}
                      Payments
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Text */}
              <div className="text-sm text-gray-600 flex items-center">
                <Info className="w-4 h-4 mr-2 text-[#C9A84C]" />
                <span>
                  Your card will be charged ${recurringAmount}{" "}
                  {recurringFrequency} for {totalRecurringPayments} payments
                </span>
              </div>

              {hasRamadanRecurringItems && (
                <div className="bg-[#C9A84C]/10 p-3 rounded-md mt-2">
                  <p className="text-sm text-[#C9A84C] flex items-center">
                    <Info className="w-4 h-4 mr-2" />
                    This is a special recurring donation for the last 10 nights
                    of Ramadan. Your donation will ensure you don't miss out on
                    Laylatul Qadr!
                  </p>
                </div>
              )}
            </div>
          )}

          {paymentType === "installments" && (
            <div className="mt-6 p-6 border border-[#C9A84C]/10 rounded-2xl bg-background">
              <h4 className="font-semibold text-gray-800 mb-4">
                Installment Payment Details
              </h4>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Monthly Installments
                </label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={installmentMonths}
                    onChange={(e) =>
                      setInstallmentMonths(parseInt(e.target.value))
                    }
                    className="w-full h-2 bg-[#C9A84C]/20 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="ml-4 w-8 text-center font-medium">
                    {installmentMonths}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Split your payment into {installmentMonths} monthly
                  installment
                  {installmentMonths > 1 ? "s" : ""}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Amount
                  </label>
                  <div className="p-2 bg-white border rounded-md font-medium">
                    ${(total + (total * adminCostPercentage) / 100).toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Payment
                  </label>
                  <div className="p-2 bg-white border rounded-md font-medium">
                    $
                    {(
                      (total + (total * adminCostPercentage) / 100) /
                      installmentMonths
                    ).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <p className="flex items-center">
                  <Info className="w-4 h-4 mr-2 text-[#C9A84C]" />
                  First payment today, then every 30 days for{" "}
                  {installmentMonths - 1} more month
                  {installmentMonths > 2 ? "s" : ""}
                </p>
              </div>
            </div>
          )}

          {/* Admin Cost Section */}
          <div className="mt-8 border-t pt-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold">Contribute to admin costs?</h3>
                <p className="text-sm text-gray-600">
                  This helps us maintain our 100% donation policy
                </p>
              </div>
              <div className="flex items-center">
                <button
                  className="px-3 py-1 border rounded-l hover:bg-gray-50"
                  onClick={() =>
                    setAdminCostPercentage(Math.max(0, adminCostPercentage - 1))
                  }
                >
                  -
                </button>
                <span className="px-4 py-1 border-t border-b min-w-[40px] text-center">
                  {adminCostPercentage}%
                </span>
                <button
                  className="px-3 py-1 border rounded-r hover:bg-gray-50"
                  onClick={() =>
                    setAdminCostPercentage(
                      Math.min(20, adminCostPercentage + 1)
                    )
                  }
                >
                  +
                </button>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600 flex items-center">
              <Info className="w-4 h-4 mr-2 text-gray-400" />
              <span>
                Admin contribution: $
                {((total * adminCostPercentage) / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="mt-8 border-t pt-6">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold">Grand Total</span>
              <span className="text-xl font-bold">
                ${(total + (total * adminCostPercentage) / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </>
      )}
    </>
  );
  const renderDonorStep = () => (
    <>
      <h1 className="text-2xl font-bold mb-8 font-heading">Enter your details</h1>

      {user && (
        <div className="mb-6 bg-background p-4 border border-[#C9A84C]/30 rounded-2xl">
          <p className="text-[#C9A84C] flex items-center">
            <Check className="w-5 h-5 mr-2" />
            <span>
              You're logged in as {user.email}.{" "}
              {Object.values(savedDataIndicator).some((value) => value)
                ? "Some of your profile details have been pre-filled."
                : "Complete the form below to save these details for future checkouts."}
            </span>
          </p>
        </div>
      )}

      <form className="space-y-6">
        {/* First Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center">
              <span>
                Name <span className="text-red-500">*</span>
              </span>
              {savedDataIndicator.name && (
                <span className="ml-2 text-xs bg-[#C9A84C]/10 text-[#C9A84C] px-2 py-1 rounded">
                  Saved
                </span>
              )}
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#C9A84C] ${
                errors.name ? "border-red-500" : ""
              } ${
                savedDataIndicator.name ? "bg-background border-[#C9A84C]/30" : ""
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 flex items-center">
              <span>
                Phone <span className="text-red-500">*</span>
              </span>
              {savedDataIndicator.phone && (
                <span className="ml-2 text-xs bg-[#C9A84C]/10 text-[#C9A84C] px-2 py-1 rounded">
                  Saved
                </span>
              )}
            </label>
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleInputChange}
              className={`w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#C9A84C] ${
                errors.phone ? "border-red-500" : ""
              } ${
                savedDataIndicator.phone ? "bg-background border-[#C9A84C]/30" : ""
              }`}
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 flex items-center">
              <span>
                Email <span className="text-red-500">*</span>
              </span>
              {savedDataIndicator.email && (
                <span className="ml-2 text-xs bg-[#C9A84C]/10 text-[#C9A84C] px-2 py-1 rounded">
                  Saved
                </span>
              )}
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              readOnly={user && user.email}
              className={`w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#C9A84C] ${
                errors.email ? "border-red-500" : ""
              } ${user && user.email ? "bg-gray-100" : ""} ${
                savedDataIndicator.email ? "bg-background border-[#C9A84C]/30" : ""
              }`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>
        </div>

        {/* Second Row - Address Fields */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-4">
            <label className="block text-sm font-medium mb-1 flex items-center">
              <span>Address</span>
              {Object.values(savedDataIndicator.address).some(Boolean) && (
                <span className="ml-2 text-xs bg-[#C9A84C]/10 text-[#C9A84C] px-2 py-1 rounded">
                  Saved
                </span>
              )}
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Street Address
            </label>
            <input
              type="text"
              name="streetAddress"
              value={formData.streetAddress}
              onChange={handleInputChange}
              className={`w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#C9A84C] ${
                savedDataIndicator.address.street
                  ? "bg-background border-[#C9A84C]/30"
                  : ""
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Suburb</label>
            <input
              type="text"
              name="townCity"
              value={formData.townCity}
              onChange={handleInputChange}
              className={`w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#C9A84C] ${
                savedDataIndicator.address.city
                  ? "bg-background border-[#C9A84C]/30"
                  : ""
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">State:</label>
            <div className="relative">
              <select
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className={`w-full p-2 border rounded appearance-none focus:outline-none focus:ring-2 focus:ring-[#C9A84C] ${
                  savedDataIndicator.address.state
                    ? "bg-background border-[#C9A84C]/30"
                    : ""
                }`}
              >
                <option value="">Select State</option>
                <option value="NSW">New South Wales (NSW)</option>
                <option value="VIC">Victoria (VIC)</option>
                <option value="QLD">Queensland (QLD)</option>
                <option value="WA">Western Australia (WA)</option>
                <option value="SA">South Australia (SA)</option>
                <option value="TAS">Tasmania (TAS)</option>
                <option value="ACT">Australian Capital Territory (ACT)</option>
                <option value="NT">Northern Territory (NT)</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Postcode:</label>
            <input
              type="text"
              name="postcode"
              value={formData.postcode}
              onChange={handleInputChange}
              className={`w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#C9A84C] ${
                savedDataIndicator.address.postalCode
                  ? "bg-background border-[#C9A84C]/30"
                  : ""
              }`}
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="rememberDetails"
              checked={formData.rememberDetails}
              onChange={(e) => {
                handleInputChange(e);

                // If checkbox is checked, trigger profile update
                if (e.target.checked && user) {
                  handleUpdateProfile();
                }
              }}
              className="w-4 h-4 text-[#C9A84C] border-gray-300 rounded focus:ring-[#C9A84C]"
              disabled={isUpdatingProfile}
            />
            <span className="text-sm text-gray-700">
              {user
                ? "Update my saved details with this information"
                : "Save my details for future donations"}
            </span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="agreeToMessages"
              checked={formData.agreeToMessages}
              onChange={handleInputChange}
              className="w-4 h-4 text-[#C9A84C] border-gray-300 rounded focus:ring-[#C9A84C]"
            />
            <span className="text-sm text-gray-700">
              I agree to receive Email, WhatsApp/SMS text messages and SMS data
              rates may apply. Reply STOP to cancel
            </span>
          </label>

          {/* Loading indicator for profile update */}
          {isUpdatingProfile && (
            <div className="text-sm text-gray-500 flex items-center">
              <svg
                className="animate-spin h-5 w-5 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Updating profile...
            </div>
          )}
        </div>
      </form>
    </>
  );

  const renderPaymentStep = () => (
    <>
      <h1 className="text-2xl font-bold mb-8 font-heading">Select your Payment Method</h1>

      {/* Payment Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <PaymentMethodCard
          onClick={() => setSelectedPaymentMethod("visa")}
          selected={selectedPaymentMethod === "visa"}
        >
          <div className="space-y-2 flex flex-col items-center justify-center">
            <img src={visa} alt="Visa" className="mb-2 h-12" loading="lazy" />
          </div>
        </PaymentMethodCard>

        <PaymentMethodCard
          onClick={() => setSelectedPaymentMethod("mastercard")}
          selected={selectedPaymentMethod === "mastercard"}
        >
          <div className="space-y-2 flex flex-col items-center justify-center">
            <img
              src={mastercard}
              alt="Mastercard"
              className="mb-2 h-12"
              loading="lazy"
            />
          </div>
        </PaymentMethodCard>

        {/* No need to modify other payment methods */}
        <PaymentMethodCard
          onClick={() => setSelectedPaymentMethod("bank")}
          selected={selectedPaymentMethod === "bank"}
        >
          <div className="h-full flex items-center justify-center font-bold text-[#C9A84C] text-center">
            Bank
            <br />
            Transfer
          </div>
        </PaymentMethodCard>
      </div>

      {/* Order Summary */}
      <div className="mt-6 border border-gray-100 p-4 rounded-2xl shadow-sm mb-6">
        <h3 className="font-bold mb-4">Order Summary</h3>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <div>
                <span>{item.title}</span>
                <span className="text-gray-500 ml-2">x{item.quantity}</span>
              </div>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}

          {adminCostPercentage > 0 && (
            <div className="flex justify-between text-sm">
              <span>Admin Cost ({adminCostPercentage}%)</span>
              <span>${((total * adminCostPercentage) / 100).toFixed(2)}</span>
            </div>
          )}

          <div className="pt-2 border-t flex justify-between font-bold">
            <span>Total</span>
            <span>
              ${(total + (total * adminCostPercentage) / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {(selectedPaymentMethod === "visa" ||
        selectedPaymentMethod === "mastercard") && (
        <Elements stripe={stripePromise}>
          <StripeCardForm
            onPaymentMethodCreated={handlePaymentMethodCreated}
            isSubmitting={submittingCardForm}
          />
        </Elements>
      )}

      {/* Bank Transfer Details - Keep this unchanged */}
      {selectedPaymentMethod === "bank" && (
        <div className="border-t pt-6 space-y-2">
          <p className="font-bold">Bank Transfer:</p>
          <p>Bank Name: Westpac</p>
          <p>BSB: 032075</p>
          <p>Account Number: 841783</p>
          {/* <p>Reference: Use the Donation ID below</p> */}
          <p className="text-sm">
            For tax receipt please email proof of payment to
            info@hopegive.org
          </p>
          <div className="bg-[#4A3F30] text-[#F5EDE0] p-4 rounded-xl mt-6">
            Your donation will be processed once we receive clear funds in our
            bank account. A tax receipt will be sent to you via email once
            payment has been confirmed by our team{" "}
          </div>
        </div>
      )}
    </>
  );
  const renderActiveStep = () => {
    switch (activeStep) {
      case 1:
        return renderDonationStep();
      case 2:
        return renderDonorStep();
      case 3:
        return renderPaymentStep();
      default:
        return null;
    }
  };

  //scroll to top when page loads
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const renderNavigation = () => (
    <div className="mt-8 flex justify-between max-sm:gap-2">
      <button
        onClick={handleBackButton}
        className={`flex items-center px-6 py-2 rounded-xl ${
          activeStep === 1 && !isCartEmpty
            ? "text-gray-300 border border-gray-300 cursor-not-allowed bg-[#FAF7F2]"
            : "bg-[#FAF7F2] border border-gray-200 hover:bg-gray-50 text-gray-700"
        }`}
        disabled={loading || (activeStep === 1 && !isCartEmpty)}
      >
        <ChevronLeft size={20} className="mr-2" />
        Back
      </button>

      {activeStep < 3 && (
        <button
          onClick={() => {
            if (activeStep === 2 && !validateDonorDetails()) {
              return;
            }
            setActiveStep((prev) => Math.min(3, prev + 1));
          }}
          className={`flex items-center px-6 py-2 ${
            isCartEmpty
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "text-[#2C2418] hover:scale-[1.01] transition-transform"
          } rounded-xl disabled:opacity-50`}
          style={!isCartEmpty ? { background: "linear-gradient(180deg, #D4B85A 0%, #C9A84C 100%)" } : {}}
          disabled={loading || isCartEmpty}
        >
          Next
          <ChevronRight size={20} className="ml-2" />
        </button>
      )}

      {activeStep === 3 && (
        <button
          onClick={handleSubmitOrder}
          className="flex items-center px-6 py-2 text-[#2C2418] rounded-xl hover:scale-[1.01] transition-transform disabled:opacity-50"
          style={{ background: "linear-gradient(180deg, #D4B85A 0%, #C9A84C 100%)" }}
          disabled={
            loading ||
            isCartEmpty ||
            ((selectedPaymentMethod === "visa" ||
              selectedPaymentMethod === "mastercard") &&
              !stripePaymentMethod)
          }
        >
          {loading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#2C2418]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : (
            <>
              {selectedPaymentMethod === "bank"
                ? "Confirm Donation"
                : "Complete Payment"}
            </>
          )}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Progress Steps */}
        {renderStepIndicator()}

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 p-6">
          {renderActiveStep()}

          {/* Navigation */}
          {renderNavigation()}
        </div>

        {/* Payment Methods Footer */}
        <div className="text-center">
          <div className="flex justify-center space-x-6 mb-4">
            <img src={visa} alt="Visa" className="h-8" loading="lazy" />
            <img
              src={mastercard}
              alt="Mastercard"
              className="h-8"
              loading="lazy"
            />
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>100% Secure Checkout</p>
            <p>100% Donation Policy</p>
            <p>We Protect Your Privacy</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedCheckout;
