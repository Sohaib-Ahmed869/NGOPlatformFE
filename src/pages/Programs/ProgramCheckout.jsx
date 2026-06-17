import React, { useState, useEffect, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import useTenantStripe from "../../hooks/useTenantStripe";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Check,
  CheckCircle2,
  Info,
  ShieldCheck,
  Lock,
  User,
  MapPin,
  CreditCard,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTenant } from "../../context/TenantContext";
import axiosInstance from "../../services/axios";
import { OrderService } from "../../services/order.service";
import { CustomSelect } from "../../components/CustomSelect";
import HeroOverlay from "../../components/HeroOverlay";
import { cn } from "../../utils/cn";
import { toast } from "react-hot-toast";
import visa from "../../assets/visa.png";
import mastercard from "../../assets/mastercard.png";

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const HERO_FALLBACK_BG =
  "linear-gradient(135deg, var(--tenant-primary, #2C2418), var(--tenant-primary-light, #4A3C2A))";

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const STEPS = [
  { key: "details", label: "Your details" },
  { key: "payment", label: "Payment" },
];

// Underline field style — matches the Contact Us form / fundraiser donation.
const baseField =
  "w-full border-b bg-transparent py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400";
const fieldCls = (err) =>
  cn(baseField, err ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-accent");

function Eyebrow({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

function Step({ n, label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors",
          done ? "bg-emerald-500 text-white" : active ? "bg-accent text-white" : "bg-gray-100 text-text-muted",
        )}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : n}
      </span>
      <span className={cn("hidden text-sm font-semibold sm:inline", active || done ? "text-primary" : "text-text-muted")}>{label}</span>
    </div>
  );
}

function Field({ label, required, error, children, className }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/* ── Stripe card form (verify a card → PaymentMethod) ─────────────────── */
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
    if (!cardElement) {
      setIsVerifying(false);
      return;
    }
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
    <div className="mt-4 border border-gray-200 p-4">
      <label className="mb-2 block text-sm font-medium text-primary">Card details</label>
      <CardElement
        options={{
          style: {
            base: { fontSize: "15px", color: "#424770", "::placeholder": { color: "#aab7c4" } },
            invalid: { color: "#9e2146" },
          },
        }}
        onChange={(e) => {
          setCardComplete(e.complete);
          setCardError(e.error?.message || "");
          if (!e.complete) setIsVerified(false);
        }}
      />
      {cardError && <p className="mt-2 text-sm text-red-500">{cardError}</p>}
      {cardComplete && (
        <button
          type="button"
          onClick={processCard}
          disabled={isVerifying || isVerified}
          className="mt-3 inline-flex items-center gap-2 rounded-token-btn bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : isVerified ? <Check className="h-4 w-4" /> : null}
          {isVerifying ? "Verifying…" : isVerified ? "Card verified" : "Verify card"}
        </button>
      )}
    </div>
  );
};

function ProgramCheckoutInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { organisation } = useTenant();
  const stripePromise = useTenantStripe();

  const programData = location.state?.program;
  const donationAmount = location.state?.amount;

  const [step, setStep] = useState(0);
  const [adminPct, setAdminPct] = useState(2);
  const [selectedPayment, setSelectedPayment] = useState("");
  const [stripePaymentMethod, setStripePaymentMethod] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    streetAddress: "", townCity: "", state: "", postcode: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!programData || !donationAmount) {
      navigate("/programs");
      return;
    }
    if (user) fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const bank = organisation?.bankDetails || {};
  const current = STEPS[step].key;
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: "" }));
  };

  const validateDetails = () => {
    const e = {};
    if (!form.name) e.name = "Required";
    if (!form.phone) e.phone = "Required";
    if (!form.email) e.email = "Required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("Please fill in the required fields");
      return false;
    }
    return true;
  };

  const goToPayment = () => {
    if (!validateDetails()) return;
    setStep(1);
    scrollTop();
  };

  const cardSelected = selectedPayment === "visa" || selectedPayment === "mastercard";

  const handleSubmit = async () => {
    if (!validateDetails()) {
      setStep(0);
      return;
    }
    if (!selectedPayment) {
      toast.error("Please select a payment method");
      return;
    }
    if (cardSelected && !stripePaymentMethod) {
      toast.error("Please verify your card details");
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        items: [{ title: programData.title, price: donationAmount, quantity: 1, programId: programData._id }],
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
        ...(cardSelected && { stripePaymentMethodId: stripePaymentMethod.id }),
      };

      const response = await OrderService.createOrder(orderData);
      if (response.status === "Success") {
        toast.success("Thank you for your donation!");
        navigate("/order-confirmation", { state: { orderDetails: response.order, paymentMethod: selectedPayment } });
      } else {
        toast.error(response.message || "Payment failed");
      }
    } catch (error) {
      toast.error(error.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const submitDisabled = loading || !selectedPayment || (cardSelected && !stripePaymentMethod);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* ── HERO (data-hero so the navbar measures it, not the body) ──── */}
      <div data-hero className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden py-20 lg:py-28">
        {coverImg ? (
          <div className="absolute inset-0">
            <img src={coverImg} alt="" className="h-full w-full object-cover" />
            <HeroOverlay />
          </div>
        ) : (
          <>
            <div className="absolute inset-0" style={{ background: HERO_FALLBACK_BG }} />
            <div className="absolute inset-0 bg-black/30" />
          </>
        )}

        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <button
            onClick={() => navigate(-1)}
            className="group mb-6 flex w-fit items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to program
          </button>
          <span className="inline-flex items-center gap-1.5 bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            <Heart className="h-3.5 w-3.5" /> Complete your donation
          </span>
          <h1 className="mt-4 max-w-3xl font-heading text-3xl font-bold leading-tight text-warm-cream md:text-5xl">
            {programData.title}
          </h1>
          <p className="mt-3 text-sm text-warm-beige/80">You're donating {money(donationAmount)} to this program.</p>
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────── */}
      <section className="bg-background px-6 py-12 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          {/* Left — stepped form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-2"
          >
            <div className="rounded-token border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              {/* Step indicator */}
              <div className="mb-7 flex items-center gap-2 sm:gap-3">
                {STEPS.map((s, i) => (
                  <Fragment key={s.key}>
                    {i > 0 && <span className="h-px flex-1 bg-gray-200" />}
                    <Step n={i + 1} label={s.label} active={i === step} done={i < step} />
                  </Fragment>
                ))}
              </div>

              {/* Step 1 — details */}
              {current === "details" && (
                <>
                  <Eyebrow icon={User}>Your details</Eyebrow>
                  <div className="mt-4 space-y-5">
                    <Field label="Full name" required error={errors.name}>
                      <input name="name" value={form.name} onChange={handleInput} placeholder="Your name" className={fieldCls(errors.name)} />
                    </Field>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Email" required error={errors.email}>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleInput}
                          readOnly={!!user?.email}
                          placeholder="you@example.com"
                          className={cn(fieldCls(errors.email), user?.email && "opacity-70")}
                        />
                      </Field>
                      <Field label="Phone" required error={errors.phone}>
                        <input name="phone" value={form.phone} onChange={handleInput} placeholder="Phone number" className={fieldCls(errors.phone)} />
                      </Field>
                    </div>

                    <div className="flex items-center gap-2 pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      <MapPin className="h-3.5 w-3.5 text-accent" /> Address <span className="font-normal normal-case text-gray-400">(optional — for your receipt)</span>
                    </div>
                    <Field label="Street address">
                      <input name="streetAddress" value={form.streetAddress} onChange={handleInput} placeholder="Street address" className={fieldCls(false)} />
                    </Field>
                    <div className="grid gap-5 sm:grid-cols-3">
                      <Field label="Suburb / City">
                        <input name="townCity" value={form.townCity} onChange={handleInput} placeholder="City" className={fieldCls(false)} />
                      </Field>
                      <Field label="State">
                        <CustomSelect
                          value={form.state}
                          onChange={(v) => setForm((f) => ({ ...f, state: v }))}
                          options={[{ value: "", label: "Select" }, ...AU_STATES.map((s) => ({ value: s, label: s }))]}
                          variant="line"
                          className="w-full"
                        />
                      </Field>
                      <Field label="Postcode">
                        <input name="postcode" value={form.postcode} onChange={handleInput} placeholder="0000" className={fieldCls(false)} />
                      </Field>
                    </div>
                  </div>

                  <button
                    onClick={goToPayment}
                    className="mt-8 flex w-full items-center justify-center gap-2 rounded-token-btn bg-accent py-4 font-semibold text-white shadow-sm transition-colors hover:bg-accent-light"
                  >
                    Continue to payment <ArrowRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Step 2 — payment */}
              {current === "payment" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(0);
                      scrollTop();
                    }}
                    className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-primary"
                  >
                    <ArrowLeft className="h-4 w-4" /> Edit details
                  </button>
                  <Eyebrow icon={CreditCard}>Payment method</Eyebrow>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[
                      { key: "visa", img: visa, label: "Visa" },
                      { key: "mastercard", img: mastercard, label: "Mastercard" },
                      { key: "bank", label: "Bank transfer" },
                    ].map(({ key, img, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedPayment(key);
                          setStripePaymentMethod(null);
                        }}
                        className={cn(
                          "flex h-20 flex-col items-center justify-center gap-2 rounded-token-btn border text-sm font-semibold transition-all",
                          selectedPayment === key ? "border-accent bg-accent/5 text-accent ring-1 ring-accent/30" : "border-gray-200 text-gray-600 hover:border-accent/40",
                        )}
                      >
                        {img ? <img src={img} alt={label} className="h-7" loading="lazy" /> : <CreditCard className="h-6 w-6" />}
                        <span className="text-xs">{label}</span>
                      </button>
                    ))}
                  </div>

                  {cardSelected && (
                    <Elements stripe={stripePromise}>
                      <StripeCardForm onPaymentMethodCreated={setStripePaymentMethod} />
                    </Elements>
                  )}

                  {selectedPayment === "bank" && (
                    <div className="mt-4 rounded-token border border-gray-200 bg-gray-50/60 p-4 text-sm">
                      <p className="font-semibold text-primary">Bank transfer details</p>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] text-text-muted">Bank</p>
                          <p className="font-medium text-primary">{bank.bankName || "Contact us"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-text-muted">BSB</p>
                          <p className="font-medium text-primary">{bank.bsb || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-text-muted">Account</p>
                          <p className="font-medium text-primary">{bank.accountNumber || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-text-muted">Amount</p>
                          <p className="font-medium text-primary">{money(total)}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-text-muted">Your donation will be confirmed once funds are received. You can upload your transfer receipt on the next screen.</p>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitDisabled}
                    className="mt-8 flex w-full items-center justify-center gap-2 rounded-token-btn bg-accent py-4 font-semibold text-white shadow-sm transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Heart className="h-5 w-5" />}
                    {selectedPayment === "bank" ? "Confirm donation" : `Donate ${money(total)}`}
                  </button>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-muted">
                    <Lock className="h-3.5 w-3.5" /> Secure payment · 100% donation policy · Privacy protected
                  </p>
                </>
              )}
            </div>
          </motion.div>

          {/* Right — sticky summary */}
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-1"
          >
            <div className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-token border border-gray-100 bg-white shadow-sm">
                {coverImg && (
                  <div className="relative h-36 w-full">
                    <img src={coverImg} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                )}
                <div className="p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">Program donation</p>
                  <h2 className="mt-1 font-heading text-lg font-bold leading-snug text-primary">{programData.title}</h2>

                  <div className="mt-5 space-y-3 border-t border-gray-100 pt-5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Your donation</span>
                      <span className="font-semibold text-primary">{money(donationAmount)}</span>
                    </div>

                    {/* Admin cost */}
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-text-muted">Admin contribution</p>
                          <p className="text-[11px] text-gray-400">Keeps our 100% donation policy</p>
                        </div>
                        <div className="inline-flex shrink-0 items-center rounded-token-btn border border-gray-200">
                          <button
                            type="button"
                            onClick={() => setAdminPct(Math.max(0, adminPct - 1))}
                            className="grid h-8 w-8 place-items-center text-primary transition-colors hover:bg-gray-100"
                            aria-label="Decrease admin contribution"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-12 text-center text-sm font-semibold text-primary">{adminPct}%</span>
                          <button
                            type="button"
                            onClick={() => setAdminPct(Math.min(20, adminPct + 1))}
                            className="grid h-8 w-8 place-items-center text-primary transition-colors hover:bg-gray-100"
                            aria-label="Increase admin contribution"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {adminPct > 0 && (
                        <p className="mt-1.5 flex items-center justify-end gap-1 text-xs text-text-muted">
                          <Info className="h-3 w-3" /> +{money(adminCost)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex items-baseline justify-between border-t border-gray-100 pt-5">
                    <span className="text-sm font-semibold text-primary">Total</span>
                    <span className="font-heading text-2xl font-bold text-primary">{money(total)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4 text-xs text-text-muted">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" /> Secure payment — every dollar goes to the program.
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      </section>
    </motion.div>
  );
}

export default function ProgramCheckout() {
  return <ProgramCheckoutInner />;
}
