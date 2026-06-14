import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useTenantStripe from "../../hooks/useTenantStripe";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { ArrowLeft, Heart, Check, Info, Shield } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../services/axios";
import { OrderService } from "../../services/order.service";
import { toast } from "react-hot-toast";
import visa from "../../assets/visa.png";
import mastercard from "../../assets/mastercard.png";

// stripePromise is created per-tenant inside the component (see useTenantStripe).

// ── Stripe Card Form ────────────────────────────────────
const StripeCardForm = ({ onPaymentMethodCreated }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState("");
  const [cardComplete, setCardComplete] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const processCard = async () => {
    if (!stripe || !elements) return;
    setIsVerifying(true);
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) { setIsVerifying(false); return; }
    const { error, paymentMethod } = await stripe.createPaymentMethod({ type: "card", card: cardElement });
    if (error) {
      setCardError(error.message);
      setIsVerifying(false);
    } else {
      setCardError("");
      setIsVerifying(false);
      setIsVerified(true);
      onPaymentMethodCreated(paymentMethod);
      toast.success("Card verified");
    }
  };

  return (
    <div className="mt-4">
      <div className="p-4 border border-gray-200 rounded-xl">
        <label className="block text-sm font-medium text-primary mb-2">Card Details</label>
        <CardElement
          options={{
            style: {
              base: { fontSize: "16px", color: "#424770", "::placeholder": { color: "#aab7c4" } },
              invalid: { color: "#9e2146" },
            },
          }}
          onChange={(e) => { setCardComplete(e.complete); setCardError(e.error?.message || ""); }}
        />
        {cardError && <p className="text-red-500 text-sm mt-2">{cardError}</p>}
        {cardComplete && (
          <button type="button" onClick={processCard} disabled={isVerifying || isVerified}
            className="mt-3 px-4 py-2 text-white bg-accent hover:bg-accent/90 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50">
            {isVerifying ? "Verifying..." : isVerified ? <><Check className="w-4 h-4" /> Verified</> : "Verify Card"}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Main Checkout ───────────────────────────────────────
function ProgramCheckoutInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const stripePromise = useTenantStripe();

  const programData = location.state?.program;
  const donationAmount = location.state?.amount;

  const [adminPct, setAdminPct] = useState(2);
  const [selectedPayment, setSelectedPayment] = useState("");
  const [stripePaymentMethod, setStripePaymentMethod] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    streetAddress: "", townCity: "", state: "", postcode: "",
  });
  const [errors, setErrors] = useState({});

  // Prefill from user profile
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!programData || !donationAmount) {
      navigate("/programs");
      return;
    }
    if (user) fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axiosInstance.get("/users/me");
      if (res.data.status === "Success") {
        const p = res.data.user;
        setForm({
          name: p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim(),
          phone: p.phone || "",
          email: p.email || "",
          streetAddress: p.address?.street || "",
          townCity: p.address?.city || "",
          state: p.address?.state || "",
          postcode: p.address?.postalCode || "",
        });
      }
    } catch { /* ignore */ }
  };

  if (!programData || !donationAmount) return null;

  const adminCost = (donationAmount * adminPct) / 100;
  const total = donationAmount + adminCost;
  const coverImg = programData.images?.[programData.coverImageIndex || 0]?.url;

  const validate = () => {
    const e = {};
    if (!form.name) e.name = "Required";
    if (!form.phone) e.phone = "Required";
    if (!form.email) e.email = "Required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) { toast.error("Please fill in required fields"); return; }
    if (!selectedPayment) { toast.error("Please select a payment method"); return; }
    if ((selectedPayment === "visa" || selectedPayment === "mastercard") && !stripePaymentMethod) {
      toast.error("Please verify your card details"); return;
    }

    setLoading(true);
    try {
      const orderData = {
        items: [{
          title: programData.title,
          price: donationAmount,
          quantity: 1,
          programId: programData._id,
        }],
        paymentType: "single",
        adminCostContribution: adminCost,
        donorDetails: {
          name: form.name,
          phone: form.phone,
          email: form.email,
          streetAddress: form.streetAddress,
          townCity: form.townCity,
          state: form.state,
          postcode: form.postcode,
        },
        donationType: "Program Donation",
        paymentMethod: selectedPayment,
        totalAmount: total,
        ...((selectedPayment === "visa" || selectedPayment === "mastercard") && {
          stripePaymentMethodId: stripePaymentMethod.id,
        }),
      };

      const response = await OrderService.createOrder(orderData);
      if (response.status === "Success") {
        toast.success("Thank you for your donation!");
        navigate("/order-confirmation", {
          state: { orderDetails: response.order, paymentMethod: selectedPayment },
        });
      } else {
        toast.error(response.message || "Payment failed");
      }
    } catch (error) {
      toast.error(error.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: "" }));
  };

  const InputField = ({ label, name: fieldName, required, type = "text", readOnly, ...props }) => (
    <div>
      <label className="block text-sm font-medium text-primary mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input type={type} name={fieldName} value={form[fieldName]} onChange={handleInput} readOnly={readOnly}
        className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all ${
          errors[fieldName] ? "border-red-400" : "border-gray-200"
        } ${readOnly ? "bg-gray-50" : ""}`}
        {...props} />
      {errors[fieldName] && <p className="text-red-500 text-xs mt-1">{errors[fieldName]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-24 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 font-medium mb-6 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Program
        </button>

        {/* Program Summary Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex gap-4">
            {coverImg ? (
              <img src={coverImg} alt={programData.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Heart className="w-8 h-8 text-accent" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-heading font-bold text-primary text-lg">{programData.title}</h2>
              <p className="text-sm text-text-muted line-clamp-1 mt-0.5">{programData.description || "Program Donation"}</p>
              <p className="text-xl font-bold text-accent mt-2">${donationAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Admin cost */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-primary">Contribute to admin costs?</p>
                <p className="text-xs text-text-muted">Helps maintain our 100% donation policy</p>
              </div>
              <div className="flex items-center">
                <button onClick={() => setAdminPct(Math.max(0, adminPct - 1))}
                  className="px-2.5 py-1 border border-gray-200 rounded-l-lg hover:bg-gray-50 text-sm">-</button>
                <span className="px-3 py-1 border-t border-b border-gray-200 text-sm font-medium min-w-[40px] text-center">{adminPct}%</span>
                <button onClick={() => setAdminPct(Math.min(20, adminPct + 1))}
                  className="px-2.5 py-1 border border-gray-200 rounded-r-lg hover:bg-gray-50 text-sm">+</button>
              </div>
            </div>
            {adminPct > 0 && (
              <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                <Info className="w-3 h-3" /> Admin contribution: ${adminCost.toFixed(2)}
              </p>
            )}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-lg font-bold text-primary">Total</span>
            <span className="text-lg font-bold text-primary">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Donor Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <h3 className="text-base font-heading font-bold text-primary mb-4">Your Details</h3>

          {user && (
            <div className="mb-4 bg-accent/5 border border-accent/15 rounded-xl p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-accent flex-shrink-0" />
              <p className="text-xs text-accent">Logged in as {user.email}. Details pre-filled from your profile.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <InputField label="Name" name="name" required placeholder="Full name" />
            <InputField label="Phone" name="phone" required placeholder="Phone number" />
            <InputField label="Email" name="email" required type="email" readOnly={!!user?.email} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <InputField label="Street" name="streetAddress" placeholder="Street address" />
            <InputField label="Suburb" name="townCity" placeholder="City" />
            <div>
              <label className="block text-sm font-medium text-primary mb-1">State</label>
              <select name="state" value={form.state} onChange={handleInput}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none">
                <option value="">Select</option>
                {["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <InputField label="Postcode" name="postcode" placeholder="0000" />
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <h3 className="text-base font-heading font-bold text-primary mb-4">Payment Method</h3>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { key: "visa", img: visa, label: "Visa" },
              { key: "mastercard", img: mastercard, label: "Mastercard" },
              { key: "bank", label: "Bank Transfer" },
            ].map(({ key, img, label }) => (
              <button key={key} onClick={() => { setSelectedPayment(key); setStripePaymentMethod(null); }}
                className={`p-4 border rounded-xl transition-all flex flex-col items-center justify-center gap-2 ${
                  selectedPayment === key ? "border-accent bg-accent/5 ring-1 ring-accent/30" : "border-gray-200 hover:border-accent/30"
                }`}>
                {img ? (
                  <img src={img} alt={label} className="h-8" loading="lazy" />
                ) : (
                  <span className="font-bold text-accent text-sm text-center leading-tight">Bank<br />Transfer</span>
                )}
              </button>
            ))}
          </div>

          {(selectedPayment === "visa" || selectedPayment === "mastercard") && (
            <Elements stripe={stripePromise}>
              <StripeCardForm onPaymentMethodCreated={setStripePaymentMethod} />
            </Elements>
          )}

          {selectedPayment === "bank" && (
            <div className="border border-gray-200 rounded-xl p-4 mt-2 space-y-1 text-sm">
              <p className="font-semibold text-primary">Bank Transfer Details</p>
              <p>Bank: Westpac</p>
              <p>BSB: 032075</p>
              <p>Account: 841783</p>
              <p className="text-xs text-text-muted mt-2">Your donation will be processed once funds are received.</p>
            </div>
          )}
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading || !selectedPayment ||
          ((selectedPayment === "visa" || selectedPayment === "mastercard") && !stripePaymentMethod)}
          className="w-full py-4 bg-accent hover:bg-accent/90 text-white rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </span>
          ) : (
            <>
              <Heart className="w-5 h-5" />
              {selectedPayment === "bank" ? "Confirm Donation" : `Pay $${total.toFixed(2)}`}
            </>
          )}
        </button>

        {/* Trust badges */}
        <div className="mt-5 text-center">
          <div className="flex justify-center gap-4 mb-3">
            <img src={visa} alt="Visa" className="h-7 opacity-60" />
            <img src={mastercard} alt="Mastercard" className="h-7 opacity-60" />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
            <Shield className="w-3.5 h-3.5" />
            100% Secure · 100% Donation Policy · Privacy Protected
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProgramCheckout() {
  return <ProgramCheckoutInner />;
}
