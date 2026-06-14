import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "../../components/Portal";
import { TabLoader } from "../../components/TabLoader";
import {
  Upload,
  Trash2,
  Check,
  Palette,
  Image as ImageIcon,
  Loader2,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  HeartHandshake,
  Globe,
  PanelLeft,
  Star,
  Circle,
  RotateCcw,
  Eye,
  X,
} from "lucide-react";
import brandingService from "../../services/branding.service";
import themeCategories, { getThemeById } from "../../config/themePresets";
import { cn } from "../../utils/cn";
import { withMinDelay } from "../../utils/minDelay";
import toast from "react-hot-toast";

// Draft fields that require an explicit "Save" (images persist on upload).
const DRAFT_KEYS = ["siteTitle", "tagline", "faviconUseIcon", "primaryColor", "accentColor", "backgroundColor", "theme"];
const pickDraft = (b) => DRAFT_KEYS.reduce((acc, k) => ({ ...acc, [k]: b[k] }), {});

const ACCENT_GRADIENT = "linear-gradient(135deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))";

const DEFAULT_BRANDING = {
  logo: "", logoDark: "", iconLogo: "", iconLogoDark: "", favicon: "",
  faviconUseIcon: true, siteTitle: "", tagline: "",
  primaryColor: "#2C2418", accentColor: "#C9A84C", backgroundColor: "#FAF7F2", theme: "default",
};

// Map the raw branding payload → the screen's editable shape, with defaults.
function toBranding(b = {}) {
  return {
    logo: b.logo || "", logoDark: b.logoDark || "", iconLogo: b.iconLogo || "",
    iconLogoDark: b.iconLogoDark || "", favicon: b.favicon || "",
    faviconUseIcon: b.faviconUseIcon !== false, siteTitle: b.siteTitle || "", tagline: b.tagline || "",
    primaryColor: b.primaryColor || "#2C2418", accentColor: b.accentColor || "#C9A84C",
    backgroundColor: b.backgroundColor || "#FAF7F2", theme: b.theme || "default",
  };
}

const TABS = [
  { id: "logos", label: "Identity", desc: "Logo & tagline", icon: ImageIcon },
  { id: "browser", label: "Browser Tab", desc: "Title & favicon", icon: Globe },
  { id: "theme", label: "Theme", desc: "Colours & palette", icon: Palette },
  { id: "request", label: "Request a change", desc: "Ask platform admin", icon: Send },
];

/* ── small pieces ─────────────────────────────────────────────────────────── */

function Switch({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", checked ? "bg-accent" : "bg-gray-300")}
      >
        <span className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform" style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }} />
      </button>
      {label && <span className="text-sm text-primary">{label}</span>}
    </label>
  );
}

function SectionHead({ icon: Icon, title, desc }) {
  return (
    <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <p className="mt-0.5 text-sm text-text-muted">{desc}</p>
      </div>
    </div>
  );
}

/** Drag-and-drop image slot with hover/drag/busy states and inline preview. */
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
        <span className="text-sm font-medium text-primary">{label}</span>
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
          "group relative flex h-32 cursor-pointer items-center justify-center overflow-hidden border-2 border-dashed transition-all",
          drag ? "border-accent bg-accent/5" : dark ? "border-white/15 bg-gray-900 hover:border-accent/60" : "border-gray-200 bg-gray-50 hover:border-accent/60 hover:bg-gray-100/60",
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
            <p className={cn("text-xs font-medium", dark ? "text-white/80" : "text-primary")}>Click or drag &amp; drop</p>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-text-muted">{hint}</p>
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

const STATUS_META = {
  pending: { icon: Clock, color: "#ca8a04", bg: "bg-yellow-500/10", text: "text-yellow-600", label: "Pending review" },
  approved: { icon: CheckCircle, color: "#16a34a", bg: "bg-green-500/10", text: "text-green-600", label: "Approved" },
  rejected: { icon: XCircle, color: "#dc2626", bg: "bg-red-500/10", text: "text-red-600", label: "Rejected" },
};

// "20 Apr 2026 · 3 days ago"
function formatWhen(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const abs = d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  const rel =
    days <= 0 ? "today" : days === 1 ? "yesterday" : days < 30 ? `${days} days ago` : days < 365 ? `${Math.floor(days / 30)} mo ago` : `${Math.floor(days / 365)} yr ago`;
  return `${abs} · ${rel}`;
}

function RequestCard({ req }) {
  const meta = STATUS_META[req.status] || STATUS_META.pending;
  const Icon = meta.icon;
  const palette = req.requestedBranding || {};
  const swatches = ["primaryColor", "accentColor", "backgroundColor"].map((k) => palette[k]).filter(Boolean);
  return (
    <div className="overflow-hidden border border-gray-100" style={{ borderLeft: `3px solid ${meta.color}` }}>
      <div className="flex items-start gap-3 p-4">
        <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full", meta.bg, meta.text)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={cn("text-sm font-semibold", meta.text)}>{meta.label}</span>
            <span className="text-xs text-text-muted">· {formatWhen(req.createdAt)}</span>
          </div>
          {req.message ? <p className="mt-1.5 text-sm text-text-muted">“{req.message}”</p> : null}
        </div>
        {swatches.length ? (
          <div className="hidden shrink-0 items-center gap-1 pt-1 sm:flex">
            {swatches.map((c, i) => (
              <span key={i} className="h-5 w-5 rounded-full border border-gray-200" style={{ backgroundColor: c }} title={c} />
            ))}
          </div>
        ) : null}
      </div>
      {req.reviewNote ? (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Admin response</p>
          <p className="mt-1 text-sm text-primary">{req.reviewNote}</p>
        </div>
      ) : null}
    </div>
  );
}

/* ── main ─────────────────────────────────────────────────────────────────── */

// Compact browser/site mock reflecting the live colours, logo, favicon & title.
function SitePreview({ branding, tabTitle, favicon, orgSlug, orgName, logo, className = "" }) {
  return (
    <div className={cn("overflow-hidden border border-gray-100 shadow-sm dark:border-white/10", className)}>
      {/* Tab strip */}
      <div className="bg-gray-200/70 px-2.5 pt-2.5">
        <div className="inline-flex max-w-[220px] items-center gap-2 rounded-t-lg border border-b-0 border-gray-200 bg-white px-3 py-2">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
            {favicon ? <img src={favicon} alt="favicon" className="h-4 w-4 object-contain" /> : (
              <span className="flex h-4 w-4 items-center justify-center rounded-sm text-white" style={{ backgroundColor: branding.accentColor }}><HeartHandshake className="h-2.5 w-2.5" /></span>
            )}
          </span>
          <span className="truncate text-[11px] font-medium text-gray-800">{tabTitle}</span>
          <span className="text-xs leading-none text-gray-400">×</span>
        </div>
      </div>
      {/* Address bar */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-4 py-2">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        <div className="ml-2 flex h-5 flex-1 items-center rounded-full bg-white px-3">
          <span className="text-[9px] text-gray-400">{orgSlug}.{import.meta.env.VITE_ROOT_DOMAIN}</span>
        </div>
      </div>
      {/* Site content */}
      <div style={{ backgroundColor: branding.backgroundColor }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: branding.accentColor + "20" }}>
          <div className="flex items-center gap-2">
            {logo ? <img src={logo} alt="Logo" className="h-6 w-auto max-w-[110px] object-contain" /> : (
              <>
                <span className="flex h-6 w-6 items-center justify-center rounded text-white" style={{ backgroundColor: branding.accentColor }}><HeartHandshake className="h-3.5 w-3.5" /></span>
                <span className="block text-[10px] font-bold leading-tight" style={{ color: branding.primaryColor }}>{orgName || "Your Organisation"}</span>
              </>
            )}
          </div>
          <span className="rounded px-2 py-0.5 text-[7px] font-bold text-white" style={{ backgroundColor: branding.accentColor }}>Donate</span>
        </div>
        <div className="px-4 py-6 text-center">
          <p className="mb-1 text-sm font-bold" style={{ color: branding.primaryColor }}>Make a Difference</p>
          <p className="mb-3 text-[8px] text-gray-400">Support our cause and change lives today</p>
          <div className="flex justify-center gap-2">
            <span className="rounded px-3 py-1 text-[8px] font-bold text-white" style={{ backgroundColor: branding.accentColor }}>Donate Now</span>
            <span className="rounded border px-3 py-1 text-[8px] font-bold" style={{ color: branding.primaryColor, borderColor: branding.primaryColor + "30" }}>Learn More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Branding() {
  // Hydrate from the session cache so revisits are instant (no loader/flicker).
  const cached = brandingService.getCached();

  const [loading, setLoading] = useState(!cached);
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [orgName, setOrgName] = useState(cached?.name || "");
  const [orgSlug, setOrgSlug] = useState(cached?.slug || "");
  const [requests, setRequests] = useState([]);
  const [requestMsg, setRequestMsg] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [activeThemeCategory, setActiveThemeCategory] = useState(
    () => getThemeById((cached ? toBranding(cached.branding) : DEFAULT_BRANDING).theme).categoryId,
  );
  const [activeTab, setActiveTab] = useState("logos");
  const [assetsChanged, setAssetsChanged] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [branding, setBranding] = useState(cached ? toBranding(cached.branding) : DEFAULT_BRANDING);
  const savedRef = useRef(cached ? pickDraft(toBranding(cached.branding)) : null);

  const applyBranding = (data) => {
    setOrgName(data.name || "");
    setOrgSlug(data.slug || "");
    const next = toBranding(data.branding);
    setBranding(next);
    savedRef.current = pickDraft(next);
    // Open the category sub-tab that holds the applied theme.
    setActiveThemeCategory(getThemeById(next.theme).categoryId);
  };

  const loadBranding = async () => {
    try {
      setLoading(true);
      applyBranding(await withMinDelay(brandingService.getBranding()));
    } catch (err) {
      console.error("Failed to fetch branding:", err);
      toast.error("Failed to load branding settings");
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      const res = await brandingService.getMyRequests();
      setRequests(res.data);
    } catch { /* optional */ }
  };

  useEffect(() => {
    // Cached per session → only fetch (and show the loader) on first visit.
    // Requests are lightweight and refreshed each mount.
    if (!brandingService.getCached()) loadBranding();
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the preview drawer on Escape.
  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e) => e.key === "Escape" && setPreviewOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [previewOpen]);

  const draftDirty = savedRef.current && JSON.stringify(pickDraft(branding)) !== JSON.stringify(savedRef.current);
  const isDirty = draftDirty || assetsChanged;

  const setField = (key, val) => setBranding((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await brandingService.updateBranding({
        primaryColor: branding.primaryColor, accentColor: branding.accentColor,
        backgroundColor: branding.backgroundColor, theme: branding.theme,
        siteTitle: branding.siteTitle, tagline: branding.tagline, faviconUseIcon: branding.faviconUseIcon,
      });
      toast.success("Branding saved — applying across your portal…");
      setTimeout(() => window.location.reload(), 700);
    } catch (err) {
      toast.error("Failed to save changes");
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (savedRef.current) setBranding((prev) => ({ ...prev, ...savedRef.current }));
    setAssetsChanged(false);
    toast("Reverted unsaved text & colour changes", { icon: "↩️" });
  };

  const SLOT_FIELD = { logo: "logo", "logo-dark": "logoDark", "icon-logo": "iconLogo", "icon-logo-dark": "iconLogoDark", favicon: "favicon" };

  const handleAssetUpload = async (type, file) => {
    setUploadingSlot(type);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await brandingService.uploadAsset(type, formData);
      setBranding((prev) => ({ ...prev, [SLOT_FIELD[type]]: res.data.url }));
      setAssetsChanged(true);
      toast.success("Image added — Save to apply across your portal");
    } catch (err) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleAssetDelete = async (type) => {
    try {
      await brandingService.deleteAsset(type);
      setBranding((prev) => ({ ...prev, [SLOT_FIELD[type]]: "" }));
      setAssetsChanged(true);
      toast.success("Image removed");
    } catch {
      toast.error("Failed to remove image");
    }
  };

  const applyTheme = (themeKey) => {
    const preset = getThemeById(themeKey);
    if (preset) {
      setBranding((prev) => ({ ...prev, theme: themeKey, primaryColor: preset.primary, accentColor: preset.accent, backgroundColor: preset.bg }));
    }
  };

  const handleSubmitRequest = async () => {
    setSubmittingRequest(true);
    try {
      await brandingService.submitRequest({ requestedBranding: branding, message: requestMsg });
      toast.success("Branding change request submitted for review");
      setRequestMsg("");
      const res = await brandingService.getMyRequests();
      setRequests(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit request");
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <TabLoader label="Loading branding…" />
      </div>
    );
  }

  /* derived preview values */
  const tabTitle = branding.siteTitle?.trim() || orgName || "Charity Platform";
  const previewFavicon = branding.faviconUseIcon
    ? branding.iconLogoDark || branding.iconLogo || branding.favicon
    : branding.favicon || branding.iconLogoDark || branding.iconLogo;
  const collapsedMark = branding.iconLogo || branding.iconLogoDark || branding.logo || branding.logoDark;
  const darkBgLogo = branding.logo || branding.logoDark;
  const lightBgLogo = branding.logoDark || branding.logo;

  const checklist = [
    { label: "Logo · dark backgrounds", done: !!branding.logo, tab: "logos" },
    { label: "Logo · light backgrounds", done: !!branding.logoDark, tab: "logos" },
    { label: "Icon logo", done: !!(branding.iconLogo || branding.iconLogoDark), tab: "logos" },
    { label: "Browser tab title", done: !!branding.siteTitle.trim(), tab: "browser" },
    { label: "Favicon", done: !!previewFavicon, tab: "browser" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="w-full space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Portal Branding</h1>
          <p className="mt-1 text-sm text-text-muted">Your logos, browser identity and colours — everything visitors and donors see.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-2 border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <Eye className="h-4 w-4" /> Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="hidden items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-40 sm:inline-flex"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
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
                className={cn("relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors", active ? "text-white" : "text-gray-600 hover:bg-gray-50")}
              >
                {active ? (
                  <motion.span layoutId="brandingTabActive" className="absolute inset-0 z-0" style={{ background: ACCENT_GRADIENT }} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
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
              {/* ── LOGOS ── */}
              {activeTab === "logos" && (
                <>
                  <SectionHead icon={ImageIcon} title="Brand identity" desc="Your tagline and logos — shown across your public site. Add a light and a dark logo so it stays legible on every surface." />

                  {/* Tagline — shown in the website footer */}
                  <div className="mb-8 border-b border-gray-100 pb-7">
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Tagline</label>
                    <input
                      type="text"
                      value={branding.tagline}
                      onChange={(e) => setField("tagline", e.target.value)}
                      className="w-full border-b border-gray-200 bg-transparent py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent"
                      placeholder="e.g., Empowering communities through compassion"
                      maxLength={140}
                    />
                    <div className="mt-1.5 flex items-center justify-between">
                      <p className="text-xs text-text-muted">A short line about your mission — shown in your website footer.</p>
                      <p className="text-xs text-gray-400">{(branding.tagline || "").length}/140</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <h3 className="mb-1 text-sm font-semibold text-primary">Full logo</h3>
                      <p className="mb-4 text-xs text-text-muted">Shown in the sidebar, navbar and footer.</p>
                      <div className="grid gap-6 sm:grid-cols-2">
                        <Dropzone label="Light logo · for dark backgrounds" hint="Light/white version. Sidebar, footer & dark headers." type="logo" value={branding.logo} previewBg="dark" busy={uploadingSlot === "logo"} onUpload={handleAssetUpload} onDelete={handleAssetDelete} />
                        <Dropzone label="Dark logo · for light backgrounds" hint="Dark version. White navbar & light pages." type="logo-dark" value={branding.logoDark} previewBg="light" busy={uploadingSlot === "logo-dark"} onUpload={handleAssetUpload} onDelete={handleAssetDelete} />
                      </div>
                    </div>
                    <div className="border-t border-gray-100 pt-7">
                      <h3 className="mb-1 text-sm font-semibold text-primary">Icon / collapsed mark</h3>
                      <p className="mb-4 text-xs text-text-muted">The compact square mark for the collapsed sidebar and the favicon.</p>
                      <div className="grid gap-6 sm:grid-cols-2">
                        <Dropzone label="Light icon · for dark backgrounds" hint="Light square mark. Collapsed sidebar. 64×64px+." type="icon-logo" value={branding.iconLogo} previewBg="dark" busy={uploadingSlot === "icon-logo"} onUpload={handleAssetUpload} onDelete={handleAssetDelete} />
                        <Dropzone label="Dark icon · for light backgrounds" hint="Dark square mark. Favicon on a light tab. 64×64px+." type="icon-logo-dark" value={branding.iconLogoDark} previewBg="light" busy={uploadingSlot === "icon-logo-dark"} onUpload={handleAssetUpload} onDelete={handleAssetDelete} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── BROWSER ── */}
              {activeTab === "browser" && (
                <>
                  <SectionHead icon={Globe} title="Browser tab" desc="The title and icon shown on the browser tab and in bookmarks." />
                  <div className="space-y-6">
                    <div>
                      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Tab title</label>
                      <input
                        type="text"
                        value={branding.siteTitle}
                        onChange={(e) => setField("siteTitle", e.target.value)}
                        className="w-full border-b border-gray-200 bg-transparent py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent"
                        placeholder={orgName || "e.g., Calcite Foundation"}
                        maxLength={80}
                      />
                      <div className="mt-1.5 flex items-center justify-between">
                        <p className="text-xs text-gray-400">Leave blank to use your organisation name.</p>
                        <p className="text-xs text-gray-400">{branding.siteTitle.length}/80</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-accent" />
                          <span className="text-sm font-medium text-primary">Favicon</span>
                        </div>
                        <Switch checked={branding.faviconUseIcon} onChange={() => setField("faviconUseIcon", !branding.faviconUseIcon)} label="Use icon logo" />
                      </div>
                      {branding.faviconUseIcon ? (
                        <div className="flex items-center gap-3 border border-gray-200 bg-gray-50 px-4 py-3">
                          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
                            {previewFavicon ? <img src={previewFavicon} alt="Favicon" className="h-full w-full object-contain p-1" /> : <Star className="h-4 w-4 text-gray-300" />}
                          </div>
                          <p className="text-xs text-text-muted">
                            {previewFavicon ? "Using your icon logo as the favicon. Turn off the switch to upload a separate image." : "Add an icon logo on the Logos tab and it becomes your favicon."}
                          </p>
                        </div>
                      ) : (
                        <div className="max-w-xs">
                          <Dropzone label="Favicon image" hint="Square PNG, SVG or ICO. 32–48px works best. Max 2MB." type="favicon" value={branding.favicon} busy={uploadingSlot === "favicon"} onUpload={handleAssetUpload} onDelete={handleAssetDelete} />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ── THEME ── */}
              {activeTab === "theme" && (
                <>
                  <SectionHead icon={Palette} title="Theme & colours" desc="Pick a ready-made palette, then fine-tune the colours below." />
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="space-y-8">
                    <div>
                      <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
                        {themeCategories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setActiveThemeCategory(cat.id)}
                            className={cn("whitespace-nowrap px-3 py-1.5 text-xs font-medium transition-colors", activeThemeCategory === cat.id ? "bg-accent text-white" : "bg-gray-100 text-text-muted hover:bg-gray-200")}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                      <div className="scrollbar-none grid max-h-[340px] grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-3">
                        {themeCategories.find((c) => c.id === activeThemeCategory)?.themes.map((theme) => (
                          <button
                            key={theme.id}
                            onClick={() => applyTheme(theme.id)}
                            className={cn("relative border-2 p-3 text-left transition-all", branding.theme === theme.id ? "border-accent shadow-md shadow-accent/10" : "border-gray-100 hover:border-gray-200")}
                          >
                            {branding.theme === theme.id && (
                              <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent">
                                <Check className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                            <div className="mb-1.5 flex gap-1">
                              <span className="h-5 w-5 rounded-full border border-gray-200" style={{ backgroundColor: theme.primary }} />
                              <span className="h-5 w-5 rounded-full border border-gray-200" style={{ backgroundColor: theme.accent }} />
                              <span className="h-5 w-5 rounded-full border border-gray-200" style={{ backgroundColor: theme.bg }} />
                            </div>
                            <p className="truncate text-xs font-medium text-primary">{theme.name}</p>
                            <p className="truncate text-[10px] text-text-muted">{theme.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-7">
                      <h3 className="mb-1 text-sm font-semibold text-primary">Custom colours</h3>
                      <p className="mb-5 text-xs text-text-muted">Override individual colours from the preset.</p>
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                        {[
                          { label: "Primary", key: "primaryColor", hint: "Text & headings" },
                          { label: "Accent", key: "accentColor", hint: "Buttons & highlights" },
                          { label: "Background", key: "backgroundColor", hint: "Page background" },
                        ].map((field) => (
                          <div key={field.key}>
                            <label className="mb-0.5 block text-sm font-medium text-primary">{field.label}</label>
                            <p className="mb-2 text-xs text-text-muted">{field.hint}</p>
                            <div className="flex items-center gap-2">
                              <input type="color" value={branding[field.key]} onChange={(e) => setField(field.key, e.target.value)} className="h-10 w-10 cursor-pointer appearance-none rounded-lg border border-gray-200 p-0.5" />
                              <input type="text" value={branding[field.key]} onChange={(e) => setField(field.key, e.target.value)} className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm uppercase" maxLength={7} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Inline live preview (theme tab, lg+) */}
                  <div className="hidden lg:block">
                    <div className="sticky top-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                        <Eye className="h-3.5 w-3.5 text-accent" /> Live preview
                      </div>
                      <SitePreview
                        className="rounded-xl"
                        branding={branding}
                        tabTitle={tabTitle}
                        favicon={previewFavicon}
                        orgSlug={orgSlug}
                        orgName={orgName}
                        logo={lightBgLogo}
                      />
                    </div>
                  </div>
                  </div>
                </>
              )}

              {/* ── REQUEST ── */}
              {activeTab === "request" && (
                <>
                  <SectionHead icon={Send} title="Request a change" desc="Want a custom setup or a review before changes go live? Send it to our team." />
                  <div className="space-y-6">
                    <div className="flex items-start gap-3 border border-accent/15 bg-accent/5 p-4">
                      <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                      <p className="text-sm text-text-muted">
                        We'll review your current branding (logos, colours and browser identity) and apply or advise. You'll see the status update right here.
                      </p>
                    </div>

                    {/* What's included — current palette at a glance */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text-muted">Current palette</span>
                        {["primaryColor", "accentColor", "backgroundColor"].map((k) => (
                          <span key={k} className="h-6 w-6 rounded-full border border-gray-200" style={{ backgroundColor: branding[k] }} title={branding[k]} />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <ImageIcon className="h-4 w-4" />
                        {[branding.logo, branding.logoDark, branding.iconLogo, branding.iconLogoDark].filter(Boolean).length} logo asset(s)
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Note for the admin (optional)</label>
                      <textarea
                        value={requestMsg}
                        onChange={(e) => setRequestMsg(e.target.value)}
                        placeholder="Tell us what you'd like, or any context…"
                        rows={4}
                        className="w-full border-b border-gray-200 bg-transparent py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent"
                      />
                    </div>

                    <button
                      onClick={handleSubmitRequest}
                      disabled={submittingRequest}
                      className="inline-flex items-center gap-2 bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
                    >
                      {submittingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {submittingRequest ? "Submitting…" : "Submit for review"}
                    </button>

                    {requests.length > 0 && (
                      <div className="border-t border-gray-100 pt-6">
                        <h3 className="mb-3 text-sm font-semibold text-primary">Your requests</h3>
                        <div className="space-y-3">
                          {requests.map((req) => (
                            <RequestCard key={req._id} req={req} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Preview modal (side by side) ── */}
      <Portal>
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setPreviewOpen(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden border border-gray-100 bg-white shadow-2xl dark:border-white/10 dark:bg-[var(--admin-elevated)]"
              initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-semibold text-primary dark:text-white">Live preview</h3>
                </div>
                <button onClick={() => setPreviewOpen(false)} className="inline-flex h-8 w-8 items-center justify-center text-text-muted hover:bg-gray-100 dark:text-white/60 dark:hover:bg-white/10" aria-label="Close preview">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body — side by side */}
              <div className="scrollbar-none grid gap-5 overflow-y-auto p-5 md:grid-cols-[1.5fr_1fr]">
                {/* Browser / site mock */}
                <SitePreview
                  className="self-start rounded-xl"
                  branding={branding}
                  tabTitle={tabTitle}
                  favicon={previewFavicon}
                  orgSlug={orgSlug}
                  orgName={orgName}
                  logo={lightBgLogo}
                />

                {/* Right column: setup checklist + sidebar marks */}
                <div className="space-y-4">
                  {/* Setup progress */}
                  <div className="border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary dark:text-white">Brand setup</span>
                      <span className="text-xs font-medium text-text-muted">{doneCount}/{checklist.length}</span>
                    </div>
                    <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
                    </div>
                    <ul className="space-y-0.5">
                      {checklist.map((c) => (
                        <li key={c.label}>
                          <button onClick={() => { setActiveTab(c.tab); setPreviewOpen(false); }} className="flex w-full items-center gap-2 px-1.5 py-1 text-left text-[13px] transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                            {c.done ? <CheckCircle className="h-4 w-4 shrink-0 text-green-500" /> : <Circle className="h-4 w-4 shrink-0 text-gray-300" />}
                            <span className={c.done ? "text-primary dark:text-white/80" : "text-text-muted"}>{c.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                {/* Sidebar marks */}
                <div className="border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <div className="mb-3 flex items-center gap-2">
                  <PanelLeft className="h-4 w-4 text-accent" />
                  <span className="text-xs font-semibold text-primary dark:text-white">Sidebar logo</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: branding.primaryColor }}>
                    {darkBgLogo ? <img src={darkBgLogo} alt="logo" className="h-9 w-auto max-w-[130px] object-contain" /> : (
                      <>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[13px] font-extrabold text-white" style={{ background: branding.accentColor }}>{(orgName || "A").charAt(0).toUpperCase()}</span>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold text-white">{orgName || "Your Org"}</p>
                          <p className="truncate text-[7px] uppercase tracking-wider text-white/40">Admin Portal</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-center rounded-xl p-3" style={{ background: branding.primaryColor }}>
                    {collapsedMark ? <img src={collapsedMark} alt="icon" className="h-9 w-9 object-contain" /> : (
                      <span className="grid h-9 w-9 place-items-center rounded-lg text-[15px] font-extrabold text-white" style={{ background: branding.accentColor }}>{(orgName || "A").charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-3">
                  <p className="text-center text-[9px] text-text-muted">Expanded</p>
                  <p className="text-center text-[9px] text-text-muted">Collapsed</p>
                </div>
                </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>

      {/* Sticky unsaved-changes bar */}
      <AnimatePresence>
        {isDirty && !saving && (
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
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
