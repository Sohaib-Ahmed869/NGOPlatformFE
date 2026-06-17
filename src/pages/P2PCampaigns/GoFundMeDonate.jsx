import { useState, useEffect, useRef, Fragment } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Loader2,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  User,
  Lock,
  Users,
  Target,
  EyeOff,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-hot-toast";
import GoFundMeService from "../../services/goFundMeService";
import HeroOverlay from "../../components/HeroOverlay";
import Celebration from "../../components/Celebration";
import useTenantStripe from "../../hooks/useTenantStripe";
import { useTenant } from "../../context/TenantContext";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../utils/cn";

const PRESETS = [25, 50, 100, 250, 500];
const money = (n) => `$${Number(n || 0).toLocaleString()}`;
const HERO_FALLBACK_BG =
  "linear-gradient(135deg, var(--tenant-primary, #2C2418), var(--tenant-primary-light, #4A3C2A))";

// Underline field style — matches the Contact Us form.
const fieldCls =
  "w-full rounded-token-input border-b border-gray-200 bg-transparent py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent disabled:opacity-60";

const STEPS = [
  { key: "amount", label: "Amount" },
  { key: "details", label: "Details" },
  { key: "payment", label: "Payment" },
];

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

/* Field label + input wrapper (Contact-style). */
function Field({ label, required, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

/* ── Stripe card step (mounted once a clientSecret exists) ────────────── */
function StripeCardStep({ value, onDone }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const pay = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required" });
      if (error) {
        toast.error(error.message || "Payment failed");
        setPaying(false);
        return;
      }
      if (paymentIntent && paymentIntent.status === "succeeded") {
        const res = await GoFundMeService.processDonation(paymentIntent.id);
        onDone(res);
      } else {
        toast.error("Payment was not completed");
        setPaying(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
      setPaying(false);
    }
  };

  return (
    <div className="space-y-5">
      <PaymentElement />
      <button
        onClick={pay}
        disabled={paying || !stripe}
        className="flex w-full items-center justify-center gap-2 rounded-token-btn bg-accent py-4 font-semibold text-white shadow-sm transition-colors hover:bg-accent-light disabled:opacity-50"
      >
        {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Heart className="h-5 w-5" />}
        Confirm donation · {money(value)}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
        <Lock className="h-3.5 w-3.5" /> Payments are encrypted and processed securely by Stripe
      </p>
    </div>
  );
}

export default function GoFundMeDonate() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const stripePromise = useTenantStripe();
  const { organisation } = useTenant();
  const { user } = useAuth();

  // Full-height parallax hero (hooks run unconditionally, before any return).
  const reduce = useReducedMotion();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-8%", "14%"]);
  const heroScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 1.1]);

  const passed = location.state?.campaign?.slug === slug ? location.state.campaign : null;
  const [campaign, setCampaign] = useState(passed);
  const [loading, setLoading] = useState(!passed);

  const [stepIdx, setStepIdx] = useState(0);
  const [amount, setAmount] = useState("");
  const [custom, setCustom] = useState("");
  const [form, setForm] = useState({
    donorName: user?.name || "",
    donorEmail: user?.email || "",
    message: "",
    isAnonymous: false,
  });
  const [method, setMethod] = useState("card"); // card | paypal
  const [clientSecret, setClientSecret] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (passed) return;
    let active = true;
    GoFundMeService.getCampaignBySlug(slug)
      .then((res) => active && setCampaign(res.goFundMe))
      .catch(() => active && toast.error("Fundraiser not found"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const value = parseFloat(custom || amount) || 0;
  const current = STEPS[stepIdx].key;
  const paypalClientId = organisation?.paypal?.clientId || import.meta.env.VITE_PAYPAL_CLIENT_ID || "";

  const pct = campaign && campaign.targetAmount > 0 ? Math.min(100, Math.round((campaign.currentAmount / campaign.targetAmount) * 100)) : 0;
  const remaining = campaign ? Math.max(0, campaign.targetAmount - campaign.currentAmount) : 0;
  const creator = campaign?.userId?.name || "a supporter";
  const canDonate = campaign && campaign.status === "approved" && campaign.isActive;

  const validateAmount = () => {
    if (value < 1) {
      toast.error("Enter a donation amount of at least $1");
      return false;
    }
    return true;
  };
  const validateDetails = () => {
    if (!form.donorName.trim()) {
      toast.error("Please enter your name");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(form.donorEmail)) {
      toast.error("Please enter a valid email");
      return false;
    }
    return true;
  };

  const donorPayload = () => ({
    amount: value,
    donorName: form.donorName.trim(),
    donorEmail: form.donorEmail.trim(),
    message: form.message.trim(),
    isAnonymous: form.isAnonymous,
  });

  // Amount → Details → Payment. The card PaymentIntent is created when leaving
  // the Details step so the card form is ready the moment Payment appears.
  const goNext = async () => {
    if (current === "amount") {
      if (!validateAmount()) return;
      setStepIdx(1);
      scrollTop();
      return;
    }
    if (current === "details") {
      if (!validateDetails()) return;
      if (method === "card") {
        if (!stripePromise) return toast.error("Card payments aren't configured for this organisation");
        setBusy(true);
        try {
          const res = await GoFundMeService.createPaymentIntent(campaign._id, donorPayload());
          setClientSecret(res.clientSecret);
          setStepIdx(2);
          scrollTop();
        } catch (err) {
          toast.error(err.response?.data?.message || "Could not start the payment");
        } finally {
          setBusy(false);
        }
      } else {
        setStepIdx(2);
        scrollTop();
      }
    }
  };

  const goBack = () => {
    if (current === "payment") {
      setClientSecret(null); // re-create the intent if amount/details change
      setStepIdx(1);
    } else if (current === "details") {
      setStepIdx(0);
    }
    scrollTop();
  };

  const finish = (res) => {
    setDone(res);
    toast.success("Thank you for your donation!");
    scrollTop();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {done && <Celebration />}
      {/* ── HERO (full-height, parallax) — must be a <section> so the navbar's
            "collapse past the hero" measurement targets it (it queries the first
            <section>), not the body below. ─────────────────────────────────── */}
      <section ref={heroRef} className="relative flex min-h-[100dvh] items-center overflow-hidden py-28">
        {campaign?.image ? (
          <motion.div style={{ y: heroY, scale: heroScale }} className="absolute -inset-y-[10%] inset-x-0 bg-primary will-change-transform">
            <img src={campaign.image} alt="" className="h-full w-full object-cover" />
            <HeroOverlay />
          </motion.div>
        ) : (
          <>
            <div className="absolute inset-0" style={{ background: HERO_FALLBACK_BG }} />
            <div className="absolute inset-0 bg-black/30" />
          </>
        )}

        <div className="relative z-10 mx-auto w-full max-w-5xl px-6">
          <Link
            to={`/p2p-campaigns/${slug}`}
            state={campaign ? { campaign } : undefined}
            className="group mb-6 flex w-fit items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to fundraiser
          </Link>

          {loading ? (
            <div className="space-y-4">
              <div className="h-5 w-32 animate-pulse bg-white/20" />
              <div className="h-10 w-2/3 max-w-xl animate-pulse bg-white/20" />
            </div>
          ) : !campaign ? (
            <div>
              <h1 className="font-heading text-4xl font-bold text-warm-cream md:text-5xl">Fundraiser not found</h1>
              <p className="mt-3 font-body text-warm-beige/70">This fundraiser may have been removed or is no longer available.</p>
            </div>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                <Heart className="h-3.5 w-3.5" /> {done ? "Donation complete" : "Make a donation"}
              </span>
              <h1 className="mt-4 max-w-3xl font-heading text-3xl font-bold leading-tight text-warm-cream md:text-5xl">
                {done ? "Thank you for your kindness" : campaign.title}
              </h1>
              {!done && <p className="mt-3 text-sm text-warm-beige/80">Organised by {creator}</p>}
            </>
          )}
        </div>
      </section>

      {/* ── BODY ──────────────────────────────────────────────────────── */}
      {!loading && campaign && (
        <section className="bg-background px-6 py-12 lg:py-16">
          <div className="mx-auto max-w-6xl">
            {done ? (
              <SuccessPanel campaign={campaign} value={value} slug={slug} receiptUrl={done?.donation?.stripeReceiptUrl} navigate={navigate} />
            ) : !canDonate ? (
              <StatusPanel
                title={campaign.status === "completed" ? "This fundraiser has reached its goal" : "Not accepting donations"}
                msg={
                  campaign.status === "completed"
                    ? "Thank you — this cause has been fully funded. Explore other fundraisers that still need your help."
                    : "This fundraiser isn't accepting donations right now. Please check back later."
                }
                slug={slug}
                campaign={campaign}
                navigate={navigate}
              />
            ) : (
              <div className="grid gap-8 lg:grid-cols-3">
                {/* ── Left: the stepped form ──────────────────────────── */}
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
                          <Step n={i + 1} label={s.label} active={i === stepIdx} done={i < stepIdx} />
                        </Fragment>
                      ))}
                    </div>

                    {/* Step 1 — Amount */}
                    {current === "amount" && (
                      <>
                        <Eyebrow icon={Heart}>Your donation</Eyebrow>
                        <p className="mt-2 text-sm text-text-muted">Choose an amount to give to this fundraiser.</p>
                        <div className="mt-5 grid grid-cols-3 gap-2.5">
                          {PRESETS.map((a) => (
                            <button
                              key={a}
                              type="button"
                              onClick={() => {
                                setAmount(String(a));
                                setCustom("");
                              }}
                              className={cn(
                                "rounded-token-btn py-3 text-sm font-semibold transition-all",
                                amount === String(a) && !custom
                                  ? "bg-accent text-white shadow-sm shadow-accent/25"
                                  : "border border-gray-200 text-primary hover:border-accent/40",
                              )}
                            >
                              ${a}
                            </button>
                          ))}
                        </div>
                        <div className="mt-6 max-w-xs">
                          <label className="mb-1 block text-sm font-medium text-gray-700">Or enter another amount</label>
                          <div className="relative">
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-base font-semibold text-text-muted">$</span>
                            <input
                              type="number"
                              min="1"
                              value={custom}
                              onChange={(e) => {
                                setCustom(e.target.value);
                                setAmount("");
                              }}
                              placeholder="Other amount"
                              className={cn(fieldCls, "pl-5 text-base")}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Step 2 — Details */}
                    {current === "details" && (
                      <>
                        <Eyebrow icon={User}>Your details</Eyebrow>
                        <div className="mt-5 space-y-5">
                          <Field label="Full name" required>
                            <input value={form.donorName} onChange={(e) => set("donorName", e.target.value)} placeholder="Your name" className={fieldCls} />
                          </Field>
                          <Field label="Email" required>
                            <input type="email" value={form.donorEmail} onChange={(e) => set("donorEmail", e.target.value)} placeholder="you@example.com — for your receipt" className={fieldCls} />
                          </Field>
                          <Field label="Message of support">
                            <textarea
                              rows={3}
                              value={form.message}
                              onChange={(e) => set("message", e.target.value)}
                              placeholder="Leave a message of support (optional)"
                              className={cn(fieldCls, "resize-none")}
                            />
                          </Field>
                          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-text-muted">
                            <input type="checkbox" checked={form.isAnonymous} onChange={(e) => set("isAnonymous", e.target.checked)} className="accent-accent" />
                            <EyeOff className="h-4 w-4" /> Donate anonymously
                          </label>
                        </div>

                        <div className="mt-8">
                          <Eyebrow icon={CreditCard}>How would you like to pay?</Eyebrow>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setMethod("card")}
                              className={cn(
                                "flex items-center justify-center gap-2 rounded-token-btn py-3 text-sm font-semibold transition-all",
                                method === "card" ? "bg-accent/10 text-accent ring-1 ring-accent/30" : "border border-gray-200 text-gray-600 hover:border-accent/40",
                              )}
                            >
                              <CreditCard className="h-4 w-4" /> Card
                            </button>
                            <button
                              type="button"
                              onClick={() => setMethod("paypal")}
                              className={cn(
                                "flex items-center justify-center gap-2 rounded-token-btn py-3 text-sm font-semibold transition-all",
                                method === "paypal" ? "bg-accent/10 text-accent ring-1 ring-accent/30" : "border border-gray-200 text-gray-600 hover:border-accent/40",
                              )}
                            >
                              PayPal
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Step 3 — Payment */}
                    {current === "payment" && (
                      <>
                        <Eyebrow icon={method === "card" ? CreditCard : Heart}>Payment</Eyebrow>
                        <p className="mt-2 text-sm text-text-muted">
                          {method === "card" ? "Enter your card details to complete your donation." : "Complete your donation securely with PayPal."}
                        </p>
                        <div className="mt-5">
                          {method === "card" ? (
                            clientSecret && stripePromise ? (
                              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                                <StripeCardStep value={value} onDone={finish} />
                              </Elements>
                            ) : (
                              <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
                                <Loader2 className="h-5 w-5 animate-spin" /> Preparing secure payment…
                              </div>
                            )
                          ) : paypalClientId ? (
                            <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "AUD" }}>
                              <PayPalButtons
                                style={{ layout: "vertical", color: "gold", shape: "rect" }}
                                forceReRender={[value]}
                                createOrder={async () => {
                                  const res = await GoFundMeService.createPayPalOrder(campaign._id, { amount: value });
                                  return res.id;
                                }}
                                onApprove={async (data) => {
                                  try {
                                    const res = await GoFundMeService.capturePayPalDonation(campaign._id, { orderID: data.orderID, ...donorPayload() });
                                    finish(res);
                                  } catch (err) {
                                    toast.error(err.response?.data?.message || "PayPal capture failed");
                                  }
                                }}
                                onError={() => toast.error("PayPal payment failed")}
                              />
                            </PayPalScriptProvider>
                          ) : (
                            <p className="bg-gray-50 p-3 text-center text-sm text-text-muted">PayPal isn't configured for this organisation.</p>
                          )}
                        </div>
                      </>
                    )}

                    {/* Navigation (hidden on payment — Stripe/PayPal own their CTA) */}
                    {current !== "payment" ? (
                      <div className="mt-8 flex items-center gap-3">
                        {stepIdx > 0 && (
                          <button
                            type="button"
                            onClick={goBack}
                            disabled={busy}
                            className="inline-flex items-center gap-2 rounded-token-btn border border-gray-200 bg-white px-5 py-4 text-sm font-semibold text-primary transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
                          >
                            <ArrowLeft className="h-4 w-4" /> Back
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={goNext}
                          disabled={busy}
                          className="flex flex-1 items-center justify-center gap-2 rounded-token-btn bg-accent py-4 font-semibold text-white shadow-sm transition-colors hover:bg-accent-light disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                          {current === "amount"
                            ? value >= 1
                              ? `Continue · ${money(value)}`
                              : "Continue"
                            : "Continue to payment"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={goBack}
                        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-primary"
                      >
                        <ArrowLeft className="h-4 w-4" /> Back to details
                      </button>
                    )}
                  </div>
                </motion.div>

                {/* ── Right: sticky campaign summary ──────────────────── */}
                {/* Plain column (no transform) — a CSS transform on a sticky
                    element's ancestor breaks position: sticky, so we don't wrap
                    this in a motion element that animates `y`. */}
                <aside className="lg:col-span-1">
                  <div className="lg:sticky lg:top-24">
                    <div className="overflow-hidden rounded-token border border-gray-100 bg-white shadow-sm">
                      {campaign.image && (
                        <div className="relative h-36 w-full">
                          <img src={campaign.image} alt="" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        </div>
                      )}
                      <div className="p-6">
                        <h2 className="font-heading text-lg font-bold leading-snug text-primary">{campaign.title}</h2>
                        <p className="mt-1 text-xs text-text-muted">by {creator}</p>

                        <div className="mt-4 flex items-end justify-between gap-2">
                          <span className="font-heading text-2xl font-bold text-accent">{money(campaign.currentAmount)}</span>
                          <span className="pb-1 text-xs text-text-muted">of {money(campaign.targetAmount)}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                          <span>{pct}% of goal</span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" /> {campaign.donationCount} donors
                          </span>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-5">
                          <span className="text-sm font-semibold text-primary">Your donation</span>
                          <span className="font-heading text-2xl font-bold text-primary">{value >= 1 ? money(value) : "—"}</span>
                        </div>
                        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-text-muted">
                          <Target className="h-3.5 w-3.5 text-accent" /> {money(remaining)} still needed to reach the goal
                        </p>
                      </div>

                      <div className="space-y-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4 text-xs text-text-muted">
                        <p className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-500" /> Secure payment — goes directly to the cause
                        </p>
                        <p className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Instant email receipt
                        </p>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </section>
      )}
    </motion.div>
  );
}

/* ── Full-width success confirmation ──────────────────────────────────── */
function SuccessPanel({ campaign, value, slug, receiptUrl, navigate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-xl rounded-token border border-gray-100 bg-white p-8 text-center shadow-sm sm:p-10"
    >
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-50">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <h2 className="font-heading text-2xl font-bold text-primary">Your donation is complete</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
        You gave <span className="font-semibold text-primary">{value >= 1 ? money(value) : "your gift"}</span> to{" "}
        <span className="font-medium text-primary">{campaign.title}</span>. A receipt is on its way — thank you for your generosity.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={() => navigate(`/p2p-campaigns/${slug}`)}
          className="rounded-token-btn bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
        >
          Back to fundraiser
        </button>
        <Link
          to="/p2p-campaigns"
          className="rounded-token-btn border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-primary transition-colors hover:border-accent/50 hover:text-accent"
        >
          Browse more fundraisers
        </Link>
      </div>

      {receiptUrl && (
        <a
          href={receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-accent"
        >
          <Receipt className="h-4 w-4" /> View payment receipt <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </motion.div>
  );
}

/* ── Centered status card (closed / completed) ────────────────────────── */
function StatusPanel({ title, msg, slug, campaign, navigate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-xl rounded-token border border-gray-100 bg-white p-8 text-center shadow-sm sm:p-10"
    >
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-50">
        <Heart className="h-8 w-8 text-emerald-600" />
      </div>
      <h2 className="font-heading text-2xl font-bold text-primary">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">{msg}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={() => navigate(`/p2p-campaigns/${slug}`, { state: { campaign } })}
          className="rounded-token-btn bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
        >
          Back to fundraiser
        </button>
        <Link
          to="/p2p-campaigns"
          className="rounded-token-btn border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-primary transition-colors hover:border-accent/50 hover:text-accent"
        >
          All fundraisers
        </Link>
      </div>
    </motion.div>
  );
}
