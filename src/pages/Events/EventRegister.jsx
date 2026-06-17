import { useState, useEffect, useMemo, Fragment } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "./event-phone.css";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Users,
  Ticket,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  User,
  Mail,
  Sparkles,
  CalendarCheck,
  Lock,
  Minus,
  Plus,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-hot-toast";
import axiosInstance from "../../services/axios";
import HeroOverlay from "../../components/HeroOverlay";
import Celebration from "../../components/Celebration";
import { useTenant } from "../../context/TenantContext";
import { useAuth } from "../../context/AuthContext";
import publicEventsService from "../../services/publicEvents.service";
import useTenantStripe from "../../hooks/useTenantStripe";
import CustomSelect from "../../components/CustomSelect";
import { cn } from "../../utils/cn";
import {
  IMG_FALLBACK,
  fmtDateRange,
  timeOf,
  fullLocationOf,
  resolveAudience,
  typeLabel,
} from "./eventHelpers";

const HERO_FALLBACK_BG =
  "linear-gradient(135deg, var(--tenant-primary, #2C2418), var(--tenant-primary-light, #4A3C2A))";

const inputCls =
  "w-full rounded-token-input border border-gray-200 bg-white px-4 py-3 text-sm text-primary outline-none transition-all placeholder:text-gray-400 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-gray-50";

// Small eyebrow chip used to label each form block (matches EventDetail).
function Eyebrow({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

// Contact input with a leading icon for a more polished feel.
function IconInput({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input {...props} className={cn(inputCls, "pl-10")} />
    </div>
  );
}

/* ── One custom registration question, rendered by type ───────────────── */
function QuestionField({ q, value, onChange, disabled }) {
  const label = (
    <label className="mb-1.5 block text-sm font-semibold text-primary">
      {q.label}
      {q.required && <span className="text-red-500"> *</span>}
    </label>
  );
  const help = q.help ? <p className="mt-1 text-xs text-text-muted">{q.help}</p> : null;

  if (q.type === "textarea") {
    return (
      <div>
        {label}
        <textarea
          rows={3}
          value={value || ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputCls, "resize-none")}
        />
        {help}
      </div>
    );
  }
  if (q.type === "select") {
    return (
      <div>
        {label}
        <CustomSelect
          value={value || ""}
          onChange={(v) => onChange(v)}
          options={q.options.map((o) => ({ value: o, label: o }))}
          placeholder="Select…"
          disabled={disabled}
          searchable={q.options.length > 8}
          className="w-full"
          triggerClassName={cn(inputCls, "justify-between")}
        />
        {help}
      </div>
    );
  }
  if (q.type === "checkbox") {
    const picked = Array.isArray(value) ? value : [];
    const toggle = (opt) =>
      onChange(picked.includes(opt) ? picked.filter((p) => p !== opt) : [...picked, opt]);
    return (
      <div>
        {label}
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.map((o) => (
            <label
              key={o}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-token-btn border px-3 py-2.5 text-sm transition-colors",
                picked.includes(o)
                  ? "border-accent bg-accent/5 text-primary"
                  : "border-gray-200 text-text-muted hover:border-accent/40",
              )}
            >
              <input
                type="checkbox"
                checked={picked.includes(o)}
                disabled={disabled}
                onChange={() => toggle(o)}
                className="accent-accent"
              />
              {o}
            </label>
          ))}
        </div>
        {help}
      </div>
    );
  }
  const type = q.type === "number" ? "number" : q.type === "email" ? "email" : q.type === "phone" ? "tel" : "text";
  return (
    <div>
      {label}
      <input type={type} value={value || ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      {help}
    </div>
  );
}

/* ── Stripe card step (mounted once a clientSecret exists) ────────────── */
function StripeCardStep({ eventId, total, currency, onDone }) {
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
        const res = await publicEventsService.confirmPayment(eventId, paymentIntent.id);
        onDone(res);
      } else {
        toast.error("Payment was not completed");
        setPaying(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Payment failed");
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
        {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
        Pay ${total.toFixed(2)} {currency} &amp; confirm
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
        <Lock className="h-3.5 w-3.5" /> Payments are encrypted and processed securely by Stripe
      </p>
    </div>
  );
}

export default function EventRegister() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { organisation } = useTenant();
  const { user } = useAuth();
  const stripePromise = useTenantStripe();
  const audiences = organisation?.eventAudiences || [];

  const passedEvent = location.state?.event?._id === id ? location.state.event : null;
  const [event, setEvent] = useState(passedEvent);
  const [loading, setLoading] = useState(!passedEvent);

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    numberOfGuests: 0,
  });
  const [answers, setAnswers] = useState({});
  const [clientSecret, setClientSecret] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (passedEvent) return;
    let active = true;
    (async () => {
      try {
        const res = await axiosInstance.get(`/events/${id}`);
        if (active) setEvent(res.data);
      } catch {
        console.error("Failed to fetch event");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Surface whether the signed-in visitor has already registered.
  useEffect(() => {
    if (!event || event.registrationMode !== "internal" || !user?.email) return;
    let active = true;
    publicEventsService
      .registrationStatus(id, user.email)
      .then((s) => {
        if (active && s?.registration && s.registration.rsvpStatus !== "cancelled") setAlreadyRegistered(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, event?.registrationMode, user?.email]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setAnswer = (key, v) => setAnswers((a) => ({ ...a, [key]: v }));

  const paid = !!(event?.isPaid && event.price > 0);
  const allowGuests = !!event?.allowGuests && (event?.maxGuestsPerRegistration || 0) > 0;
  const maxGuests = event?.maxGuestsPerRegistration || 0;
  const questions = useMemo(() => event?.registrationQuestions || [], [event]);

  // Wizard steps adapt to the event: details → [additional info] → [payment].
  const steps = useMemo(() => {
    const s = [{ key: "details", label: "Your details" }];
    if (questions.length > 0) s.push({ key: "questions", label: "Additional info" });
    if (paid) s.push({ key: "payment", label: "Payment" });
    return s;
  }, [questions.length, paid]);

  const audience = event ? resolveAudience(event, audiences) : null;
  const locationStr = event ? fullLocationOf(event) : "";
  const coverUrl = event?.imageUrl || "";
  const currency = event?.currency || "AUD";

  const seats = 1 + (Number(form.numberOfGuests) || 0);
  const total = paid ? event.price * seats : 0;
  const locked = busy;

  // Form steps exclude the payment step; the last form step triggers the action.
  const formStepCount = paid ? steps.length - 1 : steps.length;
  const current = steps[stepIdx]?.key || "details";
  const isLastFormStep = stepIdx === formStepCount - 1;

  const isPast =
    event &&
    (event.status === "completed" ||
      event.status === "cancelled" ||
      new Date(event.endDate || event.date) < new Date());
  const internal = event?.registrationMode === "internal";

  const validateDetails = () => {
    if (!form.name.trim()) return toast.error("Please enter your name"), false;
    if (!/\S+@\S+\.\S+/.test(form.email)) return toast.error("Please enter a valid email"), false;
    return true;
  };

  const validateQuestions = () => {
    for (const q of questions) {
      if (!q.required) continue;
      const v = answers[q.key];
      const empty = v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length);
      if (empty) return toast.error(`"${q.label}" is required`), false;
    }
    return true;
  };

  const validate = () => validateDetails() && validateQuestions();

  const payload = () => ({
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    numberOfGuests: allowGuests ? Number(form.numberOfGuests) || 0 : 0,
    answers,
  });

  const finish = (res) => {
    setDone(res);
    toast.success("You're registered!");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitFree = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      const res = await publicEventsService.register(event._id, payload());
      finish(res);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not complete your registration");
    } finally {
      setBusy(false);
    }
  };

  const startPayment = async () => {
    if (!validate()) return;
    if (!stripePromise) return toast.error("Card payments aren't set up for this organisation");
    setBusy(true);
    try {
      const res = await publicEventsService.createPaymentIntent(event._id, payload());
      setClientSecret(res.clientSecret);
      setStepIdx(steps.length - 1); // payment is always the final step
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not start the payment");
    } finally {
      setBusy(false);
    }
  };

  // Advance through the wizard, validating the current step first.
  const goNext = () => {
    if (current === "details" && !validateDetails()) return;
    if (current === "questions" && !validateQuestions()) return;
    if (isLastFormStep) {
      paid ? startPayment() : submitFree();
      return;
    }
    setStepIdx((i) => i + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    if (current === "payment") {
      setClientSecret(null); // re-create the intent if details/guests change
      setStepIdx(formStepCount - 1);
    } else {
      setStepIdx((i) => Math.max(0, i - 1));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // What blocks registration (direct URL access to a non-registerable event)?
  let block = null;
  if (event && !done && !alreadyRegistered) {
    if (!internal)
      block = { title: "Registration isn't available here", msg: "This event doesn't use online registration. Head back to the event page for details on how to take part." };
    else if (isPast)
      block = { title: "This event has ended", msg: "Registration is closed because the event has already taken place." };
    else if (!event.registrationOpenNow)
      block = event.isFull
        ? { title: "Fully booked", msg: "Every spot for this event has been filled. Check the event page for a waitlist or future dates." }
        : { title: "Registration is closed", msg: "Registration for this event isn't open right now. Please check back later." };
  }

  const metaRow = event && (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-warm-beige/80">
      <span className="inline-flex items-center gap-1.5">
        <Calendar className="h-4 w-4" /> {fmtDateRange(event.date, event.endDate)}
      </span>
      {timeOf(event) && (
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" /> {timeOf(event)}
        </span>
      )}
      {locationStr && (
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4" /> {locationStr}
        </span>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {done && <Celebration />}
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div data-hero className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden py-20 lg:py-28">
        {coverUrl ? (
          <div className="absolute inset-0">
            <img
              src={coverUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = IMG_FALLBACK;
              }}
            />
            <HeroOverlay />
          </div>
        ) : (
          <>
            <div className="absolute inset-0" style={{ background: HERO_FALLBACK_BG }} />
            <div className="absolute inset-0 bg-black/30" />
          </>
        )}

        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <Link
            to={`/events/${id}`}
            state={event ? { event } : undefined}
            className="group mb-6 flex w-fit items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to event
          </Link>

          {loading ? (
            <div className="space-y-4">
              <div className="h-5 w-32 animate-pulse bg-white/20" />
              <div className="h-10 w-2/3 max-w-xl animate-pulse bg-white/20" />
            </div>
          ) : !event ? (
            <div>
              <h1 className="font-heading text-4xl font-bold text-warm-cream md:text-5xl">Event not found</h1>
              <p className="mt-3 font-body text-warm-beige/70">This event may have been removed or is no longer available.</p>
            </div>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                <Ticket className="h-3.5 w-3.5" /> {done ? "Registration confirmed" : "Registration"}
              </span>
              <h1 className="mt-4 max-w-3xl font-heading text-3xl font-bold leading-tight text-warm-cream md:text-5xl">
                {done ? "You're all set!" : event.title}
              </h1>
              {!done && <div className="mt-5">{metaRow}</div>}
            </>
          )}
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────── */}
      {!loading && event && (
        <section className="bg-background px-6 py-12 lg:py-16">
          <div className="mx-auto max-w-6xl">
            {done ? (
              <SuccessPanel event={event} total={total} currency={currency} paid={paid} guests={Number(form.numberOfGuests) || 0} receiptUrl={done?.registration?.stripeReceiptUrl} navigate={navigate} id={id} />
            ) : alreadyRegistered ? (
              <StatusPanel
                icon={CheckCircle2}
                tone="emerald"
                title="You're already registered"
                msg={`You're on the list for ${event.title}. We've emailed your confirmation — we can't wait to see you there.`}
                id={id}
                event={event}
                navigate={navigate}
              />
            ) : block ? (
              <StatusPanel icon={Lock} tone="gray" title={block.title} msg={block.msg} id={id} event={event} navigate={navigate} />
            ) : (
              <div className="grid gap-8 lg:grid-cols-3">
                {/* ── Left: the form ──────────────────────────────────── */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="lg:col-span-2"
                >
                  <div className="rounded-token border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                    {/* Step indicator */}
                    {steps.length > 1 && (
                      <div className="mb-7 flex items-center gap-2 sm:gap-3">
                        {steps.map((s, i) => (
                          <Fragment key={s.key}>
                            {i > 0 && <span className="h-px flex-1 bg-gray-200" />}
                            <Step n={i + 1} label={s.label} active={i === stepIdx} done={i < stepIdx} />
                          </Fragment>
                        ))}
                      </div>
                    )}

                    {current === "details" && (
                      <>
                        {/* Your details */}
                        <Eyebrow icon={User}>Your details</Eyebrow>
                        <div className="mt-4 space-y-4">
                          <div>
                            <label className="mb-1.5 block text-sm font-semibold text-primary">
                              Full name <span className="text-red-500">*</span>
                            </label>
                            <IconInput
                              icon={User}
                              value={form.name}
                              disabled={locked}
                              onChange={(e) => set("name", e.target.value)}
                              placeholder="Your name"
                            />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-1.5 block text-sm font-semibold text-primary">
                                Email <span className="text-red-500">*</span>
                              </label>
                              <IconInput
                                icon={Mail}
                                type="email"
                                value={form.email}
                                disabled={locked}
                                onChange={(e) => set("email", e.target.value)}
                                placeholder="you@example.com"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-sm font-semibold text-primary">Phone</label>
                              <div className="event-phone">
                                <PhoneInput
                                  country="au"
                                  value={(form.phone || "").replace(/^\+/, "")}
                                  onChange={(val) => set("phone", val ? `+${val}` : "")}
                                  enableSearch
                                  countryCodeEditable={false}
                                  disabled={locked}
                                  placeholder="Optional"
                                  inputProps={{ name: "phone" }}
                                />
                              </div>
                            </div>
                          </div>

                          {allowGuests && (
                            <div>
                              <label className="mb-1.5 block text-sm font-semibold text-primary">
                                Bringing guests? <span className="font-normal text-text-muted">(up to {maxGuests})</span>
                              </label>
                              <div className="inline-flex items-center gap-2 rounded-token-btn border border-gray-200 p-1.5">
                                <button
                                  type="button"
                                  disabled={locked || form.numberOfGuests <= 0}
                                  onClick={() => set("numberOfGuests", Math.max(0, form.numberOfGuests - 1))}
                                  className="grid h-9 w-9 place-items-center text-primary transition-colors hover:bg-gray-100 disabled:opacity-40"
                                  aria-label="Remove guest"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="w-10 text-center text-base font-semibold text-primary">{form.numberOfGuests}</span>
                                <button
                                  type="button"
                                  disabled={locked || form.numberOfGuests >= maxGuests}
                                  onClick={() => set("numberOfGuests", Math.min(maxGuests, form.numberOfGuests + 1))}
                                  className="grid h-9 w-9 place-items-center text-primary transition-colors hover:bg-gray-100 disabled:opacity-40"
                                  aria-label="Add guest"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                              <p className="mt-1.5 text-xs text-text-muted">
                                {seats} {seats === 1 ? "seat" : "seats"} total{paid ? " — guests are charged at the same rate" : ""}.
                              </p>
                            </div>
                          )}
                        </div>

                      </>
                    )}

                    {current === "questions" && (
                      <>
                        <Eyebrow icon={Sparkles}>A few more details</Eyebrow>
                        <p className="mt-2 text-sm text-text-muted">
                          Help the organiser prepare — these apply to your whole party.
                        </p>
                        <div className="mt-5 space-y-4">
                          {questions.map((q) => (
                            <QuestionField key={q.key} q={q} value={answers[q.key]} disabled={locked} onChange={(v) => setAnswer(q.key, v)} />
                          ))}
                        </div>
                      </>
                    )}

                    {current === "payment" && (
                      <>
                        <button
                          type="button"
                          onClick={goBack}
                          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-primary"
                        >
                          <ArrowLeft className="h-4 w-4" /> Edit details
                        </button>
                        <Eyebrow icon={CreditCard}>Payment</Eyebrow>
                        <div className="mt-5">
                          {stripePromise && (
                            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                              <StripeCardStep eventId={event._id} total={total} currency={currency} onDone={finish} />
                            </Elements>
                          )}
                        </div>
                      </>
                    )}

                    {/* Navigation (hidden on the payment step — Stripe owns its CTA) */}
                    {current !== "payment" && (
                      <>
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
                            {busy ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : !isLastFormStep ? (
                              <ArrowRight className="h-5 w-5" />
                            ) : paid ? (
                              <CreditCard className="h-5 w-5" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5" />
                            )}
                            {!isLastFormStep
                              ? "Continue"
                              : paid
                              ? `Continue to payment · $${total.toFixed(2)} ${currency}`
                              : "Confirm registration"}
                          </button>
                        </div>
                        {isLastFormStep && (
                          <p className="mt-3 text-center text-xs text-text-muted">
                            {paid
                              ? "You won't be charged until you confirm payment on the next step."
                              : "A confirmation email will be sent as soon as you register."}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>

                {/* ── Right: sticky summary ───────────────────────────── */}
                <motion.aside
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="lg:col-span-1"
                >
                  <div className="lg:sticky lg:top-24">
                    <div className="overflow-hidden rounded-token border border-gray-100 bg-white shadow-sm">
                      {coverUrl && (
                        <div className="relative h-36 w-full">
                          <img
                            src={coverUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = IMG_FALLBACK;
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          {audience && (
                            <span
                              className="absolute left-3 top-3 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white"
                              style={{ backgroundColor: audience.color }}
                            >
                              {audience.label}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="p-6">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">{typeLabel(event)}</p>
                        <h2 className="mt-1 font-heading text-lg font-bold leading-snug text-primary">{event.title}</h2>

                        <div className="mt-4 space-y-2.5 text-sm">
                          <p className="flex items-start gap-2.5 text-text-muted">
                            <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {fmtDateRange(event.date, event.endDate)}
                          </p>
                          {timeOf(event) && (
                            <p className="flex items-start gap-2.5 text-text-muted">
                              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                              {[timeOf(event), event.timezone].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          {locationStr && (
                            <p className="flex items-start gap-2.5 text-text-muted">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {locationStr}
                            </p>
                          )}
                        </div>

                        {/* Price breakdown */}
                        <div className="mt-5 border-t border-gray-100 pt-5">
                          {paid ? (
                            <>
                              <div className="flex items-center justify-between text-sm text-text-muted">
                                <span>
                                  ${event.price} {currency} × {seats} {seats === 1 ? "seat" : "seats"}
                                </span>
                                <span className="text-primary">${total.toFixed(2)}</span>
                              </div>
                              <div className="mt-3 flex items-baseline justify-between border-t border-gray-100 pt-3">
                                <span className="text-sm font-semibold text-primary">Total</span>
                                <span className="font-heading text-2xl font-bold text-primary">
                                  ${total.toFixed(2)} <span className="text-sm font-normal text-text-muted">{currency}</span>
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-baseline justify-between">
                              <span className="text-sm font-semibold text-primary">Entry</span>
                              <span className="font-heading text-2xl font-bold text-primary">Free</span>
                            </div>
                          )}
                        </div>

                        {event.spotsLeft != null && event.spotsLeft > 0 && (
                          <p className="mt-4 inline-flex items-center gap-1.5 bg-accent/5 px-2.5 py-1 text-xs font-medium text-accent">
                            <Users className="h-3.5 w-3.5" /> Only {event.spotsLeft} spot{event.spotsLeft === 1 ? "" : "s"} left
                          </p>
                        )}
                      </div>

                      {/* Trust strip */}
                      <div className="space-y-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4 text-xs text-text-muted">
                        <p className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Instant email confirmation
                        </p>
                        {paid && (
                          <p className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Secure card payment via Stripe
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.aside>
              </div>
            )}
          </div>
        </section>
      )}
    </motion.div>
  );
}

/* ── Step pill for the paid-event progress indicator ──────────────────── */
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

/* ── Full-width success confirmation ──────────────────────────────────── */
function SuccessPanel({ event, total, currency, paid, guests, receiptUrl, navigate, id }) {
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
      <h2 className="font-heading text-2xl font-bold text-primary">See you there!</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
        Your spot for <span className="font-medium text-primary">{event.title}</span> is confirmed
        {paid ? ` — $${total.toFixed(2)} ${currency} paid` : ""}. A confirmation email is on its way.
      </p>

      <div className="mt-6 space-y-2.5 border-y border-gray-100 py-5 text-left text-sm">
        <p className="flex items-center gap-2.5 text-text-muted">
          <CalendarCheck className="h-4 w-4 shrink-0 text-accent" /> {fmtDateRange(event.date, event.endDate)}
          {timeOf(event) ? ` · ${timeOf(event)}` : ""}
        </p>
        {fullLocationOf(event) && (
          <p className="flex items-center gap-2.5 text-text-muted">
            <MapPin className="h-4 w-4 shrink-0 text-accent" /> {fullLocationOf(event)}
          </p>
        )}
        {guests > 0 && (
          <p className="flex items-center gap-2.5 text-text-muted">
            <Users className="h-4 w-4 shrink-0 text-accent" /> +{guests} guest{guests > 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={() => navigate(`/events/${id}`, { state: { event } })}
          className="rounded-token-btn bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
        >
          Back to event
        </button>
        <Link
          to="/events"
          className="rounded-token-btn border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-primary transition-colors hover:border-accent/50 hover:text-accent"
        >
          Browse more events
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

/* ── Centered status card (already registered / closed / past) ────────── */
function StatusPanel({ icon: Icon, tone, title, msg, id, event, navigate }) {
  const toneCls = tone === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-xl rounded-token border border-gray-100 bg-white p-8 text-center shadow-sm sm:p-10"
    >
      <div className={cn("mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full", toneCls)}>
        <Icon className="h-8 w-8" />
      </div>
      <h2 className="font-heading text-2xl font-bold text-primary">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">{msg}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={() => navigate(`/events/${id}`, { state: { event } })}
          className="rounded-token-btn bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
        >
          Back to event
        </button>
        <Link
          to="/events"
          className="rounded-token-btn border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-primary transition-colors hover:border-accent/50 hover:text-accent"
        >
          All events
        </Link>
      </div>
    </motion.div>
  );
}
