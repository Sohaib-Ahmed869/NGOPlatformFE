import { useState, useEffect } from "react";
import { useCart } from "./cart";
import { useAuth } from "../../context/AuthContext";
import useTenantStripe from "../../hooks/useTenantStripe";
import axiosInstance, { getStoragePrefix } from "../../services/axios";
import donationTypeService from "../../services/donationtypeservice";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  Lock,
  ShieldCheck,
  CreditCard,
  Landmark,
  Repeat,
  CalendarDays,
  Gift,
  Coins,
  ShoppingBag,
  Trash2,
  ArrowRight,
  Loader2,
  Plus,
  Minus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "../../context/TenantContext";
import { OrderService } from "../../services/order.service";
import { toast } from "react-hot-toast";
import CustomSelect from "../../components/CustomSelect";
import mastercard from "../../assets/mastercard.png";
import visa from "../../assets/visa.png";

/* ── shared styling tokens (squared, admin-aligned) ── */
const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500";
const inputCls =
  "w-full border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent";
// Shared trigger chrome so CustomSelect matches the square inputs above.
const selectTrigger = "border border-gray-200 bg-white px-3.5 py-2.5 text-sm";

const STEPS = [
  { n: 1, label: "Donation" },
  { n: 2, label: "Your details" },
  { n: 3, label: "Payment" },
];

const PAYMENT_TYPES = [
  { id: "single", label: "One-time", desc: "A single gift today", icon: Coins },
  { id: "recurring", label: "Recurring", desc: "Give on a schedule", icon: Repeat },
  { id: "installments", label: "Installments", desc: "Split the total", icon: CalendarDays },
];

const PAYMENT_METHODS = [
  { id: "visa", label: "Credit / Debit Card", desc: "Visa, Mastercard & more", icon: CreditCard },
  { id: "bank", label: "Bank Transfer", desc: "Pay by direct transfer", icon: Landmark },
];

const AU_STATES = [
  ["NSW", "New South Wales (NSW)"], ["VIC", "Victoria (VIC)"], ["QLD", "Queensland (QLD)"],
  ["WA", "Western Australia (WA)"], ["SA", "South Australia (SA)"], ["TAS", "Tasmania (TAS)"],
  ["ACT", "Australian Capital Territory (ACT)"], ["NT", "Northern Territory (NT)"],
];
const STATE_OPTIONS = AU_STATES.map(([value, label]) => ({ value, label }));
const FREQ_OPTIONS = [
  { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" }, { value: "yearly", label: "Yearly" },
];
const BILLING_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));

const money = (n) => Number(n || 0).toFixed(2);

/* ── small presentational pieces ── */

function SectionHead({ icon: Icon, title, desc }) {
  return (
    <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <p className="mt-0.5 text-sm text-text-muted">{desc}</p>
      </div>
    </div>
  );
}

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
    const { error, paymentMethod } = await stripe.createPaymentMethod({ type: "card", card: cardElement });
    if (error) {
      setCardError(error.message);
      setIsVerifying(false);
      return false;
    }
    setCardError("");
    setIsVerifying(false);
    setIsVerified(true);
    onPaymentMethodCreated(paymentMethod);
    toast.success("Card details verified");
    return true;
  };

  return (
    <div className="mt-5">
      <label className={labelCls}>Card details</label>
      <div className="border border-gray-200 px-3.5 py-3.5">
        <CardElement
          options={{
            style: {
              base: { fontSize: "15px", color: "#2C2418", "::placeholder": { color: "#9ca3af" } },
              invalid: { color: "#dc2626" },
            },
          }}
          onChange={(e) => {
            setCardComplete(e.complete);
            setCardError(e.error ? e.error.message : "");
          }}
        />
      </div>
      {cardError && <p className="mt-2 text-sm text-red-500">{cardError}</p>}
      {cardComplete && !isSubmitting && (
        <button
          type="button"
          onClick={processCard}
          disabled={isVerifying || isVerified}
          className="mt-3 inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-60"
        >
          {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : isVerified ? <Check className="h-4 w-4" /> : null}
          {isVerifying ? "Verifying…" : isVerified ? "Card verified" : "Verify card"}
        </button>
      )}
    </div>
  );
};

const UnifiedCheckout = () => {
  const navigate = useNavigate();
  const { items, total, clearCart, removeItem, updateQuantity, UpdateItemType } = useCart();
  const { organisation } = useTenant();
  const stripePromise = useTenantStripe();
  const [activeStep, setActiveStep] = useState(1);
  const [paymentType, setPaymentType] = useState("single");
  const [adminCostPercentage, setAdminCostPercentage] = useState(2);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { user } = useAuth();
  const [onBehalfOf, setOnBehalfOf] = useState({});
  const [recurringFrequency, setRecurringFrequency] = useState("monthly");
  const [billingDay, setBillingDay] = useState(new Date().getDate());
  const [recurringAmount, setRecurringAmount] = useState(total);
  const [stripePaymentMethod, setStripePaymentMethod] = useState(null);
  const [submittingCardForm, setSubmittingCardForm] = useState(false);
  const [selectedDonationType, setSelectedDonationType] = useState("");
  const [installmentMonths, setInstallmentMonths] = useState(3);
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [totalRecurringPayments, setTotalRecurringPayments] = useState(0);
  const [hasRamadanRecurringItems, setHasRamadanRecurringItems] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [donationTypes, setDonationTypes] = useState([]);
  const [loadingDonationTypes, setLoadingDonationTypes] = useState(true);
  const [savedDataIndicator, setSavedDataIndicator] = useState({
    name: false, phone: false, email: false,
    address: { street: false, city: false, state: false, postalCode: false },
  });

  const [formData, setFormData] = useState({
    name: "", phone: "", email: "", streetAddress: "", townCity: "", state: "", postcode: "",
    rememberDetails: false, agreeToMessages: false,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    if (user) fetchUserProfile();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem(getStoragePrefix() + "token");
      const response = await axiosInstance.get("/users/me", { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.status === "Success") prefillFormWithUserData(response.data.user);
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
        } else {
          setDonationTypes([
            { donationType: "Sadaqah" }, { donationType: "Zakat ul Maal" }, { donationType: "Zakat ul Fitr" },
            { donationType: "Education Fund" }, { donationType: "Water Fund" }, { donationType: "Food Fund" }, { donationType: "Emergency Fund" },
          ]);
        }
      } catch (err) {
        console.error("Error fetching donation types:", err);
        setDonationTypes([
          { donationType: "Sadaqah" }, { donationType: "Zakat ul Maal" }, { donationType: "Zakat ul Fitr" },
          { donationType: "Education Fund" }, { donationType: "Water Fund" }, { donationType: "Food Fund" }, { donationType: "Emergency Fund" },
        ]);
      } finally {
        setLoadingDonationTypes(false);
      }
    };
    fetchDonationTypes();
  }, []);

  const onChangeDonationType = (item, donationType) => {
    UpdateItemType(item.id, donationType);
    setSelectedDonationType(donationType);
    toast.success(`Donation type set to ${donationType}`);
  };

  const isCartEmpty = items.length === 0;

  const handleUpdateProfile = async () => {
    if (user && formData.rememberDetails) {
      try {
        setIsUpdatingProfile(true);
        const validateInput = () => {
          const errs = {};
          if (!formData.name.trim()) errs.name = "Name is required";
          if (!formData.phone.trim()) errs.phone = "Phone number is required";
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!formData.email.trim()) errs.email = "Email is required";
          else if (!emailRegex.test(formData.email)) errs.email = "Invalid email format";
          if (formData.postcode && formData.postcode.trim() === "") errs.postcode = "Postal code cannot be an empty string";
          return errs;
        };
        const validationErrors = validateInput();
        if (Object.keys(validationErrors).length > 0) {
          Object.values(validationErrors).forEach((error) => toast.error(error));
          return;
        }
        const nameParts = formData.name.trim().split(" ");
        const updatePayload = {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" ") || "",
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          address: { street: formData.streetAddress.trim(), city: formData.townCity.trim(), state: formData.state.trim(), postalCode: formData.postcode.trim() },
          agreeToMessages: formData.agreeToMessages,
        };
        const response = await axiosInstance.put("/users/update", updatePayload, {
          headers: { Authorization: `Bearer ${localStorage.getItem(getStoragePrefix() + "token")}`, "Content-Type": "application/json" },
          timeout: 10000,
        });
        if (response.data.status === "Success") {
          toast.success("Profile updated successfully");
          if (fetchUserProfile) fetchUserProfile();
        } else {
          toast.error(response.data.message || "Failed to update profile");
        }
      } catch (error) {
        console.error("Profile update error:", error);
        if (error.response) {
          toast.error(error.response.data.message || error.response.data.error || "Server error occurred while updating profile");
        } else if (error.request) {
          toast.error("No response received from server");
        } else {
          toast.error("Error setting up profile update request");
        }
      } finally {
        setIsUpdatingProfile(false);
      }
    }
  };

  const prefillFormWithUserData = (profileData) => {
    if (!profileData) return;
    let fullName = "";
    if (profileData.name) fullName = profileData.name;
    else if (profileData.firstName || profileData.lastName) fullName = `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim();
    const address = profileData.address || {};
    const newFormData = {
      name: fullName, phone: profileData.phone || "", email: profileData.email || "",
      streetAddress: address.street || "", townCity: address.city || "", state: address.state || "",
      postcode: address.postalCode || "", rememberDetails: true, agreeToMessages: profileData.agreeToMessages || false,
    };
    const fieldsPreFilled = {
      name: Boolean(fullName), phone: Boolean(profileData.phone), email: Boolean(profileData.email),
      address: { street: Boolean(address.street), city: Boolean(address.city), state: Boolean(address.state), postalCode: Boolean(address.postalCode) },
    };
    const hasPreFilledData =
      fieldsPreFilled.name || fieldsPreFilled.phone || fieldsPreFilled.email || Object.values(fieldsPreFilled.address).some(Boolean);
    setFormData(newFormData);
    setSavedDataIndicator(fieldsPreFilled);
    if (hasPreFilledData && !window.__profileToastShown) {
      window.__profileToastShown = true;
      toast.success("We've filled some information from your saved profile");
    }
  };

  const handleBackButton = () => {
    if (activeStep === 1) navigate("/");
    else setActiveStep((prev) => Math.max(1, prev - 1));
  };

  const calculateTotalPayments = (startDate, endDate, frequency) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    switch (frequency) {
      case "daily": count = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; break;
      case "weekly": count = Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 7)) + 1; break;
      case "monthly": count = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1; break;
      case "yearly": count = end.getFullYear() - start.getFullYear() + 1; break;
      default: count = 0;
    }
    return count;
  };

  useEffect(() => {
    const ramadanRecurringItems = items.filter((item) => item.source === "ramadan" && item.isRecurring && item.recurringDetails);
    setHasRamadanRecurringItems(ramadanRecurringItems.length > 0);
    if (ramadanRecurringItems.length > 0) {
      const ramadanItem = ramadanRecurringItems[0];
      setPaymentType("recurring");
      setRecurringFrequency(ramadanItem.recurringDetails.frequency || "daily");
      setRecurringAmount(ramadanItem.price);
      if (ramadanItem.recurringDetails.endDate) setRecurringEndDate(ramadanItem.recurringDetails.endDate);
      if (ramadanItem.recurringDetails.totalPayments) {
        setTotalRecurringPayments(ramadanItem.recurringDetails.totalPayments);
      } else {
        const startDate = new Date(ramadanItem.recurringDetails.startDate || new Date());
        const endDate = new Date(ramadanItem.recurringDetails.endDate);
        setTotalRecurringPayments(calculateTotalPayments(startDate, endDate, ramadanItem.recurringDetails.frequency));
      }
      setSelectedDonationType("Sadaqa");
      toast.success("Your Ramadan recurring donation has been configured");
    }
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (recurringEndDate) setTotalRecurringPayments(calculateTotalPayments(new Date(), recurringEndDate, recurringFrequency));
    else setTotalRecurringPayments(0);
  }, [recurringEndDate, recurringFrequency]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePaymentMethodCreated = (paymentMethod) => setStripePaymentMethod(paymentMethod);

  const validateDonorDetails = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.phone) newErrors.phone = "Phone is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Please enter a valid email";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOnBehalfOfChange = (itemId, value) => setOnBehalfOf((prev) => ({ ...prev, [itemId]: value }));
  const handleQuantityChange = (itemId, delta) => updateQuantity(itemId, delta);

  const handleSubmitOrder = async () => {
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
    if ((selectedPaymentMethod === "visa" || selectedPaymentMethod === "mastercard") && !stripePaymentMethod) {
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
          const userUpdateResponse = await axiosInstance.put("/users/update", {
            firstName, lastName, phone: formData.phone,
            address: { street: formData.streetAddress, city: formData.townCity, state: formData.state, postalCode: formData.postcode },
          });
          if (userUpdateResponse.data.status === "Success") toast.success("Your details have been saved for future donations");
        } catch (userUpdateError) {
          console.error("Failed to save user details:", userUpdateError);
          toast.error("Could not save your details, but your donation will still be processed");
        }
      }
      const processedItems = items.map((item) => ({
        title: item.title,
        price: item.price,
        quantity: item.quantity || 1,
        onBehalfOf: onBehalfOf[item.id] || null,
        donationType: item.donationType || "Sadaqah",
        ...(item.programId && { programId: item.programId }),
        ...(item.source && { source: item.source }),
        ...(item.isRecurring && { isRecurring: true }),
        ...(item.recurringDetails && { recurringDetails: item.recurringDetails }),
      }));
      const orderData = {
        items: processedItems,
        paymentType,
        adminCostContribution: (total * adminCostPercentage) / 100,
        donorDetails: {
          name: formData.name, phone: formData.phone, email: formData.email,
          streetAddress: formData.streetAddress, townCity: formData.townCity, state: formData.state, postcode: formData.postcode,
          agreeToMessages: formData.agreeToMessages, rememberDetails: formData.rememberDetails,
        },
        donationType: selectedDonationType,
        paymentMethod: selectedPaymentMethod,
        totalAmount: total + (total * adminCostPercentage) / 100,
        ...(paymentType === "recurring" && {
          recurringDetails: {
            frequency: recurringFrequency, amount: recurringAmount, endDate: recurringEndDate,
            totalPayments: totalRecurringPayments, billingDay,
            ...(hasRamadanRecurringItems && { source: "ramadan" }),
          },
        }),
        ...(paymentType === "installments" && {
          installmentDetails: {
            numberOfInstallments: installmentMonths,
            installmentAmount: (total + (total * adminCostPercentage) / 100) / installmentMonths,
          },
        }),
        ...((selectedPaymentMethod === "visa" || selectedPaymentMethod === "mastercard") && {
          stripePaymentMethodId: stripePaymentMethod.id,
        }),
      };

      const response = await OrderService.createOrder(orderData);
      if (response.status === "Success") {
        toast.success("Order created successfully!");
        clearCart();
        navigate("/order-confirmation", { state: { orderDetails: response.order, paymentMethod: selectedPaymentMethod } });
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
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  /* ── derived ── */
  const adminContribution = (total * adminCostPercentage) / 100;
  const grandTotal = total + adminContribution;
  const donationTypeOptions = donationTypes.map((t) => ({ value: t.donationType, label: t.donationType }));
  const typeAmount = {
    single: `$${money(grandTotal)} once`,
    recurring: `$${money(grandTotal)} / ${recurringFrequency}`,
    installments: `${installmentMonths} × $${money(grandTotal / installmentMonths)}`,
  };

  /* ── Step 1: Donations ── */
  const renderDonationStep = () => (
    <>
      <SectionHead icon={Gift} title="Your donations" desc="Review your gifts, choose a category and how often to give." />

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="border border-gray-100 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              {item.image ? <img src={item.image} alt={item.title} className="h-12 w-12 shrink-0 object-cover" loading="lazy" /> : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-primary">{item.title}</h3>
                    {item.quantity > 1 && <p className="mt-0.5 text-xs text-text-muted">${money(item.price)} each</p>}
                  </div>
                  <span className="shrink-0 font-heading text-lg font-bold text-primary">${money(item.price * item.quantity)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Donation type</label>
                <CustomSelect
                  className="w-full"
                  triggerClassName={selectTrigger}
                  placeholder="Select type"
                  disabled={loadingDonationTypes || donationTypeOptions.length === 0}
                  value={item.donationType || donationTypeOptions[0]?.value || ""}
                  onChange={(v) => onChangeDonationType(item, v)}
                  options={donationTypeOptions}
                />
              </div>
              <div>
                <label className={labelCls}>On behalf of (optional)</label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Person, community or masjid"
                  value={onBehalfOf[item.id] || ""}
                  onChange={(e) => handleOnBehalfOfChange(item.id, e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              <div className="inline-flex items-center border border-gray-200">
                <button onClick={() => handleQuantityChange(item.id, -1)} className="grid h-9 w-9 place-items-center text-text-muted hover:bg-gray-50" aria-label="Decrease"><Minus className="h-3.5 w-3.5" /></button>
                <span className="w-9 text-center text-sm font-semibold text-primary">{item.quantity}</span>
                <button onClick={() => handleQuantityChange(item.id, 1)} className="grid h-9 w-9 place-items-center text-text-muted hover:bg-gray-50" aria-label="Increase"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <button onClick={() => removeItem(item.id)} className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-red-500">
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Frequency — each tile previews its own amount */}
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold text-primary">How often would you like to give?</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {PAYMENT_TYPES.map((t) => {
            const active = paymentType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                disabled={hasRamadanRecurringItems}
                onClick={() => !hasRamadanRecurringItems && setPaymentType(t.id)}
                className={`flex flex-col gap-2 border p-4 text-left transition-colors disabled:opacity-60 ${active ? "border-accent bg-accent/5" : "border-gray-200 hover:border-accent/50"}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`grid h-9 w-9 place-items-center ${active ? "bg-accent text-white" : "bg-accent/10 text-accent"}`}><t.icon className="h-4 w-4" /></span>
                  {active ? <Check className="h-4 w-4 text-accent" /> : null}
                </div>
                <span className="text-sm font-semibold text-primary">{t.label}</span>
                <span className="text-xs text-text-muted">{t.desc}</span>
                <span className="mt-1 font-heading text-sm font-bold text-accent">{typeAmount[t.id]}</span>
              </button>
            );
          })}
        </div>
        {hasRamadanRecurringItems && (
          <p className="mt-2 flex items-center gap-2 text-sm text-accent"><Info className="h-4 w-4" /> Set to recurring for your Ramadan last-10-nights donation.</p>
        )}
      </div>

      {/* Recurring panel */}
      {paymentType === "recurring" && (
        <div className="mt-5 space-y-5 border border-gray-100 bg-gray-50 p-5">
          <h4 className="text-sm font-semibold text-primary">Recurring details</h4>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Frequency</label>
              <CustomSelect className="w-full" triggerClassName={selectTrigger} value={recurringFrequency} onChange={setRecurringFrequency} options={FREQ_OPTIONS} disabled={hasRamadanRecurringItems} />
            </div>
            {recurringFrequency === "monthly" && (
              <div>
                <label className={labelCls}>Monthly billing day</label>
                <CustomSelect className="w-full" triggerClassName={selectTrigger} value={billingDay} onChange={(v) => setBillingDay(parseInt(v))} options={BILLING_DAY_OPTIONS} disabled={hasRamadanRecurringItems} />
              </div>
            )}
            <div>
              <label className={labelCls}>Amount charged {recurringFrequency}</label>
              <input type="number" value={recurringAmount} disabled className={`${inputCls} bg-gray-100`} />
            </div>
            <div>
              <label className={labelCls}>End date</label>
              <input
                type="date"
                value={recurringEndDate}
                onChange={(e) => setRecurringEndDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                disabled={hasRamadanRecurringItems}
                className={inputCls}
              />
            </div>
          </div>
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <Info className="h-4 w-4 text-accent" />
            {totalRecurringPayments > 0
              ? `Your card will be charged $${recurringAmount} ${recurringFrequency} for ${totalRecurringPayments} payments.`
              : "Choose an end date to see the total number of payments."}
          </p>
        </div>
      )}

      {/* Installments panel */}
      {paymentType === "installments" && (
        <div className="mt-5 space-y-5 border border-gray-100 bg-gray-50 p-5">
          <h4 className="text-sm font-semibold text-primary">Installment details</h4>
          <div>
            <label className={labelCls}>Number of monthly installments</label>
            <div className="flex items-center gap-4">
              <input type="range" min="1" max="12" value={installmentMonths} onChange={(e) => setInstallmentMonths(parseInt(e.target.value))} className="h-1.5 flex-1 cursor-pointer appearance-none bg-accent/20 accent-accent" />
              <span className="w-8 text-center font-semibold text-primary">{installmentMonths}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="border border-gray-200 bg-white p-3">
              <p className="text-xs text-text-muted">Total amount</p>
              <p className="mt-0.5 font-semibold text-primary">${money(grandTotal)}</p>
            </div>
            <div className="border border-gray-200 bg-white p-3">
              <p className="text-xs text-text-muted">Monthly payment</p>
              <p className="mt-0.5 font-semibold text-primary">${money(grandTotal / installmentMonths)}</p>
            </div>
          </div>
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <Info className="h-4 w-4 text-accent" /> First payment today, then every 30 days for {installmentMonths - 1} more month{installmentMonths > 2 ? "s" : ""}.
          </p>
        </div>
      )}

      {/* Admin cost */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-6">
        <div>
          <h3 className="text-sm font-semibold text-primary">Contribute to admin costs?</h3>
          <p className="text-sm text-text-muted">Helps us maintain our 100% donation policy.</p>
        </div>
        <div className="inline-flex items-center border border-gray-200">
          <button onClick={() => setAdminCostPercentage(Math.max(0, adminCostPercentage - 1))} className="grid h-9 w-9 place-items-center text-text-muted hover:bg-gray-50"><Minus className="h-3.5 w-3.5" /></button>
          <span className="w-12 text-center text-sm font-semibold text-primary">{adminCostPercentage}%</span>
          <button onClick={() => setAdminCostPercentage(Math.min(20, adminCostPercentage + 1))} className="grid h-9 w-9 place-items-center text-text-muted hover:bg-gray-50"><Plus className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </>
  );

  /* ── Step 2: Donor details ── */
  const SavedTag = ({ show }) => (show ? <span className="ml-2 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">Saved</span> : null);

  const renderDonorStep = () => (
    <>
      <SectionHead icon={ShieldCheck} title="Your details" desc="We'll send your receipt here and keep your info private." />

      {user && (
        <div className="mb-6 flex items-start gap-2.5 border border-accent/20 bg-accent/5 p-4 text-sm text-primary">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <span>
            You&apos;re logged in as {user.email}.{" "}
            {Object.values(savedDataIndicator).some((v) => v) ? "Some details have been pre-filled." : "Complete the form below to save these details for next time."}
          </span>
        </div>
      )}

      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Name <span className="text-red-500">*</span><SavedTag show={savedDataIndicator.name} /></label>
            <input type="text" name="name" value={formData.name} onChange={handleInputChange} className={`${inputCls} ${errors.name ? "border-red-400" : ""}`} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>
          <div>
            <label className={labelCls}>Phone <span className="text-red-500">*</span><SavedTag show={savedDataIndicator.phone} /></label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className={`${inputCls} ${errors.phone ? "border-red-400" : ""}`} />
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
          </div>
          <div>
            <label className={labelCls}>Email <span className="text-red-500">*</span><SavedTag show={savedDataIndicator.email} /></label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} readOnly={!!(user && user.email)} className={`${inputCls} ${errors.email ? "border-red-400" : ""} ${user && user.email ? "bg-gray-100" : ""}`} />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>
        </div>

        <div>
          <label className={labelCls}>Street address</label>
          <input type="text" name="streetAddress" value={formData.streetAddress} onChange={handleInputChange} className={inputCls} />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Suburb</label>
            <input type="text" name="townCity" value={formData.townCity} onChange={handleInputChange} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>State</label>
            <CustomSelect
              className="w-full"
              triggerClassName={selectTrigger}
              placeholder="Select state"
              value={formData.state}
              onChange={(v) => setFormData((p) => ({ ...p, state: v }))}
              options={STATE_OPTIONS}
            />
          </div>
          <div>
            <label className={labelCls}>Postcode</label>
            <input type="text" name="postcode" value={formData.postcode} onChange={handleInputChange} className={inputCls} />
          </div>
        </div>

        <div className="space-y-3 border-t border-gray-100 pt-5">
          <label className="flex items-start gap-2.5 text-sm text-gray-700">
            <input type="checkbox" name="rememberDetails" checked={formData.rememberDetails} onChange={(e) => { handleInputChange(e); if (e.target.checked && user) handleUpdateProfile(); }} disabled={isUpdatingProfile} className="mt-0.5 h-4 w-4 accent-accent" />
            <span>{user ? "Update my saved details with this information" : "Save my details for future donations"}</span>
          </label>
          <label className="flex items-start gap-2.5 text-sm text-gray-700">
            <input type="checkbox" name="agreeToMessages" checked={formData.agreeToMessages} onChange={handleInputChange} className="mt-0.5 h-4 w-4 accent-accent" />
            <span>I agree to receive Email, WhatsApp/SMS messages. SMS data rates may apply. Reply STOP to cancel.</span>
          </label>
          {isUpdatingProfile && <p className="flex items-center gap-2 text-sm text-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Updating profile…</p>}
        </div>
      </div>
    </>
  );

  /* ── Step 3: Payment ── */
  const renderPaymentStep = () => (
    <>
      <SectionHead icon={Lock} title="Payment" desc="Choose how you'd like to pay. All transactions are encrypted." />

      <div className="grid gap-3 sm:grid-cols-2">
        {PAYMENT_METHODS.map((m) => {
          const active = selectedPaymentMethod === m.id || (m.id === "visa" && selectedPaymentMethod === "mastercard");
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedPaymentMethod(m.id)}
              className={`flex items-center gap-3 border p-4 text-left transition-colors ${active ? "border-accent bg-accent/5" : "border-gray-200 hover:border-accent/50"}`}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center ${active ? "bg-accent text-white" : "bg-accent/10 text-accent"}`}><m.icon className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-primary">{m.label}</span>
                <span className="block text-xs text-text-muted">{m.desc}</span>
              </span>
              {m.id === "visa" && (
                <span className="ml-auto hidden items-center gap-1.5 sm:flex">
                  <img src={visa} alt="Visa" className="h-5" />
                  <img src={mastercard} alt="Mastercard" className="h-5" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {(selectedPaymentMethod === "visa" || selectedPaymentMethod === "mastercard") && stripePromise && (
        <Elements stripe={stripePromise}>
          <StripeCardForm onPaymentMethodCreated={handlePaymentMethodCreated} isSubmitting={submittingCardForm} />
        </Elements>
      )}

      {selectedPaymentMethod === "bank" && (
        <div className="mt-5 space-y-2 border border-gray-100 bg-gray-50 p-5 text-sm text-primary">
          <p className="font-semibold">Bank transfer details</p>
          <p>Bank: {organisation?.bankDetails?.bankName || "Contact us for details"}</p>
          <p>BSB: {organisation?.bankDetails?.bsb || "N/A"}</p>
          <p>Account number: {organisation?.bankDetails?.accountNumber || "N/A"}</p>
          <p className="text-text-muted">For a tax receipt, email proof of payment to {organisation?.contactEmail || "the organisation"}.</p>
          <div className="mt-3 bg-primary p-4 text-sm text-background">
            Your donation is processed once we receive clear funds. A tax receipt is emailed once payment is confirmed by our team.
          </div>
        </div>
      )}
    </>
  );

  const renderActiveStep = () => {
    switch (activeStep) {
      case 1: return renderDonationStep();
      case 2: return renderDonorStep();
      case 3: return renderPaymentStep();
      default: return null;
    }
  };

  const recurringDisablesPay =
    (selectedPaymentMethod === "visa" || selectedPaymentMethod === "mastercard") && !stripePaymentMethod;

  /* ── Order summary sidebar ── */
  const OrderSummary = () => (
    <div className="border border-gray-100 bg-white shadow-sm lg:sticky lg:top-24">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="font-heading text-base font-bold text-primary">Order summary</h3>
      </div>
      <div className="max-h-60 space-y-3 overflow-y-auto px-5 py-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
            <span className="min-w-0">
              <span className="block truncate text-primary">{item.title}</span>
              <span className="text-xs text-text-muted">Qty {item.quantity}{item.donationType ? ` · ${item.donationType}` : ""}</span>
            </span>
            <span className="shrink-0 font-medium text-primary">${money(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-gray-100 px-5 py-4 text-sm">
        <div className="flex justify-between text-text-muted"><span>Subtotal</span><span className="text-primary">${money(total)}</span></div>
        {adminCostPercentage > 0 && (
          <div className="flex justify-between text-text-muted"><span>Admin contribution ({adminCostPercentage}%)</span><span className="text-primary">${money(adminContribution)}</span></div>
        )}
        {paymentType === "recurring" && (
          <p className="flex items-center gap-1.5 pt-1 text-xs text-accent"><Repeat className="h-3.5 w-3.5" /> Recurring {recurringFrequency}{totalRecurringPayments > 0 ? ` · ${totalRecurringPayments} payments` : ""}</p>
        )}
        {paymentType === "installments" && (
          <p className="flex items-center gap-1.5 pt-1 text-xs text-accent"><CalendarDays className="h-3.5 w-3.5" /> {installmentMonths} payments of ${money(grandTotal / installmentMonths)}</p>
        )}
        <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="font-semibold text-primary">Total</span>
          <span className="font-heading text-xl font-bold text-primary">${money(grandTotal)}</span>
        </div>
      </div>
      <div className="space-y-2.5 border-t border-gray-100 px-5 py-4">
        <p className="flex items-center gap-2 text-xs text-text-muted"><Lock className="h-3.5 w-3.5 text-accent" /> Encrypted, secure checkout</p>
        <p className="flex items-center gap-2 text-xs text-text-muted"><ShieldCheck className="h-3.5 w-3.5 text-accent" /> 100% donation policy · we protect your privacy</p>
        <div className="flex items-center gap-2 pt-1">
          <img src={visa} alt="Visa" className="h-5" />
          <img src={mastercard} alt="Mastercard" className="h-5" />
        </div>
      </div>
    </div>
  );

  /* ── Empty cart ── */
  if (isCartEmpty) {
    return (
      <div className="min-h-[70vh] bg-background px-4 pb-16 pt-10">
        <div className="mx-auto flex max-w-md flex-col items-center border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
          <span className="mb-4 grid h-14 w-14 place-items-center bg-accent/10 text-accent"><ShoppingBag className="h-6 w-6" /></span>
          <h2 className="font-heading text-lg font-bold text-primary">Your cart is empty</h2>
          <p className="mt-1 text-sm text-text-muted">Add a donation to continue to checkout.</p>
          <button onClick={() => navigate("/donate")} className="mt-6 inline-flex items-center gap-2 bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
            Browse donations <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pb-20 pt-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-primary sm:text-3xl">Complete your donation</h1>
          <p className="mt-1 text-sm text-text-muted">A few quick steps and your gift is on its way.</p>
        </div>

        {/* Stepper */}
        <div className="mb-8 flex items-center">
          {STEPS.map((s, i) => {
            const done = s.n < activeStep;
            const active = s.n === activeStep;
            return (
              <div key={s.n} className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : "flex-none"}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center text-sm font-bold transition-colors ${done || active ? "bg-accent text-white" : "bg-gray-200 text-gray-500"}`}>
                    {done ? <Check className="h-4 w-4" /> : s.n}
                  </span>
                  <span className={`hidden text-sm font-medium sm:block ${active || done ? "text-primary" : "text-text-muted"}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`mx-3 h-px flex-1 ${done ? "bg-accent" : "bg-gray-200"}`} />}
              </div>
            );
          })}
        </div>

        {/* Content + summary */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <div className="border border-gray-100 bg-white p-6 shadow-sm sm:p-8">{renderActiveStep()}</div>

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                onClick={handleBackButton}
                disabled={loading}
                className="inline-flex items-center gap-2 border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>

              {activeStep < 3 ? (
                <button
                  onClick={() => { if (activeStep === 2 && !validateDonorDetails()) return; setActiveStep((p) => Math.min(3, p + 1)); }}
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmitOrder}
                  disabled={loading || recurringDisablesPay}
                  className="inline-flex items-center gap-2 bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {loading ? "Processing…" : selectedPaymentMethod === "bank" ? "Confirm donation" : `Pay $${money(grandTotal)}`}
                </button>
              )}
            </div>
          </div>

          <OrderSummary />
        </div>
      </div>
    </div>
  );
};

export default UnifiedCheckout;
