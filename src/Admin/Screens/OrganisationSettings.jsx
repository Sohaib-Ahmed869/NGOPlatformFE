import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import {
  Loader2,
  Check,
  RotateCcw,
  Building2,
  Mail,
  Globe,
  MapPin,
  Share2,
  Landmark,
  Hash,
  CreditCard,
  User as UserIcon,
  ShieldCheck,
  PlugZap,
  Trash2,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
  Lock,
  ArrowRight,
  Send,
  Wallet,
  CalendarDays,
} from "lucide-react";
import { toast } from "react-hot-toast";
import settingsService from "../../services/settings.service";
import paymentService from "../../services/payment.service";
import EmailSettings from "./EmailSettings";
import MailchimpSettings from "./MailchimpSettings";
import PaypalSettings from "./PaypalSettings";
import EventSettings from "./EventSettings";
import { useTenant } from "../../context/TenantContext";
import { TabLoader } from "../../components/TabLoader";
import { SOCIAL_META, SOCIAL_ICON_PATHS } from "../../config/socialIcons";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "./phone-input.css";
import { cn } from "../../utils/cn";
import { withMinDelay } from "../../utils/minDelay";

const ACCENT_GRADIENT = "linear-gradient(135deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))";

const ADDRESS_KEYS = ["addrLine1", "addrLine2", "addrCity", "addrState", "addrPostcode", "addrCountry"];
const SOCIAL_FORM_KEYS = SOCIAL_META.map((m) => m.formKey);
const FIELD_KEYS = [
  "contactEmail", "contactPhone", "website",
  ...ADDRESS_KEYS,
  ...SOCIAL_FORM_KEYS,
  "bankName", "bsb", "accountNumber", "accountName",
];
const pickForm = (f) => FIELD_KEYS.reduce((acc, k) => ({ ...acc, [k]: f[k] }), {});

const EMPTY_FORM = FIELD_KEYS.reduce((acc, k) => ({ ...acc, [k]: "" }), {});

// Stable leading-icon components for each social brand glyph (built once so the
// inputs don't remount on every keystroke).
const SOCIAL_ICON_COMPONENTS = SOCIAL_META.reduce((acc, m) => {
  acc[m.key] = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={SOCIAL_ICON_PATHS[m.key]} />
    </svg>
  );
  return acc;
}, {});

// Map the raw settings payload → the screen's flat form shape.
function toForm(d = {}) {
  const a = d.addressDetails || {};
  const s = d.socialLinks || {};
  const out = {
    contactEmail: d.contactEmail || "",
    contactPhone: d.contactPhone || "",
    website: d.website || "",
    addrLine1: a.line1 || d.address || "", // migrate legacy single-line into line 1
    addrLine2: a.line2 || "",
    addrCity: a.city || "",
    addrState: a.state || "",
    addrPostcode: a.postalCode || "",
    addrCountry: a.country || "",
    bankName: d.bankDetails?.bankName || "",
    bsb: d.bankDetails?.bsb || "",
    accountNumber: d.bankDetails?.accountNumber || "",
    accountName: d.bankDetails?.accountName || "",
  };
  SOCIAL_META.forEach((m) => { out[m.formKey] = s[m.key] || ""; });
  return out;
}

const TABS = [
  { id: "contact", label: "Contact", desc: "Reach you & find you online", icon: Building2 },
  { id: "payments", label: "Card Payments", desc: "Stripe", icon: CreditCard },
  { id: "paypal", label: "PayPal", desc: "PayPal donations", icon: Wallet },
  { id: "bank", label: "Bank Transfer", desc: "Donor bank details", icon: Landmark },
  { id: "email", label: "Email", desc: "Send from your own SMTP", icon: Mail },
  { id: "mailchimp", label: "Mailchimp", desc: "Newsletter audience", icon: Send },
  { id: "events", label: "Events", desc: "Audience labels & colours", icon: CalendarDays },
];

// Sub-sections inside the Contact tab (segmented switch).
const CONTACT_SUBS = [
  { id: "info", label: "Contact info", icon: Building2 },
  { id: "address", label: "Address", icon: MapPin },
  { id: "social", label: "Social", icon: Share2 },
];

/* ── small pieces ─────────────────────────────────────────────────────────── */

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

// Underline labelled field with an optional leading icon (simple text settings).
function Field({ icon: Icon, label, value, onChange, placeholder, type = "text", hint }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </label>
      <div className="flex items-center gap-2.5 border-b border-gray-200 transition-colors focus-within:border-accent">
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-gray-400" /> : null}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-transparent py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400"
        />
      </div>
      {hint ? <p className="mt-1.5 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

// Stripe webhook events we recommend registering.
const RECOMMENDED_EVENTS = [
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
];

// Boxed, monospace key/secret field with optional show/hide + format hint.
function KeyInput({ label, value, onChange, placeholder, secret = false, saved, hint, prefix }) {
  const [show, setShow] = useState(false);
  const invalid = value && prefix && !value.startsWith(prefix);
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-primary">
        {label}
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs font-normal text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> saved
          </span>
        )}
      </label>
      <div className={cn(
        "flex items-center gap-2 border bg-gray-50 px-3 transition-colors focus-within:bg-white",
        invalid ? "border-amber-300 focus-within:border-amber-400" : "border-gray-200 focus-within:border-accent",
      )}>
        <input
          type={secret && !show ? "password" : "text"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="w-full bg-transparent py-2.5 font-mono text-sm text-gray-800 outline-none placeholder:text-gray-400"
        />
        {secret && (
          <button type="button" tabIndex={-1} onClick={() => setShow((s) => !s)} className="shrink-0 text-gray-400 transition-colors hover:text-gray-600" aria-label={show ? "Hide" : "Show"}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {invalid ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {label} usually start with <code className="font-mono">{prefix}</code>
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

// Horizontal progress stepper for the Stripe setup journey — circles joined by
// connecting lines (labels sit absolutely below so the lines run circle-to-circle).
function Stepper({ steps }) {
  return (
    <div className="flex items-start pb-6">
      {steps.map((s, i) => (
        <React.Fragment key={s.label}>
          <div className="relative flex shrink-0 items-center justify-center">
            <div className={cn(
              "grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold transition-colors",
              s.done ? "border-accent bg-accent text-white" : "border-gray-200 bg-white text-gray-400",
            )}>
              {s.done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn("absolute left-1/2 top-9 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium", s.done ? "text-primary" : "text-gray-400")}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn("mx-2 mt-[15px] h-0.5 flex-1 rounded-full transition-colors", s.done ? "bg-accent" : "bg-gray-200")} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── main ─────────────────────────────────────────────────────────────────── */

export default function OrganisationSettings() {
  const { slug } = useTenant();
  const webhookUrl = `${import.meta.env.VITE_API_BASE_URL}/api/webhooks/stripe/${slug || ""}`;
  const [searchParams] = useSearchParams();

  // Hydrate from the session caches so revisits are instant (no loader/flicker).
  const cachedSettings = settingsService.getCached();
  const cachedPay = paymentService.getCachedConfig();

  const [loading, setLoading] = useState(!cachedSettings);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get("tab");
    return TABS.some((x) => x.id === t) ? t : "contact";
  });
  const [contactSub, setContactSub] = useState("info");

  const [form, setForm] = useState(cachedSettings ? toForm(cachedSettings) : EMPTY_FORM);
  const savedRef = useRef(cachedSettings ? pickForm(toForm(cachedSettings)) : null);

  // ── Stripe (card payments) — its own state + save flow ──
  const [payConfig, setPayConfig] = useState(cachedPay || null);
  const [payLoading, setPayLoading] = useState(!cachedPay);
  const [paySaving, setPaySaving] = useState(false);
  const [payTesting, setPayTesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [publishableKey, setPublishableKey] = useState(cachedPay?.publishableKey || "");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const loadSettings = async () => {
    try {
      setLoading(true);
      const d = await withMinDelay(settingsService.getSettings());
      const next = toForm(d);
      setForm(next);
      savedRef.current = pickForm(next);
    } catch (err) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const loadPayment = async ({ force = false } = {}) => {
    try {
      setPayLoading(true);
      const d = await paymentService.getConfig({ force });
      setPayConfig(d);
      setPublishableKey(d.publishableKey || "");
    } catch {
      toast.error("Failed to load payment settings");
    } finally {
      setPayLoading(false);
    }
  };

  useEffect(() => {
    // Cached per session → only fetch (and show the loader) on first visit.
    if (!settingsService.getCached()) loadSettings();
    if (!paymentService.getCachedConfig()) loadPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty =
    savedRef.current && JSON.stringify(pickForm(form)) !== JSON.stringify(savedRef.current);

  const up = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updateSettings({
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        website: form.website,
        addressDetails: {
          line1: form.addrLine1,
          line2: form.addrLine2,
          city: form.addrCity,
          state: form.addrState,
          postalCode: form.addrPostcode,
          country: form.addrCountry,
        },
        socialLinks: SOCIAL_META.reduce((acc, m) => ({ ...acc, [m.key]: form[m.formKey] }), {}),
        bankDetails: {
          bankName: form.bankName,
          bsb: form.bsb,
          accountNumber: form.accountNumber,
          accountName: form.accountName,
        },
      });
      savedRef.current = pickForm(form);
      toast.success("Settings saved");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (savedRef.current) setForm((p) => ({ ...p, ...savedRef.current }));
    toast("Reverted unsaved changes", { icon: "↩️" });
  };

  // ── Stripe handlers ──
  const savePayment = async () => {
    setPaySaving(true);
    try {
      const res = await paymentService.updateConfig({
        publishableKey,
        secretKey: secretKey || undefined,
        webhookSecret: webhookSecret || undefined,
      });
      setPayConfig(res.data.config);
      setSecretKey("");
      setWebhookSecret("");
      toast.success("Stripe keys saved");
    } catch (e) {
      toast.error(e.response?.data?.error || "Save failed");
    } finally {
      setPaySaving(false);
    }
  };

  const testPayment = async () => {
    setPayTesting(true);
    try {
      const res = await paymentService.testConnection({ secretKey: secretKey || undefined });
      toast.success(`Connected: ${res.data.accountLabel}`);
      loadPayment({ force: true });
    } catch (e) {
      toast.error(e.response?.data?.error || "Connection failed");
    } finally {
      setPayTesting(false);
    }
  };

  // One smooth action: persist the keys, then verify the connection.
  const saveAndVerify = async () => {
    setVerifying(true);
    try {
      await paymentService.updateConfig({
        publishableKey,
        secretKey: secretKey || undefined,
        webhookSecret: webhookSecret || undefined,
      });
      const res = await paymentService.testConnection({ secretKey: secretKey || undefined });
      setSecretKey("");
      setWebhookSecret("");
      await loadPayment({ force: true });
      toast.success(`Connected — ${res.data.accountLabel}`);
    } catch (e) {
      toast.error(e.response?.data?.error || "Couldn't verify — double-check your keys");
    } finally {
      setVerifying(false);
    }
  };

  const togglePaymentEnabled = async () => {
    try {
      const res = await paymentService.updateConfig({ enabled: !payConfig.enabled });
      setPayConfig(res.data.config);
      toast.success(res.data.config.enabled ? "Payments enabled" : "Payments disabled");
    } catch (e) {
      toast.error(e.response?.data?.error || "Update failed");
    }
  };

  const clearPayment = async () => {
    if (!window.confirm("Remove your Stripe keys and disable payments?")) return;
    try {
      await paymentService.clearConfig();
      toast.success("Stripe keys cleared");
      setSecretKey("");
      setWebhookSecret("");
      loadPayment({ force: true });
    } catch {
      toast.error("Failed to clear");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <TabLoader label="Loading settings…" />
      </div>
    );
  }

  // Stripe setup journey — drives the status hero + stepper.
  const keyMode = publishableKey.startsWith("pk_live_")
    ? "live"
    : publishableKey.startsWith("pk_test_")
    ? "test"
    : null;
  const payStatus = payConfig?.enabled
    ? "live"
    : payConfig?.lastVerifiedAt
    ? "ready"
    : payConfig?.hasSecretKey
    ? "unverified"
    : "empty";
  const paySteps = [
    { label: "Add keys", done: !!payConfig?.hasSecretKey },
    { label: "Verify", done: !!payConfig?.lastVerifiedAt },
    { label: "Webhook", done: !!payConfig?.hasWebhookSecret },
    { label: "Go live", done: !!payConfig?.enabled },
  ];

  return (
    <div className="w-full space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Organisation Settings</h1>
          <p className="mt-1 text-sm text-text-muted">
            Contact details and how you collect donations — card payments and bank transfer.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="hidden items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-40 sm:inline-flex"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Two-column: tab rail + content */}
      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Tab rail */}
        <nav className="overflow-hidden border border-gray-100 bg-white shadow-sm lg:sticky lg:top-24">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  active ? "text-white" : "text-gray-600 hover:bg-gray-50",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="orgSettingsTabActive"
                    className="absolute inset-0 z-0"
                    style={{ background: ACCENT_GRADIENT }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  >
                    <span className="absolute inset-y-0 left-0 w-1 bg-accent" />
                  </motion.span>
                ) : null}
                <Icon className={cn("relative z-[1] h-[18px] w-[18px] shrink-0 transition-colors duration-300", active ? "text-white" : "text-gray-400")} />
                <span className="relative z-[1] min-w-0 flex-1">
                  <span className={cn("block text-sm font-semibold leading-tight transition-colors duration-300", active ? "text-white" : "text-gray-700")}>{t.label}</span>
                  <span className={cn("block text-[11px] leading-tight transition-colors duration-300", active ? "text-white/70" : "text-gray-400")}>{t.desc}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {/* ── CONTACT ── */}
              {activeTab === "contact" && (
                <>
                  <SectionHead
                    icon={Building2}
                    title="Contact details"
                    desc="How supporters reach you and find you online — shown in the footer, contact page and receipts."
                  />

                  {/* Segmented sub-switch — sliding accent indicator + icons */}
                  <div className="mb-7 inline-flex gap-1 border border-gray-200 bg-gray-50 p-1">
                    {CONTACT_SUBS.map((s) => {
                      const SubIcon = s.icon;
                      const active = contactSub === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setContactSub(s.id)}
                          aria-pressed={active}
                          className={cn(
                            "relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-300",
                            active ? "text-white" : "text-text-muted hover:text-primary",
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId="contactSubActive"
                              className="absolute inset-0 z-0"
                              style={{ background: ACCENT_GRADIENT }}
                              transition={{ type: "spring", stiffness: 380, damping: 32 }}
                            />
                          )}
                          <SubIcon className="relative z-[1] h-4 w-4 shrink-0" />
                          <span className="relative z-[1]">{s.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={contactSub}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      {/* Contact info */}
                      {contactSub === "info" && (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          <Field icon={Mail} label="Email address" type="email" value={form.contactEmail} onChange={(e) => up("contactEmail", e.target.value)} placeholder="info@yourcharity.org" />
                          <div>
                            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Phone number</label>
                            <PhoneInput
                              country="au"
                              value={(form.contactPhone || "").replace(/^\+/, "")}
                              onChange={(val) => up("contactPhone", val ? `+${val}` : "")}
                              enableSearch
                              countryCodeEditable={false}
                              inputProps={{ name: "contactPhone" }}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Field icon={Globe} label="Website" type="url" value={form.website} onChange={(e) => up("website", e.target.value)} placeholder="https://www.yourcharity.org" />
                          </div>
                        </div>
                      )}

                      {/* Address */}
                      {contactSub === "address" && (
                        <>
                          <p className="mb-5 text-xs text-text-muted">Where you're based — shown formatted in the footer and on receipts.</p>
                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <Field label="Street address" value={form.addrLine1} onChange={(e) => up("addrLine1", e.target.value)} placeholder="123 Charity Lane" />
                            </div>
                            <div className="sm:col-span-2">
                              <Field label="Address line 2 (optional)" value={form.addrLine2} onChange={(e) => up("addrLine2", e.target.value)} placeholder="Suite, unit, building…" />
                            </div>
                            <Field label="City / Suburb" value={form.addrCity} onChange={(e) => up("addrCity", e.target.value)} placeholder="Sydney" />
                            <Field label="State / Region" value={form.addrState} onChange={(e) => up("addrState", e.target.value)} placeholder="NSW" />
                            <Field label="Postcode" value={form.addrPostcode} onChange={(e) => up("addrPostcode", e.target.value)} placeholder="2000" />
                            <Field label="Country" value={form.addrCountry} onChange={(e) => up("addrCountry", e.target.value)} placeholder="Australia" />
                          </div>
                        </>
                      )}

                      {/* Social */}
                      {contactSub === "social" && (
                        <>
                          <p className="mb-5 text-xs text-text-muted">Optional — only the ones you fill in appear in your footer and on the contact page.</p>
                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            {SOCIAL_META.map((m) => (
                              <Field
                                key={m.formKey}
                                icon={SOCIAL_ICON_COMPONENTS[m.key]}
                                label={m.label}
                                value={form[m.formKey]}
                                onChange={(e) => up(m.formKey, e.target.value)}
                                placeholder={m.placeholder}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </>
              )}

              {/* ── CARD PAYMENTS (Stripe) ── */}
              {activeTab === "payments" && (
                <>
                  <SectionHead
                    icon={CreditCard}
                    title="Card payments"
                    desc="Connect your own Stripe account so donations land directly in it. Your secret key is encrypted and never shown again after saving."
                  />

                  {payLoading || !payConfig ? (
                    <div className="flex items-center justify-center border border-gray-100 bg-gray-50 py-12 text-gray-400">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Progress journey */}
                      <Stepper steps={paySteps} />

                      {/* Status hero — tells the user exactly where they are + what's next */}
                      {payStatus === "live" && (
                        <div className="flex flex-wrap items-center gap-3 border border-accent/40 bg-accent/10 p-4">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-white">
                            <ShieldCheck className="h-5 w-5" />
                          </span>
                          <div className="min-w-[180px] flex-1 text-sm">
                            <div className="font-semibold text-primary">You're live — accepting card donations</div>
                            <div className="text-text-muted">
                              {payConfig.accountLabel || "Stripe account"}
                              {payConfig.lastVerifiedAt ? ` · verified ${new Date(payConfig.lastVerifiedAt).toLocaleDateString()}` : ""}
                            </div>
                          </div>
                          <button onClick={togglePaymentEnabled} className="shrink-0 border border-accent/40 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10">
                            Turn off
                          </button>
                        </div>
                      )}
                      {payStatus === "ready" && (
                        <div className="flex flex-wrap items-center gap-3 border border-accent/30 bg-accent/5 p-4">
                          <CheckCircle2 className="h-6 w-6 shrink-0 text-accent" />
                          <div className="min-w-[180px] flex-1 text-sm">
                            <div className="font-semibold text-primary">Connection verified — you're ready to go live</div>
                            <div className="text-text-muted">{payConfig.accountLabel || "Stripe account"} · turn on payments to start accepting donations.</div>
                          </div>
                          <button onClick={togglePaymentEnabled} className="inline-flex shrink-0 items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
                            Turn on payments <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      {payStatus === "unverified" && (
                        <div className="flex items-start gap-3 border border-blue-200 bg-blue-50 p-4 text-sm">
                          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                          <p className="text-blue-800">Your keys are saved. Press <span className="font-semibold">Save &amp; verify</span> below to confirm the connection, then you can go live.</p>
                        </div>
                      )}
                      {payStatus === "empty" && (
                        <div className="flex items-start gap-3 border border-gray-200 bg-gray-50 p-4 text-sm">
                          <PlugZap className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                          <p className="text-text-muted">
                            Connect your own Stripe account to accept card donations — the money goes straight to you, we never touch it.{" "}
                            <a href="https://dashboard.stripe.com/register" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
                              Create a free Stripe account <ExternalLink className="h-3 w-3" />
                            </a>
                          </p>
                        </div>
                      )}

                      {/* Step 1 — API keys */}
                      <div className="border border-gray-100 p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/10 text-xs font-bold text-accent">1</span>
                            Your Stripe API keys
                            {keyMode && (
                              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", keyMode === "live" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                                {keyMode} mode
                              </span>
                            )}
                          </h3>
                          <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                            Where do I find these? <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="space-y-4">
                          <KeyInput label="Publishable key" prefix="pk_" value={publishableKey} onChange={(e) => setPublishableKey(e.target.value)} placeholder="pk_live_…" />
                          <KeyInput
                            label="Secret key" secret prefix="sk_" saved={payConfig.hasSecretKey}
                            value={secretKey} onChange={(e) => setSecretKey(e.target.value)}
                            placeholder={payConfig.hasSecretKey ? "•••••••• saved — leave blank to keep" : "sk_live_…"}
                          />
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-text-muted">
                          <Lock className="h-3.5 w-3.5 text-green-600" /> Encrypted at rest and never shown again after saving.
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            onClick={saveAndVerify}
                            disabled={verifying || (!secretKey && !payConfig.hasSecretKey)}
                            className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            {verifying ? "Verifying…" : "Save & verify"}
                          </button>
                          <button
                            onClick={testPayment}
                            disabled={payTesting || (!secretKey && !payConfig.hasSecretKey)}
                            className="inline-flex items-center gap-2 border border-accent/30 px-5 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {payTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />} Test only
                          </button>
                        </div>
                      </div>

                      {/* Step 2 — webhook */}
                      <div className="border border-gray-100 p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/10 text-xs font-bold text-accent">2</span>
                            Set up the webhook
                          </h3>
                          <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                            Open Stripe webhooks <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <p className="mb-3 text-xs text-text-muted">
                          In Stripe, add a webhook endpoint with the URL below, select the recommended events, then paste the signing secret it gives you.
                        </p>

                        {/* Endpoint URL */}
                        <label className="mb-1.5 block text-xs font-medium text-primary">Endpoint URL</label>
                        <div className="mb-4 flex items-center gap-2">
                          <code className="flex-1 break-all border border-gray-200 bg-gray-50 p-2 text-xs">{webhookUrl}</code>
                          <button onClick={() => { navigator.clipboard?.writeText(webhookUrl); toast.success("URL copied"); }} className="inline-flex shrink-0 items-center gap-1.5 border border-accent/30 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/5">
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </button>
                        </div>

                        {/* Recommended events */}
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="block text-xs font-medium text-primary">Recommended events</label>
                          <button onClick={() => { navigator.clipboard?.writeText(RECOMMENDED_EVENTS.join("\n")); toast.success("Events copied"); }} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                            <Copy className="h-3 w-3" /> Copy all
                          </button>
                        </div>
                        <div className="mb-4 flex flex-wrap gap-1.5">
                          {RECOMMENDED_EVENTS.map((ev) => (
                            <span key={ev} className="border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-[11px] text-gray-600">{ev}</span>
                          ))}
                        </div>

                        <KeyInput
                          label="Webhook signing secret" secret prefix="whsec_" saved={payConfig.hasWebhookSecret}
                          value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)}
                          placeholder={payConfig.hasWebhookSecret ? "•••••••• saved — leave blank to keep" : "whsec_…"}
                        />
                        <div className="mt-4">
                          <button
                            onClick={savePayment}
                            disabled={paySaving || !webhookSecret}
                            className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {paySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save webhook secret
                          </button>
                        </div>
                      </div>

                      {/* Disconnect */}
                      {(payConfig.hasSecretKey || payConfig.publishableKey) && (
                        <div className="flex justify-end border-t border-gray-100 pt-4">
                          <button onClick={clearPayment} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50">
                            <Trash2 className="h-4 w-4" /> Disconnect Stripe
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── BANK TRANSFER ── */}
              {activeTab === "bank" && (
                <>
                  <SectionHead
                    icon={Landmark}
                    title="Bank transfer"
                    desc="Shown to donors who choose bank transfer at checkout. Leave blank if you don't accept it."
                  />
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Field icon={Landmark} label="Bank name" value={form.bankName} onChange={(e) => up("bankName", e.target.value)} placeholder="Commonwealth Bank" />
                    <Field icon={Hash} label="BSB" value={form.bsb} onChange={(e) => up("bsb", e.target.value)} placeholder="062000" />
                    <Field icon={CreditCard} label="Account number" value={form.accountNumber} onChange={(e) => up("accountNumber", e.target.value)} placeholder="12345678" />
                    <Field icon={UserIcon} label="Account name" value={form.accountName} onChange={(e) => up("accountName", e.target.value)} placeholder="Your Charity Foundation" />
                  </div>
                  <div className="mt-7 flex items-start gap-3 border border-accent/15 bg-accent/5 p-4">
                    <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <p className="text-sm text-text-muted">
                      These details appear on the checkout bank-transfer section and on donation
                      receipts/statements.
                    </p>
                  </div>
                </>
              )}

              {/* ── PAYPAL (per-tenant) ── */}
              {activeTab === "paypal" && <PaypalSettings />}

              {/* ── EMAIL (per-tenant SMTP) ── */}
              {activeTab === "email" && <EmailSettings />}

              {/* ── MAILCHIMP (newsletter audience) ── */}
              {activeTab === "mailchimp" && <MailchimpSettings />}

              {/* ── EVENTS (public calendar audiences) ── */}
              {activeTab === "events" && <EventSettings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky unsaved-changes bar (Contact + Bank transfer only) */}
      <AnimatePresence>
        {isDirty && !saving && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-2xl dark:border-white/10 dark:bg-[var(--admin-elevated)]"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-primary dark:text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
              Unsaved changes
            </span>
            <button onClick={handleDiscard} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-gray-100 dark:hover:bg-white/10">
              <RotateCcw className="h-3.5 w-3.5" /> Discard
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save changes
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
