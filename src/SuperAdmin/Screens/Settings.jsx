import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, Palette, Camera, Loader2, Save, Mail, Eye, EyeOff, Check, Sun, Moon, PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { ShieldAlert, Smartphone, KeyRound } from "lucide-react";
import OtpInput from "../../components/OtpInput";
import ProfileService from "../../services/profile.service";
import AuthService from "../../services/auth.service";
import { useAuth } from "../../context/AuthContext";
import { useAdminUi } from "../../context/AdminUiContext";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import { useSATheme } from "../saTheme";
import SAPageHeader from "../components/SAPageHeader";
import SALoader from "../SALoader";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
// Tenant's underline + dark-mode phone styling, scoped to [data-admin-theme]
// (which this console also uses).
import "../../Admin/Screens/phone-input.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

function resolveAvatar(path) {
  if (!path || path.includes("/api/placeholder")) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${API_BASE}/${String(path).replace(/\\/g, "/").replace(/^\/+/, "")}`;
}
function initialsOf(name) {
  if (!name) return "SA";
  const p = name.trim().split(/\s+/);
  return (p[0][0] + (p[1]?.[0] || "")).toUpperCase();
}

// Map a profile API/cache payload to the form shape — reused by cached
// hydration, the first-load fetch, and the post-save sync.
function toForm(p = {}) {
  return {
    firstName: p.firstName || "",
    lastName: p.lastName || "",
    email: p.email || "",
    phone: p.phone || "",
    profileImage: p.profileImage || "",
    role: p.role || "",
  };
}

const TABS = [
  { id: "profile", label: "Profile", desc: "Your details", icon: User },
  { id: "password", label: "Password", desc: "Change password", icon: Lock },
  { id: "security", label: "Security", desc: "Two-factor auth", icon: ShieldCheck },
  { id: "appearance", label: "Appearance", desc: "Theme & layout", icon: Palette },
];

const labelCls = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500";
const lineWrap = "flex items-center gap-2.5 border-b border-gray-200 transition-colors focus-within:border-accent dark:border-white/10";
const lineInput = "w-full bg-transparent py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:opacity-60";
const card = "rounded-xl border border-gray-100 bg-white shadow-sm";

function Field({ label, hint, children, className }) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

function TextInput({ icon: Icon, rightSlot, ...props }) {
  return (
    <div className={lineWrap}>
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-gray-400" /> : null}
      <input {...props} className={lineInput} />
      {rightSlot}
    </div>
  );
}

function PasswordField({ label, name, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label}>
      <TextInput
        icon={Lock}
        type={show ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        rightSlot={
          <button type="button" onClick={() => setShow((v) => !v)} className="shrink-0 text-gray-400 transition-colors hover:text-gray-600" aria-label={show ? "Hide" : "Show"}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />
    </Field>
  );
}

function SaveButton({ saving, children }) {
  return (
    <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-light disabled:opacity-50">
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {children}
    </button>
  );
}

/* Theme / layout segmented control */
function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-white/10">
      {options.map((o) => {
        const active = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              active ? "bg-accent text-white shadow-sm" : "text-gray-500 hover:text-gray-800",
            )}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null} {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function SASettings() {
  const { user, setUser } = useAuth();
  const { theme, toggleTheme, sidebarCollapsed, setSidebarCollapsed } = useAdminUi();
  const { themeId, primary, accent, bg, setTheme, setColor, reset, categories } = useSATheme();
  const [themeCat, setThemeCat] = useState(categories[0]?.id || "warm");
  const fileRef = useRef(null);
  const [tab, setTab] = useState("profile");
  // Hydrate from the session caches so revisits are instant (no loader/flicker,
  // no empty-field flash) — both only fetch on the first, uncached open.
  const cachedProfile = ProfileService.getCached?.();
  const cachedMfa = AuthService.getCachedMfaStatus?.();
  const [loading, setLoading] = useState(!cachedProfile);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(cachedProfile ? toForm(cachedProfile) : toForm());
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [mfa, setMfa] = useState({ enabled: !!cachedMfa?.enabled });
  const [mfaSetup, setMfaSetup] = useState(null); // { secret, otpauthUrl }
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [disarming, setDisarming] = useState(false); // confirming a 2FA disable

  useEffect(() => {
    // Revalidate on every mount (navigation OR reload): a cached open renders
    // instantly and refreshes in the background (no loader); a fresh/uncached
    // open shows the loader while it fetches.
    const cached = ProfileService.getCached?.();
    (async () => {
      try {
        const p = cached
          ? await ProfileService.getProfile({ force: true }) // stale-while-revalidate
          : await withMinDelay(ProfileService.getProfile());
        setForm(toForm(p));
      } catch {
        if (!cached) toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Revalidate the 2FA status on every mount (the cached value shows first).
    AuthService.mfaStatus({ force: true })
      .then((d) => setMfa({ enabled: !!d.enabled }))
      .catch(() => {});
  }, []);

  const onField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const onPwd = (e) => setPwd((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const res = await ProfileService.uploadProfileImage(file);
      setForm((f) => ({ ...f, profileImage: res.imageUrl }));
      setUser((u) => (u ? { ...u, profileImage: res.imageUrl } : u));
      toast.success("Profile photo updated");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await ProfileService.updateProfile({ firstName: form.firstName, lastName: form.lastName, phone: form.phone });
      setForm((f) => ({ ...toForm(updated), profileImage: updated.profileImage || f.profileImage }));
      const fullName = `${updated.firstName || ""} ${updated.lastName || ""}`.trim();
      if (fullName) setUser((u) => (u ? { ...u, name: fullName } : u));
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirmPassword) return toast.error("New passwords don't match");
    setSaving(true);
    try {
      const res = await ProfileService.updatePassword({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      toast.success(res?.message || "Password updated");
      setPwd({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const startMfaSetup = async () => {
    setMfaBusy(true);
    try {
      const d = await AuthService.mfaSetup();
      setMfaSetup(d);
      setMfaCode("");
    } catch {
      toast.error("Failed to start 2FA setup");
    } finally {
      setMfaBusy(false);
    }
  };
  const enableMfa = async (codeArg) => {
    const code = codeArg || mfaCode;
    if (code.length !== 6) return toast.error("Enter the 6-digit code");
    setMfaBusy(true);
    try {
      await AuthService.mfaEnable(code);
      setMfa({ enabled: true });
      setMfaSetup(null);
      setMfaCode("");
      toast.success("Two-factor authentication enabled");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Invalid code");
      setMfaCode("");
    } finally {
      setMfaBusy(false);
    }
  };
  const disableMfa = async (codeArg) => {
    const code = codeArg || mfaCode;
    if (code.length !== 6) return toast.error("Enter your current 6-digit code");
    setMfaBusy(true);
    try {
      await AuthService.mfaDisable(code);
      setMfa({ enabled: false });
      setMfaSetup(null);
      setMfaCode("");
      setDisarming(false);
      toast.success("Two-factor authentication disabled");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to disable");
      setMfaCode("");
    } finally {
      setMfaBusy(false);
    }
  };

  const fullName = `${form.firstName} ${form.lastName}`.trim() || user?.name || (form.email ? form.email.split("@")[0] : "Super Admin");
  const avatar = resolveAvatar(form.profileImage);

  if (loading) return <SALoader />;

  return (
    <div>
      <SAPageHeader eyebrow="Account" title="Settings" subtitle="Manage your account and console preferences." />

      {/* Identity banner */}
      <div className={`${card} mb-6 overflow-hidden`}>
        <div className="h-20" style={{ background: "linear-gradient(120deg, var(--tenant-primary, #0f172a), var(--tenant-accent, #10b981))" }} />
        <div className="flex items-center gap-4 px-6 pb-5 sm:gap-5">
          <div className="relative -mt-12 shrink-0">
            {avatar ? (
              <img src={avatar} alt={fullName} className="h-24 w-24 rounded-2xl object-cover ring-4 ring-white dark:ring-[var(--admin-card)]" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl text-2xl font-bold text-white ring-4 ring-white dark:ring-[var(--admin-card)]" style={{ background: "linear-gradient(135deg, var(--tenant-accent, #10b981), var(--tenant-accent-light, #34d399))" }}>
                {initialsOf(fullName)}
              </div>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white shadow-md ring-2 ring-white transition hover:bg-accent-light disabled:opacity-60 dark:ring-[var(--admin-card)]" aria-label="Change photo">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onAvatarPick} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-gray-900">{fullName}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <p className="flex items-center gap-1.5 text-sm text-gray-500"><Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{form.email}</span></p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
                <ShieldCheck className="h-3.5 w-3.5" /> Super Admin
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + content */}
      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className={`${card} overflow-hidden lg:sticky lg:top-24`}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn("relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors", active ? "text-white" : "text-gray-600 hover:bg-gray-50")}>
                {active ? (
                  <motion.span layoutId="saSettingsTab" className="absolute inset-0 z-0" style={{ background: "linear-gradient(135deg, var(--tenant-primary, #0f172a), var(--tenant-accent, #10b981))" }} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
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

        <div className={`${card} p-6 lg:p-8`}>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22, ease: "easeOut" }}>
              {tab === "profile" && (
                <form onSubmit={saveProfile} className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><User className="h-5 w-5" /></span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Personal details</h3>
                      <p className="mt-0.5 text-sm text-gray-500">Update your name and contact information.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="First name"><TextInput icon={User} name="firstName" value={form.firstName} onChange={onField} placeholder="Jane" /></Field>
                    <Field label="Last name"><TextInput icon={User} name="lastName" value={form.lastName} onChange={onField} placeholder="Doe" /></Field>
                    <Field label="Email address" hint="Your email address can't be changed."><TextInput icon={Mail} name="email" value={form.email} disabled readOnly /></Field>
                    <div>
                      <label className={labelCls}>Phone number</label>
                      <PhoneInput
                        country="au"
                        value={(form.phone || "").replace(/^\+/, "")}
                        onChange={(val) => setForm((f) => ({ ...f, phone: val ? `+${val}` : "" }))}
                        enableSearch
                        countryCodeEditable={false}
                        inputProps={{ name: "phone" }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end border-t border-gray-100 pt-6"><SaveButton saving={saving}>Save changes</SaveButton></div>
                </form>
              )}

              {tab === "password" && (
                <form onSubmit={savePassword} className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Lock className="h-5 w-5" /></span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Change password</h3>
                      <p className="mt-0.5 text-sm text-gray-500">Choose a strong, unique password.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <PasswordField label="Current password" name="currentPassword" value={pwd.currentPassword} onChange={onPwd} />
                    <PasswordField label="New password" name="newPassword" value={pwd.newPassword} onChange={onPwd} />
                    <PasswordField label="Confirm new" name="confirmPassword" value={pwd.confirmPassword} onChange={onPwd} />
                  </div>
                  <div className="flex justify-end border-t border-gray-100 pt-6"><SaveButton saving={saving}>Update password</SaveButton></div>
                </form>
              )}

              {tab === "security" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><ShieldCheck className="h-5 w-5" /></span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Two-factor authentication</h3>
                      <p className="mt-0.5 text-sm text-gray-500">Require a time-based code from an authenticator app at sign-in.</p>
                    </div>
                  </div>

                  {mfa.enabled ? (
                    !disarming ? (
                      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-transparent">
                        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20"><ShieldCheck className="h-6 w-6" /></span>
                            <div>
                              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                                Two-factor authentication is on
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"><Check className="h-3 w-3" /> Active</span>
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">Your account asks for an authenticator code at every sign-in.</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => { setDisarming(true); setMfaCode(""); }} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:bg-transparent">
                            <ShieldAlert className="h-4 w-4" /> Disable
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 dark:border-red-500/25 dark:bg-red-500/5">
                        <div className="mb-5 flex items-start gap-3">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/20"><ShieldAlert className="h-5 w-5" /></span>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Disable two-factor authentication?</h4>
                            <p className="mt-0.5 text-xs text-gray-500">Enter a current code from your authenticator app to confirm. Your account will be less protected.</p>
                          </div>
                        </div>
                        <OtpInput value={mfaCode} onChange={setMfaCode} disabled={mfaBusy} autoFocus onComplete={(c) => disableMfa(c)} />
                        <div className="mt-5 flex gap-3">
                          <button type="button" onClick={() => { setDisarming(false); setMfaCode(""); }} className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-white/80">Cancel</button>
                          <button type="button" onClick={() => disableMfa()} disabled={mfaBusy || mfaCode.length !== 6} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50">
                            {mfaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />} Disable 2FA
                          </button>
                        </div>
                      </div>
                    )
                  ) : mfaSetup ? (
                    <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/10">
                      {/* Step 1 — scan */}
                      <div className="flex flex-col gap-5 border-b border-gray-100 p-6 dark:border-white/10 sm:flex-row sm:items-start">
                        <div className="mx-auto shrink-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:mx-0">
                          <QRCodeSVG value={mfaSetup.otpauthUrl} size={168} level="M" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 inline-flex items-center gap-2">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">1</span>
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white"><Smartphone className="h-4 w-4 text-accent" /> Scan with your authenticator app</span>
                          </div>
                          <p className="mb-3 text-xs leading-relaxed text-gray-500">Open Google Authenticator, Authy, Microsoft Authenticator or 1Password and point your camera at this code.</p>
                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
                            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400"><KeyRound className="h-3 w-3" /> Can't scan? Enter this key</div>
                            <p className="select-all break-all font-mono text-sm font-bold tracking-[0.16em] text-gray-900 dark:text-white">{mfaSetup.secret}</p>
                          </div>
                        </div>
                      </div>
                      {/* Step 2 — verify */}
                      <div className="p-6">
                        <div className="mb-3 inline-flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">2</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">Enter the 6-digit code</span>
                        </div>
                        <OtpInput value={mfaCode} onChange={setMfaCode} disabled={mfaBusy} autoFocus onComplete={(c) => enableMfa(c)} />
                        <div className="mt-5 flex gap-3">
                          <button type="button" onClick={() => { setMfaSetup(null); setMfaCode(""); }} className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-white/80">Cancel</button>
                          <button type="button" onClick={() => enableMfa()} disabled={mfaBusy || mfaCode.length !== 6} className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-light disabled:opacity-50">
                            {mfaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Verify &amp; Enable
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-6 text-center dark:border-white/10 dark:bg-white/5 sm:p-8">
                      <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent"><ShieldCheck className="h-7 w-7" /></span>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">Add an extra layer of security</h4>
                      <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">Protect your operator account with an authenticator app. You'll enter a rotating 6-digit code each time you sign in.</p>
                      <button type="button" onClick={startMfaSetup} disabled={mfaBusy} className="mx-auto mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-light disabled:opacity-50">
                        {mfaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Enable 2FA
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tab === "appearance" && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Palette className="h-5 w-5" /></span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Appearance</h3>
                      <p className="mt-0.5 text-sm text-gray-500">Personalise how the console looks for you.</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Theme</p>
                      <p className="mt-0.5 text-xs text-gray-400">Switch between a light and dark console.</p>
                    </div>
                    <Segmented
                      value={theme}
                      onChange={(v) => { if (v !== theme) toggleTheme(); }}
                      options={[{ value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }]}
                    />
                  </div>

                  <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Sidebar layout</p>
                      <p className="mt-0.5 text-xs text-gray-400">Start with the navigation expanded or collapsed to icons.</p>
                    </div>
                    <Segmented
                      value={sidebarCollapsed ? "collapsed" : "expanded"}
                      onChange={(v) => setSidebarCollapsed(v === "collapsed")}
                      options={[{ value: "expanded", label: "Expanded", icon: PanelLeftOpen }, { value: "collapsed", label: "Collapsed", icon: PanelLeftClose }]}
                    />
                  </div>

                  {/* Colour theme */}
                  <div className="border-t border-gray-100 pt-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Colour theme</p>
                        <p className="mt-0.5 text-xs text-gray-400">Recolours the whole console — sidebar gradient, accents, charts and background.</p>
                      </div>
                      <button type="button" onClick={reset} className="shrink-0 text-xs font-medium text-accent hover:underline">Reset</button>
                    </div>

                    {/* Category tabs */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setThemeCat(c.id)}
                          className={cn(
                            "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                            themeCat === c.id ? "bg-accent text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                          )}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>

                    {/* Theme preset cards */}
                    <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                      {categories.find((c) => c.id === themeCat)?.themes.map((t) => {
                        const active = themeId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTheme(t)}
                            title={t.desc}
                            className={cn(
                              "relative rounded-lg border-2 p-2.5 text-left transition-all",
                              active ? "border-accent shadow-md shadow-accent/10" : "border-gray-100 hover:border-gray-200 dark:border-white/10",
                            )}
                          >
                            {active && (
                              <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-accent">
                                <Check className="h-2.5 w-2.5 text-white" />
                              </span>
                            )}
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
                        { label: "Primary", key: "primary", val: primary, hint: "Frame & headings" },
                        { label: "Accent", key: "accent", val: accent, hint: "Buttons & highlights" },
                        { label: "Background", key: "bg", val: bg, hint: "Page background" },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className="mb-0.5 block text-xs font-medium text-gray-700">{f.label}</label>
                          <p className="mb-1.5 text-[11px] text-gray-400">{f.hint}</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={f.val}
                              onChange={(e) => setColor(f.key, e.target.value)}
                              className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-gray-200 p-0.5 dark:border-white/10"
                            />
                            <input
                              type="text"
                              value={f.val}
                              maxLength={7}
                              onChange={(e) => setColor(f.key, e.target.value)}
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm uppercase text-gray-800 outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                    <Check className="h-3.5 w-3.5 shrink-0 text-accent" /> These preferences are saved to this browser and apply across the platform console.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// On a Vite hot-reload the service modules survive, so their session caches
// would keep serving stale data. Drop them on dispose → the remounted screen
// re-fetches from the API and updates state. Dev-only: stripped from prod.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    ProfileService.clearCache?.();
    AuthService.clearMfaStatusCache?.();
  });
}
