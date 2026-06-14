import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  Loader2,
  Eye,
  EyeOff,
  User,
  MapPin,
  Lock,
  Mail,
  ShieldCheck,
  Save,
  CalendarDays,
  Globe,
  Building2,
  Hash,
  Home,
  Map,
  ChevronDown,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "./phone-input.css";
import { toast } from "react-hot-toast";
import ProfileService from "../../services/profile.service";
import { useAuth } from "../../context/AuthContext";
import { TabLoader } from "../../components/TabLoader";
import { cn } from "../../utils/cn";
import { withMinDelay } from "../../utils/minDelay";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// Avatars are full S3 URLs going forward; tolerate legacy relative paths and
// the old "/api/placeholder" sentinel (treated as "no image").
function resolveAvatar(path) {
  if (!path || path.includes("/api/placeholder")) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${API_BASE}/${String(path).replace(/\\/g, "/").replace(/^\/+/, "")}`;
}

function initialsOf(name) {
  if (!name) return "A";
  const p = name.trim().split(/\s+/);
  return (p[0][0] + (p[1]?.[0] || "")).toUpperCase();
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const COUNTRIES = [
  { code: "AF", name: "Afghanistan" }, { code: "AL", name: "Albania" }, { code: "DZ", name: "Algeria" },
  { code: "AR", name: "Argentina" }, { code: "AU", name: "Australia" }, { code: "AT", name: "Austria" },
  { code: "BH", name: "Bahrain" }, { code: "BD", name: "Bangladesh" }, { code: "BB", name: "Barbados" },
  { code: "BE", name: "Belgium" }, { code: "BT", name: "Bhutan" }, { code: "BO", name: "Bolivia" },
  { code: "BR", name: "Brazil" }, { code: "BG", name: "Bulgaria" }, { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" }, { code: "CA", name: "Canada" }, { code: "CL", name: "Chile" },
  { code: "CN", name: "China" }, { code: "CO", name: "Colombia" }, { code: "CR", name: "Costa Rica" },
  { code: "HR", name: "Croatia" }, { code: "CU", name: "Cuba" }, { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" }, { code: "DK", name: "Denmark" }, { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" }, { code: "EG", name: "Egypt" }, { code: "EE", name: "Estonia" },
  { code: "ET", name: "Ethiopia" }, { code: "FJ", name: "Fiji" }, { code: "FI", name: "Finland" },
  { code: "FR", name: "France" }, { code: "DE", name: "Germany" }, { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" }, { code: "GT", name: "Guatemala" }, { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" }, { code: "IS", name: "Iceland" }, { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" }, { code: "IR", name: "Iran" }, { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" }, { code: "IL", name: "Israel" }, { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" }, { code: "JP", name: "Japan" }, { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" }, { code: "KE", name: "Kenya" }, { code: "KW", name: "Kuwait" },
  { code: "LV", name: "Latvia" }, { code: "LB", name: "Lebanon" }, { code: "LY", name: "Libya" },
  { code: "LT", name: "Lithuania" }, { code: "LU", name: "Luxembourg" }, { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" }, { code: "MT", name: "Malta" }, { code: "MX", name: "Mexico" },
  { code: "MA", name: "Morocco" }, { code: "NP", name: "Nepal" }, { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" }, { code: "NG", name: "Nigeria" }, { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" }, { code: "PK", name: "Pakistan" }, { code: "PS", name: "Palestine" },
  { code: "PA", name: "Panama" }, { code: "PE", name: "Peru" }, { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" }, { code: "PT", name: "Portugal" }, { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" }, { code: "RU", name: "Russia" }, { code: "RW", name: "Rwanda" },
  { code: "SA", name: "Saudi Arabia" }, { code: "SN", name: "Senegal" }, { code: "RS", name: "Serbia" },
  { code: "SG", name: "Singapore" }, { code: "SK", name: "Slovakia" }, { code: "SI", name: "Slovenia" },
  { code: "SO", name: "Somalia" }, { code: "ZA", name: "South Africa" }, { code: "KR", name: "South Korea" },
  { code: "ES", name: "Spain" }, { code: "LK", name: "Sri Lanka" }, { code: "SD", name: "Sudan" },
  { code: "SE", name: "Sweden" }, { code: "CH", name: "Switzerland" }, { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" }, { code: "TZ", name: "Tanzania" }, { code: "TH", name: "Thailand" },
  { code: "TN", name: "Tunisia" }, { code: "TR", name: "Türkiye" }, { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" }, { code: "AE", name: "United Arab Emirates" }, { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" }, { code: "UY", name: "Uruguay" }, { code: "UZ", name: "Uzbekistan" },
  { code: "VE", name: "Venezuela" }, { code: "VN", name: "Vietnam" }, { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" }, { code: "ZW", name: "Zimbabwe" },
];

const TABS = [
  { id: "personal", label: "Personal", desc: "Name & contact", icon: User },
  { id: "address", label: "Address", desc: "Where you're based", icon: MapPin },
  { id: "security", label: "Security", desc: "Password", icon: Lock },
];

const labelCls = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500";
// Underline "line" field — transparent, bottom border only, accent on focus.
const lineWrap = "flex items-center gap-2.5 border-b border-gray-200 transition-colors focus-within:border-accent";
const lineInput = "w-full bg-transparent py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:opacity-60";

function Field({ label, hint, children, className }) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

// Underline text field with an optional leading icon + right slot.
function TextInput({ icon: Icon, rightSlot, className, ...props }) {
  return (
    <div className={lineWrap}>
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-gray-400" /> : null}
      <input {...props} className={cn(lineInput, className)} />
      {rightSlot}
    </div>
  );
}

// Custom dropdown — replaces the native <select>: searchable, opens up or down
// based on available space, themeable, dark-mode-aware. Closes on outside-click,
// Escape, or selection.
function CustomSelect({ icon: Icon, value, onChange, options, placeholder = "Select…" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const spaceBelow = window.innerHeight - rect.bottom;
        // Open upward when there isn't room below and there's more room above.
        setDropUp(spaceBelow < 320 && rect.top > spaceBelow);
      }
      setQuery("");
    }
    setOpen((v) => !v);
  };

  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
    : options;

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(lineWrap, "w-full text-left")}
      >
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-gray-400" /> : null}
        <span className={cn("flex-1 truncate py-2.5 text-sm", selected ? "text-gray-800" : "text-gray-400")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: dropUp ? 6 : -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: dropUp ? 6 : -6 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          style={{ transformOrigin: dropUp ? "bottom" : "top" }}
          className={cn(
            "absolute left-0 right-0 z-30 overflow-hidden border border-gray-100 bg-white shadow-xl dark:border-white/10 dark:bg-[var(--admin-elevated)]",
            dropUp ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          <div className="border-b border-gray-100 p-2 dark:border-white/10">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries…"
              className="w-full bg-transparent px-2 py-1.5 text-sm text-gray-800 outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="max-h-56 overflow-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-5 text-center text-sm text-gray-400">No matches</p>
            ) : (
              filtered.map((o) => {
                const isSel = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                      isSel
                        ? "bg-accent/10 font-medium text-accent"
                        : "text-gray-700 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/5",
                    )}
                  >
                    <span className="flex-1 truncate">{o.label}</span>
                    {isSel ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SectionHead({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="mt-0.5 text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

function PasswordField({ label, name, value, onChange, minLength, hint }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} hint={hint}>
      <TextInput
        icon={Lock}
        type={show ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        minLength={minLength}
        required
        rightSlot={
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />
    </Field>
  );
}

// Score a password 0–4 from length + character variety.
function scorePassword(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  let variety = 0;
  if (/[a-z]/.test(pw)) variety++;
  if (/[A-Z]/.test(pw)) variety++;
  if (/\d/.test(pw)) variety++;
  if (/[^A-Za-z0-9]/.test(pw)) variety++;
  if (variety >= 2) score++;
  if (variety >= 3) score++;
  return Math.min(score, 4);
}

const PASSWORD_STRENGTH = [
  { label: "", bar: "", text: "" },
  { label: "Weak", bar: "bg-red-500", text: "text-red-600" },
  { label: "Fair", bar: "bg-orange-500", text: "text-orange-600" },
  { label: "Good", bar: "bg-amber-500", text: "text-amber-600" },
  { label: "Strong", bar: "bg-green-500", text: "text-green-600" },
];

// Live strength meter — a 4-segment bar that fills/colours with the score.
function PasswordStrength({ value }) {
  if (!value) return null;
  const score = scorePassword(value);
  const s = PASSWORD_STRENGTH[score];
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 transition-colors",
              i <= score ? s.bar : "bg-gray-200",
            )}
          />
        ))}
      </div>
      <p className={cn("mt-1.5 text-xs font-medium", s.text)}>
        Password strength: {s.label}
      </p>
    </div>
  );
}

function SaveButton({ saving, children }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="inline-flex items-center gap-2 bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-light disabled:opacity-50"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {children}
    </button>
  );
}

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "",
  profileImage: "",
  role: "",
  createdAt: null,
  passwordLastChanged: null,
  address: { street: "", city: "", state: "", postalCode: "" },
};

// Map a profile API payload to the form shape (reused by load + save).
function toForm(p) {
  return {
    firstName: p.firstName || "",
    lastName: p.lastName || "",
    email: p.email || "",
    phone: p.phone || "",
    country: p.country || "",
    profileImage: p.profileImage || "",
    role: p.role || "",
    createdAt: p.createdAt || null,
    passwordLastChanged: p.passwordLastChanged || null,
    address: {
      street: p.address?.street || "",
      city: p.address?.city || "",
      state: p.address?.state || "",
      postalCode: p.address?.postalCode || "",
    },
  };
}

export default function AdminProfile() {
  const { user, setUser } = useAuth();
  const fileRef = useRef(null);
  const [tab, setTab] = useState("personal");
  // If the profile is already cached (e.g. the layout prefetched it), start from
  // it instantly — the loader only shows on the very first, uncached open.
  const cachedProfile = ProfileService.getCached();
  const [loading, setLoading] = useState(!cachedProfile);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(cachedProfile ? toForm(cachedProfile) : emptyForm);
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    // Only hit the API when we don't already have the profile cached.
    if (!ProfileService.getCached()) fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      const p = await withMinDelay(ProfileService.getProfile());
      setForm(toForm(p));
    } catch (error) {
      toast.error(error.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  const onField = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onAddress = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, address: { ...prev.address, [name]: value } }));
  };

  const onPwd = (e) => {
    const { name, value } = e.target;
    setPwd((prev) => ({ ...prev, [name]: value }));
  };

  const onAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setUploading(true);
      const res = await ProfileService.uploadProfileImage(file);
      // Update local state everywhere — no reload/re-fetch needed.
      setForm((prev) => ({ ...prev, profileImage: res.imageUrl }));
      setUser((prev) => (prev ? { ...prev, profileImage: res.imageUrl } : prev));
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await ProfileService.updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        country: form.country,
        address: { ...form.address },
      });
      // Update from the response — no re-fetch, no loader flash.
      setForm((prev) => {
        const next = toForm(updated);
        return { ...next, profileImage: next.profileImage || prev.profileImage };
      });
      // Keep the header/sidebar name in sync without a reload.
      const fullName = `${updated.firstName || ""} ${updated.lastName || ""}`.trim();
      if (fullName) setUser((prev) => (prev ? { ...prev, name: fullName } : prev));
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    try {
      setSaving(true);
      const res = await ProfileService.updatePassword({
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      toast.success(res?.message || "Password updated");
      setPwd({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error.message || error.response?.data?.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const fullName =
    `${form.firstName} ${form.lastName}`.trim() ||
    user?.name ||
    (form.email ? form.email.split("@")[0] : "Admin");
  const roleLabel = (form.role || user?.role || "").includes("admin")
    ? "Administrator"
    : form.role || user?.role || "Member";
  const avatar = resolveAvatar(form.profileImage);
  const memberSince = formatDate(form.createdAt);
  const pwdChanged = formatDate(form.passwordLastChanged);

  const np = pwd.newPassword;
  const passwordReqs = [
    { label: "At least 6 characters", ok: np.length >= 6 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(np) },
    { label: "One lowercase letter", ok: /[a-z]/.test(np) },
    { label: "One number", ok: /\d/.test(np) },
    { label: "Passwords match", ok: np.length > 0 && np === pwd.confirmPassword },
  ];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* ── Top: compact identity banner ── */}
      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="h-20" style={{ background: "linear-gradient(120deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))" }} />
        <div className="flex flex-col gap-4 px-6 pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8">
          {/* Avatar + identity (side by side) */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative -mt-12 shrink-0">
              {avatar ? (
                <img src={avatar} alt={fullName} className="h-24 w-24 rounded-none object-cover ring-4 ring-white dark:ring-[var(--admin-card)]" />
              ) : (
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-none text-2xl font-bold text-white ring-4 ring-white dark:ring-[var(--admin-card)]"
                  style={{ background: "linear-gradient(135deg, var(--tenant-accent, #C9A84C), var(--tenant-accent-light, #D4B85A))" }}
                >
                  {initialsOf(fullName)}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center bg-accent text-white shadow-md ring-2 ring-white transition hover:bg-accent-light disabled:opacity-60 dark:ring-[var(--admin-card)]"
                aria-label="Change profile photo"
                title="Change profile photo"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onAvatarPick} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-gray-800 sm:text-2xl">{fullName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <p className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{form.email}</span>
                </p>
                <span className="inline-flex items-center gap-1.5 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
                  <ShieldCheck className="h-3.5 w-3.5" /> {roleLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Meta */}
          {(memberSince || pwdChanged) && (
            <div className="shrink-0 space-y-1.5 border-t border-gray-100 pt-3 text-xs text-gray-500 sm:border-0 sm:pt-0 sm:text-right">
              {memberSince ? (
                <p className="flex items-center gap-2 sm:justify-end">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" /> Member since {memberSince}
                </p>
              ) : null}
              {pwdChanged ? (
                <p className="flex items-center gap-2 sm:justify-end">
                  <Lock className="h-3.5 w-3.5 shrink-0" /> Password updated {pwdChanged}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ── Below: tabs (left) + form (right) ── */}
      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Tab nav */}
        <nav className="overflow-hidden border border-gray-100 bg-white shadow-sm lg:sticky lg:top-24">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  active ? "text-white" : "text-gray-600 hover:bg-gray-50",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="profileTabActive"
                    className="absolute inset-0 z-0"
                    style={{ background: "linear-gradient(135deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))" }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  >
                    <span className="absolute inset-y-0 left-0 w-1 bg-accent" aria-hidden="true" />
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

        {/* ── Right: form ── */}
        <div className="border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
          {tab === "personal" && (
            <form onSubmit={saveProfile} className="space-y-6">
              <SectionHead icon={User} title="Personal details" desc="Update your name and contact information." />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="First name">
                  <TextInput icon={User} name="firstName" value={form.firstName} onChange={onField} required placeholder="Jane" />
                </Field>
                <Field label="Last name">
                  <TextInput icon={User} name="lastName" value={form.lastName} onChange={onField} required placeholder="Doe" />
                </Field>
                <Field label="Email address" hint="Your email address can't be changed.">
                  <TextInput icon={Mail} name="email" value={form.email} disabled readOnly />
                </Field>
                <Field label="Phone number">
                  <PhoneInput
                    country="us"
                    value={(form.phone || "").replace(/^\+/, "")}
                    onChange={(val) => setForm((prev) => ({ ...prev, phone: val ? `+${val}` : "" }))}
                    enableSearch
                    countryCodeEditable={false}
                    inputProps={{ name: "phone" }}
                  />
                </Field>
                <Field label="Country" className="sm:col-span-2 sm:max-w-sm">
                  <CustomSelect
                    icon={Globe}
                    value={form.country}
                    onChange={(v) => setForm((prev) => ({ ...prev, country: v }))}
                    placeholder="Select country"
                    options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
                  />
                </Field>
              </div>
              <div className="flex justify-end border-t border-gray-100 pt-6">
                <SaveButton saving={saving}>Save changes</SaveButton>
              </div>
            </form>
          )}

          {tab === "address" && (
            <form onSubmit={saveProfile} className="space-y-6">
              <SectionHead icon={MapPin} title="Address" desc="Where you're based." />
              <div className="space-y-5">
                <Field label="Street address">
                  <TextInput icon={Home} name="street" value={form.address.street} onChange={onAddress} placeholder="123 Main Street" />
                </Field>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="City">
                    <TextInput icon={Building2} name="city" value={form.address.city} onChange={onAddress} placeholder="City" />
                  </Field>
                  <Field label="State / Province">
                    <TextInput icon={Map} name="state" value={form.address.state} onChange={onAddress} placeholder="State" />
                  </Field>
                </div>
                <Field label="Postal code" className="sm:max-w-xs">
                  <TextInput icon={Hash} name="postalCode" value={form.address.postalCode} onChange={onAddress} placeholder="00000" />
                </Field>
              </div>
              <div className="flex justify-end border-t border-gray-100 pt-6">
                <SaveButton saving={saving}>Save address</SaveButton>
              </div>
            </form>
          )}

          {tab === "security" && (
            <form onSubmit={savePassword} className="space-y-6">
              <SectionHead
                icon={Lock}
                title="Change password"
                desc={pwdChanged ? `Last changed ${pwdChanged}.` : "Choose a strong, unique password."}
              />
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Fields */}
                <div className="space-y-5">
                  <PasswordField label="Current password" name="currentPassword" value={pwd.currentPassword} onChange={onPwd} />
                  <div>
                    <PasswordField label="New password" name="newPassword" value={pwd.newPassword} onChange={onPwd} minLength={6} />
                    <PasswordStrength value={pwd.newPassword} />
                  </div>
                  <PasswordField label="Confirm new password" name="confirmPassword" value={pwd.confirmPassword} onChange={onPwd} minLength={6} />
                </div>

                {/* Live requirements */}
                <div className="self-start border border-gray-100 bg-gray-50 p-5">
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <ShieldCheck className="h-4 w-4 text-accent" /> Password requirements
                  </p>
                  <p className="mt-1 text-xs text-gray-500">A strong password keeps your account safe.</p>
                  <ul className="mt-4 space-y-2.5">
                    {passwordReqs.map((r) => (
                      <li key={r.label} className="flex items-center gap-2.5 text-sm">
                        <span
                          className={cn(
                            "grid h-5 w-5 shrink-0 place-items-center transition-colors",
                            r.ok ? "bg-accent text-white" : "bg-gray-200 text-gray-400",
                          )}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                        <span className={cn("transition-colors", r.ok ? "text-gray-700" : "text-gray-400")}>{r.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex justify-end border-t border-gray-100 pt-6">
                <SaveButton saving={saving}>Update password</SaveButton>
              </div>
            </form>
          )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
