import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useCart } from "../cart";
import { useAuth } from "../../../context/AuthContext";
import { useTenant } from "../../../context/TenantContext";
import useTenantStripe from "../../../hooks/useTenantStripe";
import axiosInstance from "../../../services/axios";
import { OrderService } from "../../../services/order.service";
import { buildOrderData } from "./utils";
import useDonationTypes from "./hooks/useDonationTypes";
import usePaymentPlan from "./hooks/usePaymentPlan";
import useCheckoutForm from "./hooks/useCheckoutForm";
import usePaymentSelection from "./hooks/usePaymentSelection";

const CheckoutContext = createContext(null);

export const useCheckout = () => {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used within a CheckoutProvider");
  return ctx;
};

export function CheckoutProvider({ children }) {
  const navigate = useNavigate();
  const cart = useCart();
  const { items, total, clearCart, updateQuantity, removeItem, UpdateItemType } = cart;
  const { user } = useAuth();
  const { organisation } = useTenant();
  const stripePromise = useTenantStripe();

  const [activeStep, setActiveStep] = useState(1);
  const [onBehalfOf, setOnBehalfOf] = useState({});
  const [selectedDonationType, setSelectedDonationType] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittingCardForm, setSubmittingCardForm] = useState(false);

  // A pre-configured Ramadan recurring item also pins the donation type, so the
  // plan hook needs to write it back here.
  const plan = usePaymentPlan({ items, total, setSelectedDonationType });
  const form = useCheckoutForm({ user });
  const payment = usePaymentSelection({ user });
  const donationTypes = useDonationTypes();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const isCartEmpty = items.length === 0;

  const onChangeDonationType = (item, donationType) => {
    UpdateItemType(item.id, donationType);
    setSelectedDonationType(donationType);
    toast.success(`Donation type set to ${donationType}`);
  };
  const handleOnBehalfOfChange = (itemId, value) => setOnBehalfOf((prev) => ({ ...prev, [itemId]: value }));
  const handleQuantityChange = (itemId, delta) => updateQuantity(itemId, delta);

  const handleBackButton = () => {
    if (activeStep === 1) navigate("/");
    else setActiveStep((prev) => Math.max(1, prev - 1));
  };
  const goNext = () => {
    if (activeStep === 2 && !form.validateDonorDetails()) return;
    setActiveStep((prev) => Math.min(3, prev + 1));
  };

  const isCardMethod =
    payment.selectedPaymentMethod === "visa" || payment.selectedPaymentMethod === "mastercard";

  const handleSubmitOrder = async () => {
    const { formData } = form;
    if (!form.validateDonorDetails()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (formData.name === "") {
      toast.error("Please enter your name");
      return;
    }
    if (!payment.selectedPaymentMethod) {
      toast.error("Please select a payment method");
      return;
    }
    if (isCardMethod && !payment.stripePaymentMethod) {
      setSubmittingCardForm(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!payment.stripePaymentMethod) {
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
          await axiosInstance.put("/users/update", {
            firstName, lastName, phone: formData.phone,
            address: { street: formData.streetAddress, city: formData.townCity, state: formData.state, postalCode: formData.postcode },
          });
          // Details are saved silently — no toast (the donor opted in via the checkbox).
        } catch (userUpdateError) {
          console.error("Failed to save user details:", userUpdateError);
          toast.error("Could not save your details, but your donation will still be processed");
        }
      }

      const orderData = buildOrderData({
        items,
        total,
        paymentType: plan.paymentType,
        adminCostPercentage: plan.adminCostPercentage,
        formData,
        onBehalfOf,
        selectedDonationType,
        selectedPaymentMethod: payment.selectedPaymentMethod,
        recurringFrequency: plan.recurringFrequency,
        recurringAmount: plan.recurringAmount,
        recurringEndDate: plan.recurringEndDate,
        totalRecurringPayments: plan.totalRecurringPayments,
        billingDay: plan.billingDay,
        hasRamadanRecurringItems: plan.hasRamadanRecurringItems,
        installmentMonths: plan.installmentMonths,
        stripePaymentMethod: payment.stripePaymentMethod,
        savedCustomerId: payment.savedCustomerId,
        selectedSavedCardId: payment.selectedSavedCardId,
      });

      const response = await OrderService.createOrder(orderData);
      if (response.status === "Success") {
        toast.success("Order created successfully!");
        clearCart();
        navigate("/order-confirmation", { state: { orderDetails: response.order, paymentMethod: payment.selectedPaymentMethod } });
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

  const value = {
    // cart
    items, total, removeItem,
    // org / stripe / auth
    organisation, stripePromise, user,
    // navigation
    activeStep, setActiveStep, handleBackButton, goNext,
    isCartEmpty,
    navigate,
    // donation step
    onBehalfOf, handleOnBehalfOfChange, handleQuantityChange,
    selectedDonationType, onChangeDonationType,
    donationTypeOptions: donationTypes.options,
    loadingDonationTypes: donationTypes.loading,
    // plan + form + payment slices
    ...plan,
    ...form,
    ...payment,
    // submission
    loading, submittingCardForm, handleSubmitOrder,
  };

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}
