import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  Building2, Palette, Loader2, Save, Mail, MapPin, Share2, Upload, Trash2, Check,
  Facebook, Instagram, Twitter, Linkedin,
  CreditCard, KeyRound, Eye, EyeOff, ShieldCheck, AlertTriangle, Webhook, Copy, Plug,
  Zap, ArrowRightLeft, Users, RefreshCw, Send,
} from "lucide-react";
import { toast } from "react-hot-toast";
import platformService from "../../services/platform.service";
import { useTenant } from "../../context/TenantContext";
import { useSARealtime } from "../context/SARealtimeContext";
import { themeCategories, getThemeById } from "../../config/themePresets";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import SAPageHeader from "../components/SAPageHeader";
import SAErrorState from "../components/SAErrorState";
import SALoader from "../SALoader";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
// The tenant's underline + dark-mode phone styling, scoped to [data-admin-theme]
// (which the SuperAdmin console also uses) — so it matches here too.
import "../../Admin/Screens/phone-input.css";

const card = "rounded-xl border border-gray-100 bg-white shadow-sm";
const labelCls = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500";
const lineWrap = "flex items-center gap-2.5 border-b border-gray-200 transition-colors focus-within:border-accent dark:border-white/10";
const lineInput = "w-full bg-transparent py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400";

const TABS = [
  { id: "general", label: "General", desc: "Name & tagline", icon: Building2 },
  { id: "contact", label: "Contact", desc: "Email, phone & address", icon: Mail },
  { id: "social", label: "Social", desc: "Social links", icon: Share2 },
  { id: "branding", label: "Branding", desc: "Logos, colours & theme", icon: Palette },
  { id: "stripe", label: "Stripe", desc: "Billing account & keys", icon: CreditCard },
  { id: "email", label: "Email", desc: "Outbound mailbox", icon: Send },
];

const DEFAULTS = {
  name: "", tagline: "", description: "",
  contactEmail: "", contactPhone: "", address: "",
  socialLinks: { facebook: "", instagram: "", twitter: "", linkedin: "" },
  branding: {
    logo: "", logoDark: "", iconLogo: "", iconLogoDark: "", favicon: "",
    primaryColor: "#102A23", accentColor: "#047857", backgroundColor: "#F3F8F5", theme: "modern-emerald",
  },
};

// asset :type → branding field
const SLOT_FIELD = { logo: "logo", "logo-dark": "logoDark", "icon-logo": "iconLogo", "icon-logo-dark": "iconLogoDark", favicon: "favicon" };

// Map the settings document (API/cache) onto the form shape — reused by the
// cached-hydration init and the first-load fetch so both stay in sync.
function toForm(data = {}) {
  return {
    name: data.name || "",
    tagline: data.tagline || "",
    description: data.description || "",
    contactEmail: data.contactEmail || "",
    contactPhone: data.contactPhone || "",
    address: data.address || "",
    socialLinks: {
      facebook: data.socialLinks?.facebook || "",
      instagram: data.socialLinks?.instagram || "",
      twitter: data.socialLinks?.twitter || "",
      linkedin: data.socialLinks?.linkedin || "",
    },
    branding: {
      logo: data.branding?.logo || "",
      logoDark: data.branding?.logoDark || "",
      iconLogo: data.branding?.iconLogo || "",
      iconLogoDark: data.branding?.iconLogoDark || "",
      favicon: data.branding?.favicon || "",
      primaryColor: data.branding?.primaryColor || DEFAULTS.branding.primaryColor,
      accentColor: data.branding?.accentColor || DEFAULTS.branding.accentColor,
      backgroundColor: data.branding?.backgroundColor || DEFAULTS.branding.backgroundColor,
      theme: data.branding?.theme || DEFAULTS.branding.theme,
    },
  };
}

// The subset of the form that the "Save changes" button actually persists —
// i.e. everything EXCEPT the logo images, which save instantly via their own
// upload/delete endpoints. Used to compute the dirty state and to snapshot the
// last-saved values for discard, so a logo upload never trips "unsaved changes".
function pickSaveable(f) {
  return {
    name: f.name,
    tagline: f.tagline,
    description: f.description,
    contactEmail: f.contactEmail,
    contactPhone: f.contactPhone,
    address: f.address,
    socialLinks: { ...f.socialLinks },
    branding: {
      primaryColor: f.branding.primaryColor,
      accentColor: f.branding.accentColor,
      backgroundColor: f.branding.backgroundColor,
      theme: f.branding.theme,
    },
  };
}

// positive percent darkens (mirrors the site's var derivation) — for the preview footer.
function shiftHex(hex, percent) {
  const num = parseInt(String(hex || "").replace("#", ""), 16);
  if (Number.isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max((num >> 16) - amt, 0));
  const G = Math.min(255, Math.max(((num >> 8) & 0x00ff) - amt, 0));
  const B = Math.min(255, Math.max((num & 0x0000ff) - amt, 0));
  return "#" + ((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1);
}

function Field({ label, hint, children, className }) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

function TextInput({ icon: Icon, className, ...props }) {
  return (
    <div className={lineWrap}>
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-gray-400" /> : null}
      {/* className merges rather than being clobbered by the base classes —
          the Stripe tab needs a monospaced variant. */}
      <input {...props} className={cn(lineInput, className)} />
    </div>
  );
}

/** Drag-and-drop image slot — same UI as the tenant Branding screen. */
function Dropzone({ label, hint, type, value, wide = false, busy, onUpload, onDelete, previewBg = "light" }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const dark = previewBg === "dark";

  const pick = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 2 * 1024 * 1024) return toast.error("Image must be under 2MB");
    onUpload(type, file);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        {value && (
          <button onClick={() => onDelete(type)} className="flex items-center gap-1 text-xs font-medium text-red-500 transition-colors hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        )}
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        className={cn(
          "group relative flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all",
          drag
            ? "border-accent bg-accent/5"
            : dark
              ? "border-white/15 bg-gray-900 hover:border-accent/60"
              : "border-gray-200 bg-gray-50 hover:border-accent/60 hover:bg-gray-100/60",
        )}
      >
        {value ? (
          <>
            <img src={value} alt={label} className={cn(wide ? "max-h-24 max-w-[80%]" : "h-20 w-20", "object-contain")} />
            <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Upload className="h-4 w-4" /> <span className="text-xs font-medium">Replace</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 px-4 text-center">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-accent shadow-sm ring-1 ring-gray-100">
              <Upload className="h-4 w-4" />
            </div>
            <p className={cn("text-xs font-medium", dark ? "text-white/80" : "text-gray-700")}>Click or drag &amp; drop</p>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        )}
      </div>
      {hint ? <p className="mt-2 text-xs text-gray-400">{hint}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/svg+xml,image/webp,image/x-icon"
        onChange={(e) => { pick(e.target.files?.[0]); if (inputRef.current) inputRef.current.value = ""; }}
        className="hidden"
      />
    </div>
  );
}

function SaveBar({ saving, dirty, onSave, onDiscard }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
      {dirty ? (
        <span className="mr-auto inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
        </span>
      ) : null}
      {dirty ? (
        <button type="button" onClick={onDiscard} disabled={saving} className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/80">
          Discard
        </button>
      ) : null}
      <button type="button" onClick={onSave} disabled={saving || !dirty} className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-light disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
      </button>
    </div>
  );
}

function SectionHead({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Icon className="h-5 w-5" /></span>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

// Live preview of how the brand reads on the marketing site (navbar + hero + footer).
function LivePreview({ branding, name }) {
  const p = branding.primaryColor;
  const a = branding.accentColor;
  const bg = branding.backgroundColor;
  const navMark = branding.logoDark || branding.iconLogoDark;
  const footMark = branding.logo || branding.iconLogo;
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-white/10">
      {/* navbar (light surface) */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: bg }}>
        {navMark ? <img src={navMark} alt="" className="h-6 max-w-[130px] object-contain" /> : <span className="text-sm font-extrabold" style={{ color: p }}>{name || "Your Platform"}</span>}
        <span className="rounded-full px-3 py-1 text-[11px] font-semibold text-white" style={{ background: a }}>Get started</span>
      </div>
      {/* hero */}
      <div className="px-4 py-7 text-center" style={{ background: bg }}>
        <div className="mx-auto mb-2 h-2.5 w-2/3 rounded-full" style={{ background: p, opacity: 0.18 }} />
        <div className="mx-auto h-2 w-1/3 rounded-full" style={{ background: p, opacity: 0.1 }} />
        <span className="mt-4 inline-block rounded-full px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm" style={{ background: a }}>Donate now</span>
      </div>
      {/* footer (dark gradient) */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: `linear-gradient(180deg, ${shiftHex(p, 10)}, ${shiftHex(p, 20)})` }}>
        {footMark ? <img src={footMark} alt="" className="h-6 max-w-[130px] object-contain" /> : <span className="text-sm font-extrabold text-white">{name || "Your Platform"}</span>}
        <span className="text-[11px] font-semibold" style={{ color: a }}>Contact</span>
      </div>
    </div>
  );
}

/* ── Stripe (platform billing account) ──────────────────────────────────────
 * This is the account that charges TENANTS for their subscription — not a
 * tenant's own donation account (that lives in each org's settings).
 *
 * Secrets are write-only: the server returns a mask, never a key, so the inputs
 * start blank and "leave blank to keep the current one" is the real behaviour,
 * not a convenience. Nothing here ever holds a secret in state after a save.
 */
const STRIPE_BLANK = { publishableKey: "", secretKey: "", webhookSecret: "" };

function SecretInput({ label, hint, value, onChange, placeholder, stored, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} hint={hint}>
      <div className={lineWrap}>
        <KeyRound className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete || "new-password"}
          spellCheck={false}
          className={`${lineInput} font-mono`}
        />
        {value ? (
          <button type="button" onClick={() => setShow((v) => !v)} className="shrink-0 text-gray-400 transition hover:text-gray-600" title={show ? "Hide" : "Show"}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
        {stored && !value ? (
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Stored</span>
        ) : null}
      </div>
    </Field>
  );
}

/**
 * The platform's outbound mailbox.
 *
 * Same contract as StripeTab below and for the same reasons: the password is
 * write-only (the server returns a mask, never the secret), so the input starts
 * blank and "leave blank to keep the current one" is the actual behaviour
 * rather than a convenience.
 *
 * The one thing this tab does that the Stripe tab does not is offer to SEND.
 * Authenticating proves the login works; it does not prove mail arrives.
 * "Logged in fine, delivered nothing" is a real and common state — a blocked
 * sender, an unverified domain — and it stays invisible until a receipt
 * silently fails to reach a donor.
 */
const EMAIL_BLANK = { host: "", port: 587, secure: false, username: "", password: "", fromName: "", fromEmail: "", replyTo: "" };

function EmailTab({ draftRef }) {
  const { platformVersion } = useSARealtime();
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Restored from the parent's ref so switching tabs doesn't discard a
  // half-entered mailbox — this tab lives inside an AnimatePresence and is
  // destroyed on every tab change.
  const [form, setForm] = useState(() => draftRef.current || { ...EMAIL_BLANK });
  // One action at a time: Test and Save both open an SMTP connection, and
  // letting them race means the slower response overwrites the faster one.
  const [busy, setBusy] = useState(null); // "saving" | "testing" | "clearing" | null
  const [confirmClear, setConfirmClear] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testTo, setTestTo] = useState("");

  const saving = busy === "saving";
  const testing = busy === "testing";
  const clearing = busy === "clearing";

  useEffect(() => { draftRef.current = form; }, [form, draftRef]);

  // platformVersion bumps when another operator changes platform config, so
  // this revalidates instead of showing a mailbox that has since been replaced.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await withMinDelay(platformService.getEmailConfig());
        if (!alive) return;
        setCfg(data);
        // Never clobber half-typed credentials with a background refresh.
        setForm((f) =>
          f.password || f.host !== "" || f.username !== ""
            ? f
            : {
                host: data.host || "", port: data.port || 587, secure: !!data.secure,
                username: data.username || "", password: "",
                fromName: data.fromName || "", fromEmail: data.fromEmail || "", replyTo: data.replyTo || "",
              },
        );
        setErr(null);
      } catch (e) {
        if (alive) setErr(e?.response?.data?.error || "Couldn't load the email configuration.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [reloadKey, platformVersion]);

  const adopt = (next) => {
    setCfg(next);
    const clean = {
      host: next.host || "", port: next.port || 587, secure: !!next.secure,
      username: next.username || "", password: "",
      fromName: next.fromName || "", fromEmail: next.fromEmail || "", replyTo: next.replyTo || "",
    };
    setForm(clean);
    draftRef.current = clean;
  };

  const dirty =
    !!cfg &&
    (form.password.trim() !== "" ||
      form.host.trim() !== (cfg.host || "") ||
      Number(form.port) !== (cfg.port || 587) ||
      !!form.secure !== !!cfg.secure ||
      form.username.trim() !== (cfg.username || "") ||
      form.fromName.trim() !== (cfg.fromName || "") ||
      form.fromEmail.trim() !== (cfg.fromEmail || "") ||
      form.replyTo.trim() !== (cfg.replyTo || ""));

  const basePayload = () => {
    const p = {
      host: form.host.trim(), port: Number(form.port) || 587, secure: !!form.secure,
      username: form.username.trim(), fromName: form.fromName.trim(),
      fromEmail: form.fromEmail.trim(), replyTo: form.replyTo.trim(),
    };
    if (form.password.trim()) p.password = form.password;
    return p;
  };

  const persist = async (payload, successMsg) => {
    if (busy) return;
    setBusy("saving");
    try {
      const res = await platformService.updateEmailConfig(payload);
      adopt(res.config);
      setTestResult(null);
      toast.success(successMsg);
    } catch (e) {
      const d = e?.response?.data;
      toast.error(d?.hint ? `${d.error} ${d.hint}` : d?.error || "Failed to save the mailbox");
    } finally {
      setBusy(null);
    }
  };

  const onSave = () => { if (dirty) persist({ ...basePayload(), enabled: !!cfg.enabled }, "Mailbox saved"); };

  const onToggleEnabled = () => {
    const next = !cfg.enabled;
    // Enabling with details typed but unsaved would verify the OLD mailbox and
    // enable the wrong one — send what is on screen so both stay consistent.
    persist({ ...basePayload(), enabled: next }, next ? "Platform mailbox enabled" : "Platform mailbox disabled");
  };

  const onTest = async () => {
    if (busy) return;
    setBusy("testing");
    setTestResult(null);
    try {
      // Typed host + username means "test what I've entered"; otherwise test
      // the mailbox the server is actually running on.
      const typed = form.host.trim() && form.username.trim();
      const payload = typed ? { ...basePayload() } : {};
      if (testTo.trim()) payload.to = testTo.trim();
      const res = await platformService.testEmailConnection(payload);
      setTestResult({ ok: true, ...res });
      if (res.config) setCfg(res.config);
      toast.success(res.message || "Connected");
    } catch (e) {
      const msg = e?.response?.data?.error || "Could not connect to the mail server";
      setTestResult({ ok: false, error: msg });
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const onClear = async () => {
    if (busy) return;
    setBusy("clearing");
    try {
      const res = await platformService.clearEmailConfig();
      adopt(res.config);
      setConfirmClear(false);
      setTestResult(null);
      toast.success("Mailbox removed");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to remove the mailbox");
    } finally {
      setBusy(null);
    }
  };

  // A typed password lives only in this component's state; a reload loses it.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  if (loading) return <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  if (err) return <SAErrorState message={err} onRetry={() => { setErr(null); setLoading(true); setReloadKey((k) => k + 1); }} />;
  if (!cfg) return null;

  const rt = cfg.runtime || {};
  const status = !rt.configured
    ? { tone: "rose", label: "No mailbox configured", detail: "Nothing can send. Receipts, registration emails and operator notices will all fail." }
    : rt.source === "database"
      ? { tone: "emerald", label: "Live · using the saved mailbox", detail: `Platform mail is sent from ${rt.fromEmail || cfg.username}.` }
      : { tone: "amber", label: "Using the EMAIL_* environment variables", detail: cfg.hasPassword ? "A mailbox is saved here but not enabled, so the environment is still in use." : "Falling back to the environment. Save a mailbox below to manage it from the console." };

  const toneCls = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
  }[status.tone];

  // 465 is implicit TLS, 587 is STARTTLS. Getting this pair backwards is the
  // most common SMTP mistake and it does not fail loudly — the client waits for
  // a handshake that never comes and the send hangs until it times out.
  const portMismatch =
    (Number(form.port) === 465 && !form.secure) || (Number(form.port) === 587 && form.secure);

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } } };

  return (
    <motion.div layout variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <SectionHead icon={Mail} title="Email" subtitle="The platform's own mailbox — used for every email a tenant's own SMTP doesn't send." />

      <motion.div variants={item} layout>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${status.tone}-${rt.source}`}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn("flex flex-wrap items-start gap-3 border p-4", toneCls)}
          >
            <span className="mt-0.5 shrink-0">
              {status.tone === "emerald" ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{status.label}</p>
              <p className="mt-0.5 text-xs opacity-90">{status.detail}</p>
              {cfg.lastVerifiedAt ? (
                <p className="mt-2 text-xs opacity-90">Last verified {new Date(cfg.lastVerifiedAt).toLocaleString()}</p>
              ) : null}
              {cfg.lastVerifyError ? (
                <p className="mt-2 text-xs font-medium opacity-90">Last error: {cfg.lastVerifyError}</p>
              ) : null}
            </div>
            <button
              type="button" onClick={onToggleEnabled} disabled={!!busy}
              className="shrink-0 border border-current px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition hover:opacity-80 disabled:opacity-50"
            >
              {cfg.enabled ? "Disable" : "Enable"}
            </button>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {cfg.passwordBroken ? (
        <motion.div variants={item} className="flex items-start gap-3 border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">The stored password can't be decrypted</p>
            <p className="mt-0.5 text-xs">PAYMENT_ENC_KEY (or JWT_SECRET) changed after it was saved. Re-enter the password below to fix it.</p>
          </div>
        </motion.div>
      ) : null}

      {/* Server */}
      <motion.div variants={item} className="grid gap-5 sm:grid-cols-2">
        <Field label="SMTP host" hint="e.g. smtp.gmail.com — the server name only, no https:// and no path.">
          <TextInput value={form.host} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} placeholder="smtp.gmail.com" spellCheck={false} autoComplete="off" className="font-mono" />
        </Field>
        <Field label="Port" hint="587 for STARTTLS (most providers), 465 for implicit TLS.">
          <TextInput type="number" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))} placeholder="587" className="font-mono" />
        </Field>
        <Field label="Mailbox username" hint="Usually the full email address of the sending account.">
          <TextInput icon={Users} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="no-reply@yourdomain.org" spellCheck={false} autoComplete="off" />
        </Field>
        <SecretInput
          label="Password"
          hint={cfg.hasPassword ? `Stored ${cfg.passwordMask || ""} — leave blank to keep it.` : "An app password, if your provider issues them."}
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder={cfg.hasPassword ? "Leave blank to keep" : "App password"}
          stored={cfg.hasPassword}
        />
        <Field label="Use TLS" hint="On for port 465. Off for 587, which upgrades to TLS with STARTTLS." className="sm:col-span-2">
          <label className="mt-1 inline-flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={!!form.secure} onChange={(e) => setForm((f) => ({ ...f, secure: e.target.checked }))} className="h-4 w-4 accent-accent" />
            <span className="text-sm text-gray-700">Connect over implicit TLS</span>
          </label>
          {portMismatch ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Port {form.port} normally pairs with TLS {Number(form.port) === 465 ? "on" : "off"}. As set, the connection will most likely hang rather than fail.
            </p>
          ) : null}
        </Field>
      </motion.div>

      {/* Identity */}
      <motion.div variants={item} className="grid gap-5 sm:grid-cols-2">
        <Field label="From name" hint="Shown as the sender. Tenants with a name of their own still send as themselves.">
          <TextInput value={form.fromName} onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))} placeholder="Donexus" />
        </Field>
        <Field label="From address" hint="Leave blank to send as the mailbox username — most providers reject anything else.">
          <TextInput icon={Mail} value={form.fromEmail} onChange={(e) => setForm((f) => ({ ...f, fromEmail: e.target.value }))} placeholder="no-reply@yourdomain.org" spellCheck={false} />
        </Field>
        <Field label="Reply-to" hint="Optional. Where replies should land if that isn't the sending mailbox." className="sm:col-span-2">
          <TextInput icon={Mail} value={form.replyTo} onChange={(e) => setForm((f) => ({ ...f, replyTo: e.target.value }))} placeholder="support@yourdomain.org" spellCheck={false} />
        </Field>
      </motion.div>

      {/* Test */}
      <motion.div variants={item} className="border border-gray-100 bg-gray-50/60 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Send a test</p>
        <p className="mt-1.5 text-xs text-gray-500">
          Leave the address blank to check the login only. Enter one to actually deliver a message — a mailbox can authenticate perfectly and still be blocked from sending.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <TextInput icon={Mail} value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" spellCheck={false} />
          </div>
          <button type="button" onClick={onTest} disabled={!!busy || (!rt.configured && !(form.host.trim() && form.username.trim()))} className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Test mailbox
          </button>
        </div>
        {testResult ? (
          <p className={cn("mt-3 text-xs font-medium", testResult.ok ? "text-emerald-700" : "text-rose-700")}>
            {testResult.ok ? testResult.message || "Connected." : testResult.error}
          </p>
        ) : null}
      </motion.div>

      <motion.div variants={item} className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
        {cfg.hasPassword || cfg.host ? (
          <button type="button" onClick={() => setConfirmClear(true)} disabled={!!busy} className="inline-flex items-center gap-2 border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        ) : null}
        <span className="flex-1" />
        <button type="button" onClick={onSave} disabled={!!busy || !dirty} className="inline-flex items-center gap-2 bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-light disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
        </button>
      </motion.div>

      <AnimatePresence>
        {confirmClear ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => !busy && setConfirmClear(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white p-6 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center bg-rose-50 text-rose-600"><AlertTriangle className="h-5 w-5" /></span>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Remove the platform mailbox?</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {rt.envAvailable
                      ? "Platform email falls back to the EMAIL_* environment variables, so sending keeps working."
                      : "There are no EMAIL_* environment variables to fall back on, so every platform email will stop sending until a mailbox is configured again."}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setConfirmClear(false)} disabled={!!busy} className="px-4 py-2 text-sm font-medium text-gray-600 transition hover:text-gray-900 disabled:opacity-50">Cancel</button>
                <button type="button" onClick={onClear} disabled={!!busy} className="inline-flex items-center gap-2 bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50">
                  {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function StripeTab({ draftRef }) {
  const cached = platformService.getStripeCached();
  const { platformVersion } = useSARealtime();
  const [cfg, setCfg] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const [err, setErr] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Restored from the parent's ref so switching tabs doesn't silently discard a
  // half-entered key — this tab is inside an AnimatePresence and is destroyed on
  // every tab change.
  const [form, setForm] = useState(
    () => draftRef.current || { ...STRIPE_BLANK, publishableKey: cached?.publishableKey || "" },
  );
  // One action at a time. These were three independent flags, which let "Test"
  // and "Save" run concurrently — two Stripe verifications racing, with the
  // slower response overwriting the faster one's state.
  const [busy, setBusy] = useState(null); // "saving" | "testing" | "clearing" | "webhook" | null
  const [confirmClear, setConfirmClear] = useState(false);
  const [testResult, setTestResult] = useState(null);
  // A save that would move the platform to a DIFFERENT Stripe account. The
  // server refuses it once, describing what the switch would strand; this holds
  // that description AND the exact payload, so confirming re-sends the very same
  // change rather than a reconstruction of it.
  const [accountSwitch, setAccountSwitch] = useState(null);
  // What the post-switch catalogue repair actually managed to re-create.
  const [catalogReport, setCatalogReport] = useState(null);
  // Stripe already has an endpoint on this URL — replacing it is the only way to
  // obtain a signing secret, so it needs an explicit yes.
  const [webhookExisting, setWebhookExisting] = useState(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);

  const saving = busy === "saving";
  const testing = busy === "testing";
  const clearing = busy === "clearing";
  const hooking = busy === "webhook";

  // Mirror the draft up so it survives this component being unmounted.
  useEffect(() => {
    draftRef.current = form;
  }, [form, draftRef]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  // Fetched on first open of this tab; `platformVersion` bumps when another
  // operator changes the config, which flips the service's stale flag so this
  // revalidates instead of trusting a cache that's now wrong.
  useEffect(() => {
    const stale = platformService.isStripeStale();
    if (platformService.getStripeCached() && !reloadKey && !stale) return undefined;
    let alive = true;
    (async () => {
      try {
        const fresh = platformService.getStripeConfig({ force: !!reloadKey || stale });
        // Only pad with the minimum-delay spinner on a genuine first load —
        // a background revalidation shouldn't hold the UI back.
        const data = await (loading ? withMinDelay(fresh) : fresh);
        if (!alive) return;
        setCfg(data);
        // Never clobber half-typed credentials with a background refresh.
        setForm((f) =>
          f.secretKey || f.webhookSecret || f.publishableKey !== (cfg?.publishableKey || "")
            ? f
            : { ...STRIPE_BLANK, publishableKey: data.publishableKey || "" },
        );
        setErr(null);
      } catch (e) {
        if (alive) setErr(e?.response?.data?.error || "Couldn't load the Stripe configuration.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, platformVersion]);

  const adopt = (next) => {
    setCfg(next);
    // Drop the typed secrets — they're saved and must not linger in memory.
    const clean = { ...STRIPE_BLANK, publishableKey: next.publishableKey || "" };
    setForm(clean);
    draftRef.current = clean;
  };

  const dirty =
    !!cfg &&
    (form.secretKey.trim() !== "" ||
      form.webhookSecret.trim() !== "" ||
      form.publishableKey.trim() !== (cfg.publishableKey || ""));

  const persist = async (payload, successMsg) => {
    if (busy) return; // one Stripe operation at a time
    setBusy("saving");
    setTestResult(null);
    try {
      const res = await platformService.updateStripeConfig(payload);
      adopt(res.config);
      setAccountSwitch(null);
      // Only meaningful after an account move — a normal save leaves the
      // catalogue alone and shouldn't render a repair report.
      setCatalogReport(res.switchedAccount ? res.catalog : null);
      toast.success(successMsg);
    } catch (e) {
      const data = e?.response?.data;
      // 409 = "this key is a different Stripe account". Not an error to toast
      // and forget: it's a decision to put in front of the operator, with the
      // original payload kept so confirming repeats it exactly.
      if (e?.response?.status === 409 && data?.accountSwitch) {
        setAccountSwitch({ ...data.accountSwitch, message: data.error, payload, successMsg });
      } else {
        toast.error(data?.error || "Failed to save Stripe configuration");
      }
    } finally {
      setBusy(null);
    }
  };

  const onConfirmSwitch = () => {
    if (!accountSwitch) return;
    persist({ ...accountSwitch.payload, confirmAccountSwitch: true }, accountSwitch.successMsg);
  };

  /**
   * Let the operator flip the one bridge between the platform account and the
   * tenant donation accounts. Sent on its own so the server has no new key to
   * verify — this is a policy change, not a credential change.
   */
  const onToggleFallback = () => {
    const next = !cfg.allowTenantFallback;
    persist(
      { allowTenantFallback: next },
      next
        ? "Tenants without their own Stripe can now use the platform account"
        : "Tenant donations now require each tenant's own Stripe account",
    );
  };

  /**
   * Create the billing webhook endpoint in Stripe and capture its signing
   * secret. Doesn't go through adopt(): that clears the key inputs, and a
   * half-typed secret shouldn't vanish because a webhook was provisioned.
   */
  const onCreateWebhook = async (recreate = false) => {
    if (busy) return;
    setBusy("webhook");
    try {
      const res = await platformService.createStripeWebhook({ recreate });
      if (res.config) setCfg(res.config);
      setWebhookExisting(null);
      toast.success(res.message || "Webhook endpoint created");
    } catch (e) {
      const data = e?.response?.data;
      if (e?.response?.status === 409 && data?.canRecreate) {
        setWebhookExisting({ ...data.existing, message: data.error });
      } else {
        toast.error(data?.error || "Couldn't create the webhook endpoint");
      }
    } finally {
      setBusy(null);
    }
  };

  const onSave = () => {
    if (!dirty) return;
    const payload = { publishableKey: form.publishableKey.trim() };
    if (form.secretKey.trim()) payload.secretKey = form.secretKey.trim();
    if (form.webhookSecret.trim()) payload.webhookSecret = form.webhookSecret.trim();
    persist(payload, "Stripe configuration saved");
  };

  const onToggleEnabled = () => {
    const next = !cfg.enabled;
    // Enabling with a key typed but unsaved would verify the OLD key and enable
    // the wrong account — send the typed one along so both stay consistent.
    const payload = { enabled: next };
    if (next && form.secretKey.trim()) payload.secretKey = form.secretKey.trim();
    if (next && form.publishableKey.trim() !== (cfg.publishableKey || "")) {
      payload.publishableKey = form.publishableKey.trim();
    }
    persist(payload, next ? "Platform Stripe enabled" : "Platform Stripe disabled");
  };

  const onTest = async () => {
    if (busy) return;
    const typed = form.secretKey.trim();
    setBusy("testing");
    setTestResult(null);
    try {
      const res = await platformService.testStripeConnection(typed || undefined);
      setTestResult({ ok: true, typed: !!typed, ...res });
      // Only adopt when we tested what's STORED — for a typed key the server
      // returns the stored config, and taking it would make the banner describe
      // an account the operator didn't just test.
      if (!typed && res.config) setCfg(res.config);
      toast.success(`Connected to ${res.account?.label || "Stripe"}`);
    } catch (e) {
      const msg = e?.response?.data?.error || "Could not connect to Stripe";
      setTestResult({ ok: false, error: msg });
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const onClear = async () => {
    if (busy) return;
    setBusy("clearing");
    try {
      const res = await platformService.clearStripeConfig();
      adopt(res.config);
      setConfirmClear(false);
      setTestResult(null);
      toast.success("Stripe configuration cleared");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to clear Stripe configuration");
    } finally {
      setBusy(null);
    }
  };

  // Typed secrets live only in this component's state — a reload loses them
  // silently, and re-copying a live key out of Stripe is a nuisance.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Resolved by the server from the host this request arrived on (or
  // PUBLIC_API_URL), so it's the address Stripe would actually have to reach —
  // not whatever base URL this browser happens to call the API on.
  const webhookUrl = cfg?.webhookUrl || "";

  const copyWebhook = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      clearTimeout(copyTimer.current); // tracked so a tab switch can cancel it
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy — select and copy the URL manually");
    }
  };

  if (loading) return <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  if (err) return <SAErrorState message={err} onRetry={() => { setErr(null); setLoading(true); setReloadKey((k) => k + 1); }} />;
  if (!cfg) return null;

  const rt = cfg.runtime || {};
  const live = rt.mode === "live";
  // What the SERVER is actually using right now — the saved config only takes
  // over once it's enabled, so "saved but env is still winning" needs saying.
  const status = !rt.configured
    ? { tone: "rose", label: "Not configured", detail: "No Stripe key is available. Tenant signup and subscription billing will fail." }
    : rt.secretSource === "database"
      ? { tone: "emerald", label: `Live · using saved ${rt.mode} key`, detail: `Requests are signed with the ${rt.mode} key stored here.` }
      : { tone: "amber", label: `Using STRIPE_SECRET_KEY (${rt.mode})`, detail: cfg.hasSecretKey ? "A key is saved here but not enabled, so the environment variable is still in use." : "Falling back to the environment variable. Save a key below to manage it from the console." };

  const toneCls = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
  }[status.tone];

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } } };

  return (
    <motion.div layout variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <SectionHead icon={CreditCard} title="Stripe" subtitle="The platform's own Stripe account — used to bill tenants for their subscription." />

      {/* Which credentials the running server is using. Keyed on the status so
          enabling/disabling cross-fades between states rather than snapping —
          this banner is the one thing on the tab that changes meaning. */}
      <motion.div variants={item} layout>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${status.tone}-${rt.secretSource}-${rt.mode}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn("flex flex-wrap items-start gap-3 border p-4", toneCls)}
          >
            <span className="mt-0.5 shrink-0">
              {status.tone === "emerald" ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{status.label}</p>
              <p className="mt-0.5 text-xs opacity-90">{status.detail}</p>
              {cfg.accountLabel ? (
                <p className="mt-2 text-xs opacity-90">
                  Account <span className="font-semibold">{cfg.accountLabel}</span>
                  {cfg.accountId ? <span className="ml-1 font-mono opacity-70">({cfg.accountId})</span> : null}
                  {cfg.lastVerifiedAt ? <span className="ml-1">· verified {new Date(cfg.lastVerifiedAt).toLocaleString()}</span> : null}
                </p>
              ) : null}
            </div>
            {live ? (
              <span className="shrink-0 border border-current px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Live mode</span>
            ) : rt.mode ? (
              <span className="shrink-0 border border-current px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Test mode</span>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {cfg.secretKeyBroken ? (
        <motion.div variants={item} className="flex items-start gap-3 border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">The stored secret key can't be decrypted</p>
            <p className="mt-0.5 text-xs">PAYMENT_ENC_KEY (or JWT_SECRET) changed after the key was saved. Re-enter the secret key below to fix it.</p>
          </div>
        </motion.div>
      ) : null}

      {/* Keys */}
      <motion.div variants={item} className="space-y-5">
        <Field label="Publishable key" hint="Public — safe to expose in the browser. Must be the same mode (test/live) as the secret key.">
          <TextInput
            value={form.publishableKey}
            onChange={(e) => setForm((f) => ({ ...f, publishableKey: e.target.value }))}
            placeholder="pk_live_…"
            spellCheck={false}
            autoComplete="off"
            className="font-mono"
          />
        </Field>

        <SecretInput
          label="Secret key"
          hint={cfg.hasSecretKey ? `Currently stored: ${cfg.secretKeyMask || "••••"}. Leave blank to keep it.` : "Starts with sk_test_ or sk_live_. Verified against Stripe before it's saved."}
          value={form.secretKey}
          onChange={(e) => setForm((f) => ({ ...f, secretKey: e.target.value }))}
          placeholder={cfg.hasSecretKey ? "Leave blank to keep the current key" : "sk_live_…"}
          stored={cfg.hasSecretKey}
        />

        <SecretInput
          label="Webhook signing secret"
          hint={cfg.hasWebhookSecret ? "A signing secret is stored. Leave blank to keep it." : "From the Stripe webhook endpoint you point at the URL below."}
          value={form.webhookSecret}
          onChange={(e) => setForm((f) => ({ ...f, webhookSecret: e.target.value }))}
          placeholder={cfg.hasWebhookSecret ? "Leave blank to keep the current secret" : "whsec_…"}
          stored={cfg.hasWebhookSecret}
        />
      </motion.div>

      {/* Webhook endpoint to register in Stripe. The URL comes from the server —
          it knows the host Stripe would actually have to reach, which the
          browser's API base does not. */}
      <motion.div variants={item}>
        <label className={labelCls}>Webhook endpoint</label>
        <div className="flex items-center gap-2 border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
          <Webhook className="h-4 w-4 shrink-0 text-gray-400" />
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-gray-700">{webhookUrl || "—"}</code>
          <button type="button" onClick={copyWebhook} disabled={!webhookUrl} className="shrink-0 text-gray-400 transition hover:text-accent disabled:opacity-40" title="Copy">
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        {cfg.webhookReachable === false ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-600">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              This is a local address, so Stripe can&apos;t deliver to it. Use a tunnel
              (<code className="font-mono">stripe listen --forward-to {webhookUrl}</code>) in development, or set{" "}
              <code className="font-mono">PUBLIC_API_URL</code> on the server to your deployed backend URL.
            </span>
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-gray-400">
            Register this in Stripe → Developers → Webhooks and paste the signing secret above — or let the console create it for you.
          </p>
        )}

        {/* Provisioning the endpoint from here removes the dashboard round trip
            AND the commonest way this breaks: pasting the DONATION endpoint's
            signing secret into the billing slot, which fails verification on
            every event and looks like Stripe never called at all. */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onCreateWebhook(false)}
            disabled={!!busy || !webhookUrl || cfg.webhookReachable === false || rt.secretSource !== "database"}
            title={
              rt.secretSource !== "database"
                ? "Save and enable a secret key first — otherwise the endpoint would belong to the environment key's account"
                : cfg.webhookReachable === false
                  ? "Stripe can't deliver to a local address"
                  : undefined
            }
            className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:text-white/80"
          >
            {hooking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {cfg.webhookEndpointId ? "Recreate endpoint in Stripe" : "Create endpoint in Stripe"}
          </button>
          {cfg.webhookEndpointId ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Created from this console
              <code className="ml-1 font-mono text-[11px] text-gray-400">{cfg.webhookEndpointId}</code>
            </span>
          ) : (
            <span className="text-xs text-gray-400">Subscribes to the six subscription &amp; invoice events this server handles.</span>
          )}
        </div>
      </motion.div>

      {/* ── The one bridge to the TENANT Stripe setup ─────────────────────────
          Everything else on this tab concerns the platform's own account. This
          single switch decides whether that account may also process donations
          for tenants who haven't connected Stripe themselves — so it is stated
          plainly rather than left as an implicit behaviour of the resolver. */}
      <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-4 border border-gray-200 p-4 dark:border-white/10">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Users className="h-4 w-4 text-gray-400" /> Let tenants without Stripe use this account
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {cfg.allowTenantFallback
              ? "Donations for tenants who haven't connected their own Stripe are processed through this platform account, and settle into it."
              : "Tenants must connect their own Stripe account to accept card donations. Those without one are told so at checkout instead of paying into this account."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!cfg.allowTenantFallback}
          onClick={onToggleFallback}
          disabled={!!busy}
          className={cn("relative h-6 w-11 shrink-0 transition-colors disabled:opacity-40", cfg.allowTenantFallback ? "bg-accent" : "bg-gray-300")}
        >
          <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 34 }} className={cn("absolute top-0.5 h-5 w-5 bg-white shadow", cfg.allowTenantFallback ? "left-[22px]" : "left-0.5")} />
        </button>
      </motion.div>

      {/* Test result */}
      <AnimatePresence>
        {testResult ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn("overflow-hidden border p-4 text-sm", testResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800")}
          >
            {testResult.ok ? (
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Connected to <b>{testResult.account?.label}</b>
                {testResult.account?.country ? ` · ${testResult.account.country}` : ""} · {testResult.mode} mode
              </span>
            ) : (
              <span className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{testResult.error}</span>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Outcome of the catalogue repair that follows an account move. Plans and
          coupons are re-created in the new account here; anything that failed is
          named, because a silently half-migrated catalogue fails later at a
          tenant's checkout rather than on this screen. */}
      <AnimatePresence>
        {catalogReport ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "overflow-hidden border p-4 text-sm",
              catalogReport.error || catalogReport.plans?.failed?.length || catalogReport.coupons?.failed?.length
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800",
            )}
          >
            <p className="flex items-center gap-2 font-semibold">
              <RefreshCw className="h-4 w-4 shrink-0" /> Catalogue re-created in the new account
            </p>
            {catalogReport.error ? (
              <p className="mt-1.5 text-xs">{catalogReport.error}</p>
            ) : (
              <ul className="mt-2 space-y-1 text-xs">
                <li>
                  Plans: <b>{catalogReport.plans?.repaired?.length || 0}</b> re-created,{" "}
                  {catalogReport.plans?.unchanged?.length || 0} already valid
                  {catalogReport.plans?.failed?.length ? `, ${catalogReport.plans.failed.length} failed` : ""}
                </li>
                <li>
                  Coupons: <b>{catalogReport.coupons?.repaired?.length || 0}</b> re-created,{" "}
                  {catalogReport.coupons?.unchanged?.length || 0} already valid
                  {catalogReport.coupons?.failed?.length ? `, ${catalogReport.coupons.failed.length} failed` : ""}
                </li>
              </ul>
            )}
            {[...(catalogReport.plans?.failed || []), ...(catalogReport.coupons?.failed || [])].map((f) => (
              <p key={f.code} className="mt-1 text-xs">
                <span className="font-mono font-semibold">{f.code}</span>: {f.error}
              </p>
            ))}
            {catalogReport.plans?.failed?.length || catalogReport.coupons?.failed?.length ? (
              <p className="mt-2 text-xs opacity-90">
                Re-run <code className="font-mono">node scripts/reconcileStripeCatalog.js --fix</code> once the cause is resolved.
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Enable / disable */}
      <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-4 border border-gray-200 p-4 dark:border-white/10">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Use this account for platform billing</p>
          <p className="mt-0.5 text-xs text-gray-500">
            When off, the server uses <code className="font-mono">STRIPE_SECRET_KEY</code>
            {cfg.envFallbackAvailable ? "." : " — which isn't set, so billing would be unavailable."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={cfg.enabled}
          onClick={onToggleEnabled}
          disabled={!!busy || (!cfg.hasSecretKey && !form.secretKey.trim())}
          title={!cfg.hasSecretKey && !form.secretKey.trim() ? "Add a secret key first" : undefined}
          className={cn("relative h-6 w-11 shrink-0 transition-colors disabled:opacity-40", cfg.enabled ? "bg-accent" : "bg-gray-300")}
        >
          <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 34 }} className={cn("absolute top-0.5 h-5 w-5 bg-white shadow", cfg.enabled ? "left-[22px]" : "left-0.5")} />
        </button>
      </motion.div>

      {/* Actions */}
      <motion.div variants={item} className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
        {dirty ? (
          <span className="mr-auto inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
          </span>
        ) : (
          <span className="mr-auto" />
        )}

        {cfg.hasSecretKey || cfg.publishableKey ? (
          <button type="button" onClick={() => setConfirmClear(true)} disabled={!!busy} className="inline-flex items-center gap-2 border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        ) : null}

        <button type="button" onClick={onTest} disabled={!!busy || (!cfg.hasSecretKey && !form.secretKey.trim())} className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/80">
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Test connection
        </button>

        <button type="button" onClick={onSave} disabled={!!busy || !dirty} className="inline-flex items-center gap-2 bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-light disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
        </button>
      </motion.div>

      {/* Remove confirmation */}
      <AnimatePresence>
        {confirmClear ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => !busy && setConfirmClear(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white p-6 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center bg-rose-50 text-rose-600"><AlertTriangle className="h-5 w-5" /></span>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Remove Stripe configuration?</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    The stored keys are deleted. Billing falls back to{" "}
                    <code className="font-mono">STRIPE_SECRET_KEY</code>
                    {cfg.envFallbackAvailable
                      ? "."
                      : ", which isn't set — tenant signup and renewals will start failing."}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setConfirmClear(false)} disabled={clearing} className="border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                <button type="button" onClick={onClear} disabled={clearing} className="inline-flex items-center gap-2 bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50">
                  {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* -- Account switch confirmation ---------------------------------------
          The dangerous save on this screen. Plan and coupon Stripe ids only
          resolve inside the account that created them, so pointing the platform
          at a new account strands every one of them -- and the breakage shows up
          at a tenant's checkout, not here. Naming the cost before the fact is
          the entire point of this dialog. */}
      <AnimatePresence>
        {accountSwitch ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => !busy && setAccountSwitch(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white p-6 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center bg-amber-50 text-amber-600"><ArrowRightLeft className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900">
                    {accountSwitch.certain ? "Switch to a different Stripe account?" : "Check the catalogue against this account?"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {accountSwitch.certain
                      ? "This key belongs to another account. Billing, plans and coupons all move with it."
                      : "No previous account is on record, so there's no way to tell whether the existing plans and coupons live in this one."}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 border border-gray-200 p-3 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Currently</p>
                  <p className="truncate font-medium text-gray-700">{accountSwitch.fromLabel}</p>
                </div>
                <ArrowRightLeft className="h-4 w-4 shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">New</p>
                  <p className="truncate font-medium text-gray-900">{accountSwitch.toLabel}</p>
                </div>
              </div>

              <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <p className="font-semibold">
                  {accountSwitch.plans} plan{accountSwitch.plans === 1 ? "" : "s"} and {accountSwitch.coupons} coupon
                  {accountSwitch.coupons === 1 ? "" : "s"}{" "}
                  {accountSwitch.certain ? "point at the old account." : "already reference a Stripe account."}
                </p>
                {accountSwitch.planNames?.length ? (
                  <p className="mt-1 opacity-90">{accountSwitch.planNames.join(", ")}</p>
                ) : null}
                <p className="mt-2 opacity-90">
                  {accountSwitch.certain
                    ? "They'll be re-created here automatically."
                    : "Each one is checked first and only re-created if it's missing, so this is safe to run even if it turns out to be the same account."}{" "}
                  Existing subscriptions keep billing in the old account until each tenant is
                  migrated &mdash; check <code className="font-mono">scripts/auditMrr.js</code> afterwards.
                </p>
                {accountSwitch.certain ? (
                  <p className="mt-2 opacity-90">
                    The stored webhook signing secret belongs to the old account and will be cleared &mdash;
                    create a new endpoint after switching.
                  </p>
                ) : null}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setAccountSwitch(null)} disabled={saving} className="border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                <button type="button" onClick={onConfirmSwitch} disabled={saving} className="inline-flex items-center gap-2 bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}{" "}
                  {accountSwitch.certain ? "Switch & re-create catalogue" : "Save & check catalogue"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Replacing an existing endpoint. Stripe hands out a signing secret only
          at creation, so an endpoint whose secret was never captured can only be
          recovered by making a new one -- which means deleting the old. */}
      <AnimatePresence>
        {webhookExisting ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => !busy && setWebhookExisting(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white p-6 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center bg-amber-50 text-amber-600"><Webhook className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900">Replace the existing endpoint?</h3>
                  <p className="mt-1 text-sm text-gray-500">{webhookExisting.message}</p>
                  {webhookExisting.id ? (
                    <p className="mt-2 font-mono text-[11px] text-gray-400">{webhookExisting.id}</p>
                  ) : null}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setWebhookExisting(null)} disabled={hooking} className="border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                <button type="button" onClick={() => onCreateWebhook(true)} disabled={hooking} className="inline-flex items-center gap-2 bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50">
                  {hooking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Replace
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

export default function PlatformSettings() {
  const { refreshPlatform } = useTenant();
  const [tab, setTab] = useState("general");
  // Hydrate from the session cache so revisits are instant — the loader only
  // shows on the very first, uncached open.
  const cached = platformService.getCached();
  const [loading, setLoading] = useState(!cached);
  const [saving, setSaving] = useState(false);
  const [busyAsset, setBusyAsset] = useState(null);
  const [form, setForm] = useState(cached ? toForm(cached) : DEFAULTS);
  // Open on the category holding the saved theme, so the highlighted swatch is
  // actually on screen — defaulting to the first category made a saved theme
  // look unapplied.
  const [themeCat, setThemeCat] = useState(
    () => getThemeById((cached ? toForm(cached) : DEFAULTS).branding.theme).categoryId,
  );
  // Snapshot of the last-saved values (excludes logos) → powers the dirty state
  // so "Save"/"Discard" only act when there's an actual unsaved edit.
  const savedRef = useRef(cached ? pickSaveable(toForm(cached)) : null);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // The Stripe tab is unmounted by the tab AnimatePresence on every switch.
  // Holding its draft here means a half-pasted key survives a detour to
  // Branding — it still dies when you leave the screen, which is the point.
  const stripeDraftRef = useRef(null);
  // Own draft ref: the tabs share an AnimatePresence, so each is unmounted on
  // every switch and a half-entered mailbox would otherwise be lost.
  const emailDraftRef = useRef(null);

  useEffect(() => {
    // Cached per session → only fetch (and show the loader) on first visit.
    if (platformService.getCached()) return;
    (async () => {
      try {
        const data = await withMinDelay(platformService.getSettings());
        const next = toForm(data);
        setForm(next);
        setThemeCat(getThemeById(next.branding.theme).categoryId); // follow the loaded theme
        savedRef.current = pickSaveable(next);
        setLoadError(null);
      } catch (err) {
        // A failed load left a BLANK settings form on screen; saving that would
        // have wiped the platform's real branding/contact details.
        setLoadError(err?.response?.data?.error || "Couldn't load platform settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [reloadKey]);

  // Dirty = the saveable fields differ from the last-saved snapshot.
  const isDirty =
    !!savedRef.current && JSON.stringify(pickSaveable(form)) !== JSON.stringify(savedRef.current);

  const up = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const upSocial = (k, v) => setForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, [k]: v } }));
  const upBrand = (k, v) => setForm((f) => ({ ...f, branding: { ...f.branding, [k]: v } }));

  const save = async () => {
    if (!isDirty || saving) return; // nothing changed, or already in flight
    setSaving(true);
    try {
      // updateSettings returns the server-normalized document (and keeps the
      // session cache fresh) — adopt it so any clamped/derived values stick.
      const updated = await platformService.updateSettings({
        name: form.name,
        tagline: form.tagline,
        description: form.description,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        address: form.address,
        socialLinks: form.socialLinks,
        branding: {
          primaryColor: form.branding.primaryColor,
          accentColor: form.branding.accentColor,
          backgroundColor: form.branding.backgroundColor,
          theme: form.branding.theme,
        },
      });
      const next = updated ? toForm(updated) : form;
      setForm(next);
      savedRef.current = pickSaveable(next);
      refreshPlatform(); // push the new name/colours to the live tab + loader instantly
      toast.success("Platform settings saved");
    } catch (err) {
      // The server rejects bad hex colours and malformed contact emails with a
      // specific reason — show it instead of a generic failure.
      toast.error(err?.response?.data?.error || "Failed to save platform settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!savedRef.current) return;
    // Revert only the saveable fields — keep the logos (already persisted).
    setForm((f) => ({
      ...f,
      ...savedRef.current,
      branding: { ...f.branding, ...savedRef.current.branding },
    }));
    toast("Reverted unsaved changes", { icon: "↩️" });
  };

  const onUpload = async (type, file) => {
    if (busyAsset) return; // one asset operation at a time
    // Catch the obvious rejections here so a 5MB-limit bounce isn't a round trip.
    if (!/^image\//.test(file?.type || "")) return toast.error("That file isn't an image");
    if (file.size > 5 * 1024 * 1024) return toast.error("Images must be 5MB or smaller");
    setBusyAsset(type);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await platformService.uploadAsset(type, fd);
      upBrand(data.field, data.url);
      refreshPlatform(); // a new logo/favicon shows in the tab immediately
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Upload failed");
    } finally {
      setBusyAsset(null);
    }
  };

  const onDeleteAsset = async (type) => {
    // Without the guard a double-click fired two DELETEs — the second 404s or
    // clears a slot the first already emptied.
    if (busyAsset) return;
    setBusyAsset(type);
    try {
      await platformService.deleteAsset(type);
      upBrand(SLOT_FIELD[type], "");
      refreshPlatform(); // reflect the removal in the tab immediately
      toast.success("Image removed");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to remove image");
    } finally {
      setBusyAsset(null);
    }
  };

  // Platform branding is a long form — warn before a reload/tab-close discards it.
  useEffect(() => {
    if (!isDirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const applyPreset = (t) =>
    setForm((f) => ({
      ...f,
      branding: { ...f.branding, primaryColor: t.primary, accentColor: t.accent, backgroundColor: t.bg, theme: t.id },
    }));

  if (loading) return <SALoader />;
  if (loadError) return <SAErrorState message={loadError} onRetry={() => { setLoadError(null); setLoading(true); setReloadKey((k) => k + 1); }} />;

  const social = [
    { key: "facebook", label: "Facebook", icon: Facebook, ph: "https://facebook.com/…" },
    { key: "instagram", label: "Instagram", icon: Instagram, ph: "https://instagram.com/…" },
    { key: "twitter", label: "X / Twitter", icon: Twitter, ph: "https://x.com/…" },
    { key: "linkedin", label: "LinkedIn", icon: Linkedin, ph: "https://linkedin.com/company/…" },
  ];

  return (
    // Sharp-corner variant of this screen: square every descendant's corners
    // (cards, tabs, pills, buttons, inputs, dropzones, swatches, previews) for an
    // angular look — matches the Organisations / OrganisationDetail screens.
    // MotionConfig honours the OS "reduce motion" preference for everything inside.
    <MotionConfig reducedMotion="user">
    <div className="[&_*]:!rounded-none">
      <SAPageHeader eyebrow="Platform" title="Platform Settings" subtitle="Your public marketing website's identity, branding and contact details." />

      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Tabs */}
        <nav className={`${card} overflow-hidden lg:sticky lg:top-24`}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn("relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors", active ? "text-white" : "text-gray-600 hover:bg-gray-50")}>
                {active ? (
                  <motion.span layoutId="saPlatformTab" className="absolute inset-0 z-0" style={{ background: "linear-gradient(135deg, var(--tenant-primary, #0f172a), var(--tenant-accent-grad, #10b981))" }} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
                    <span className="absolute inset-y-0 left-0 w-1 bg-accent" aria-hidden="true" />
                  </motion.span>
                ) : null}
                <Icon className={cn("relative z-[1] h-[18px] w-[18px] shrink-0", active ? "text-white" : "text-gray-400")} />
                <span className="relative z-[1] min-w-0 flex-1">
                  <span className={cn("block text-sm font-semibold leading-tight", active ? "text-white" : "text-gray-700")}>{t.label}</span>
                  <span className={cn("block text-[11px] leading-tight", active ? "text-white/70" : "text-gray-400")}>{t.desc}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className={`${card} p-6 lg:p-8`}>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22, ease: "easeOut" }}>
              {tab === "general" && (
                <div className="space-y-8">
                  <SectionHead icon={Building2} title="General" subtitle="The name and tagline shown across your marketing site." />
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="Platform name"><TextInput value={form.name} onChange={(e) => up("name", e.target.value)} placeholder="NGO Platform" /></Field>
                    <Field label="Tagline"><TextInput value={form.tagline} onChange={(e) => up("tagline", e.target.value)} placeholder="The all-in-one platform for charities" /></Field>
                  </div>
                  <Field label="Description" hint="A short blurb used in the footer.">
                    <textarea rows={3} value={form.description} onChange={(e) => up("description", e.target.value)} placeholder="What your platform does…" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
                  </Field>
                  <SaveBar saving={saving} dirty={isDirty} onSave={save} onDiscard={handleDiscard} />
                </div>
              )}

              {tab === "contact" && (
                <div className="space-y-8">
                  <SectionHead icon={Mail} title="Contact" subtitle="How visitors reach you — used in the footer and contact page." />
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="Contact email"><TextInput icon={Mail} value={form.contactEmail} onChange={(e) => up("contactEmail", e.target.value)} placeholder="support@ngoplatform.com" /></Field>
                    <div>
                      <label className={labelCls}>Contact phone</label>
                      <PhoneInput
                        country="au"
                        value={(form.contactPhone || "").replace(/^\+/, "")}
                        onChange={(val) => up("contactPhone", val ? `+${val}` : "")}
                        enableSearch
                        countryCodeEditable={false}
                        inputProps={{ name: "contactPhone" }}
                      />
                    </div>
                    <Field label="Address" className="sm:col-span-2"><TextInput icon={MapPin} value={form.address} onChange={(e) => up("address", e.target.value)} placeholder="Sydney, NSW, Australia" /></Field>
                  </div>
                  <SaveBar saving={saving} dirty={isDirty} onSave={save} onDiscard={handleDiscard} />
                </div>
              )}

              {tab === "social" && (
                <div className="space-y-8">
                  <SectionHead icon={Share2} title="Social links" subtitle="Shown as icons in the footer (only filled-in ones appear)." />
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {social.map((s) => (
                      <Field key={s.key} label={s.label}><TextInput icon={s.icon} value={form.socialLinks[s.key]} onChange={(e) => upSocial(s.key, e.target.value)} placeholder={s.ph} /></Field>
                    ))}
                  </div>
                  <SaveBar saving={saving} dirty={isDirty} onSave={save} onDiscard={handleDiscard} />
                </div>
              )}

              {tab === "branding" && (
                <div className="space-y-8">
                  <SectionHead icon={Palette} title="Website branding" subtitle="Logos, colours and theme for the public marketing site." />

                  {/* Logos — full light/dark/icon set (same UI as the tenant Branding screen) */}
                  <div className="space-y-8">
                    <div>
                      <h3 className="mb-1 text-sm font-semibold text-gray-800">Full logo</h3>
                      <p className="mb-4 text-xs text-gray-400">Shown in the navbar and footer. Add a light and a dark version so it stays legible on every surface.</p>
                      <div className="grid gap-6 sm:grid-cols-2">
                        <Dropzone label="Light logo · for dark backgrounds" hint="Light/white version. Shown in the dark footer." type="logo" value={form.branding.logo} previewBg="dark" wide busy={busyAsset === "logo"} onUpload={onUpload} onDelete={onDeleteAsset} />
                        <Dropzone label="Dark logo · for light backgrounds" hint="Dark version. Shown in the light navbar." type="logo-dark" value={form.branding.logoDark} previewBg="light" wide busy={busyAsset === "logo-dark"} onUpload={onUpload} onDelete={onDeleteAsset} />
                      </div>
                    </div>
                    <div className="border-t border-gray-100 pt-7">
                      <h3 className="mb-1 text-sm font-semibold text-gray-800">Icon / collapsed mark</h3>
                      <p className="mb-4 text-xs text-gray-400">The compact square mark — also used for the favicon.</p>
                      <div className="grid gap-6 sm:grid-cols-2">
                        <Dropzone label="Light icon · for dark backgrounds" hint="Light square mark. 64×64px+." type="icon-logo" value={form.branding.iconLogo} previewBg="dark" busy={busyAsset === "icon-logo"} onUpload={onUpload} onDelete={onDeleteAsset} />
                        <Dropzone label="Dark icon · for light backgrounds" hint="Dark square mark. Favicon on a light tab. 64×64px+." type="icon-logo-dark" value={form.branding.iconLogoDark} previewBg="light" busy={busyAsset === "icon-logo-dark"} onUpload={onUpload} onDelete={onDeleteAsset} />
                      </div>
                    </div>
                    <div className="border-t border-gray-100 pt-7">
                      <h3 className="mb-1 text-sm font-semibold text-gray-800">Favicon</h3>
                      <p className="mb-4 text-xs text-gray-400">Browser tab icon. Falls back to the dark icon if left empty.</p>
                      <div className="max-w-xs">
                        <Dropzone label="Favicon image" hint="Square PNG, SVG or ICO. 32–64px. Max 2MB." type="favicon" value={form.branding.favicon} previewBg="light" busy={busyAsset === "favicon"} onUpload={onUpload} onDelete={onDeleteAsset} />
                      </div>
                    </div>
                  </div>

                  {/* Live preview */}
                  <div className="border-t border-gray-100 pt-6">
                    <p className="mb-3 text-sm font-semibold text-gray-800">Live preview</p>
                    <LivePreview branding={form.branding} name={form.name} />
                  </div>

                  {/* Colour theme */}
                  <div className="border-t border-gray-100 pt-6">
                    <p className="text-sm font-semibold text-gray-800">Colour theme</p>
                    <p className="mt-0.5 text-xs text-gray-400">Recolours the whole marketing site — navbar, buttons, footer gradient, borders and accents.</p>
                    <p className="mt-1 text-xs text-gray-400">
                      <span className="font-medium text-gray-500">Public, and saved for everyone.</span> This does not recolour
                      the operator console — that&apos;s Settings → Appearance, which is per-operator.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {themeCategories.map((c) => (
                        <button key={c.id} type="button" onClick={() => setThemeCat(c.id)} className={cn("whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors", themeCat === c.id ? "bg-accent text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
                          {c.name}
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                      {themeCategories.find((c) => c.id === themeCat)?.themes.map((t) => {
                        const active = form.branding.theme === t.id;
                        return (
                          <button key={t.id} type="button" onClick={() => applyPreset(t)} title={t.desc} className={cn("relative rounded-lg border-2 p-2.5 text-left transition-all", active ? "border-accent shadow-md shadow-accent/10" : "border-gray-100 hover:border-gray-200 dark:border-white/10")}>
                            {active && <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-accent"><Check className="h-2.5 w-2.5 text-white" /></span>}
                            <span className="mb-2 flex h-9 overflow-hidden rounded-md border border-black/5">
                              <span className="flex-1" style={{ background: t.primary }} />
                              <span className="flex-1" style={{ background: t.accent }} />
                              <span className="flex-1" style={{ background: t.bg }} />
                            </span>
                            <span className="block truncate text-xs font-semibold text-gray-800">{t.name}</span>
                            <span className="block truncate text-[10px] text-gray-400">{t.desc}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom colours */}
                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {[
                        { label: "Primary", key: "primaryColor", hint: "Headings & footer" },
                        { label: "Accent", key: "accentColor", hint: "Buttons & links" },
                        { label: "Background", key: "backgroundColor", hint: "Page background" },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className="mb-0.5 block text-xs font-medium text-gray-700">{f.label}</label>
                          <p className="mb-1.5 text-[11px] text-gray-400">{f.hint}</p>
                          <div className="flex items-center gap-2">
                            <input type="color" value={form.branding[f.key]} onChange={(e) => upBrand(f.key, e.target.value)} className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-gray-200 p-0.5 dark:border-white/10" />
                            <input type="text" value={form.branding[f.key]} maxLength={7} onChange={(e) => upBrand(f.key, e.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm uppercase text-gray-800 outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <SaveBar saving={saving} dirty={isDirty} onSave={save} onDiscard={handleDiscard} />
                </div>
              )}

              {tab === "stripe" && <StripeTab draftRef={stripeDraftRef} />}

              {tab === "email" && <EmailTab draftRef={emailDraftRef} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
    </MotionConfig>
  );
}

// On a Vite hot-reload the service module survives, so its session cache would
// keep serving stale data. Drop it on dispose → the remounted screen re-fetches
// from the API and updates state. Dev-only: stripped from production builds.
if (import.meta.hot) {
  import.meta.hot.dispose(() => platformService.clearCache());
}
