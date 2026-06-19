import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Palette, Loader2, Save, Mail, MapPin, Share2, Upload, Trash2, Check,
  Facebook, Instagram, Twitter, Linkedin,
} from "lucide-react";
import { toast } from "react-hot-toast";
import platformService from "../../services/platform.service";
import { useTenant } from "../../context/TenantContext";
import { themeCategories } from "../../config/themePresets";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import SAPageHeader from "../components/SAPageHeader";
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

function TextInput({ icon: Icon, ...props }) {
  return (
    <div className={lineWrap}>
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-gray-400" /> : null}
      <input {...props} className={lineInput} />
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
  const [themeCat, setThemeCat] = useState(themeCategories[0]?.id || "modern");
  // Snapshot of the last-saved values (excludes logos) → powers the dirty state
  // so "Save"/"Discard" only act when there's an actual unsaved edit.
  const savedRef = useRef(cached ? pickSaveable(toForm(cached)) : null);

  useEffect(() => {
    // Cached per session → only fetch (and show the loader) on first visit.
    if (platformService.getCached()) return;
    (async () => {
      try {
        const data = await withMinDelay(platformService.getSettings());
        const next = toForm(data);
        setForm(next);
        savedRef.current = pickSaveable(next);
      } catch {
        toast.error("Failed to load platform settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Dirty = the saveable fields differ from the last-saved snapshot.
  const isDirty =
    !!savedRef.current && JSON.stringify(pickSaveable(form)) !== JSON.stringify(savedRef.current);

  const up = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const upSocial = (k, v) => setForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, [k]: v } }));
  const upBrand = (k, v) => setForm((f) => ({ ...f, branding: { ...f.branding, [k]: v } }));

  const save = async () => {
    if (!isDirty) return; // nothing changed — no wasted request
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
    } catch {
      toast.error("Failed to save platform settings");
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
    setBusyAsset(type);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await platformService.uploadAsset(type, fd);
      upBrand(data.field, data.url);
      refreshPlatform(); // a new logo/favicon shows in the tab immediately
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setBusyAsset(null);
    }
  };

  const onDeleteAsset = async (type) => {
    try {
      await platformService.deleteAsset(type);
      upBrand(SLOT_FIELD[type], "");
      refreshPlatform(); // reflect the removal in the tab immediately
      toast.success("Image removed");
    } catch {
      toast.error("Failed to remove image");
    }
  };

  const applyPreset = (t) =>
    setForm((f) => ({
      ...f,
      branding: { ...f.branding, primaryColor: t.primary, accentColor: t.accent, backgroundColor: t.bg, theme: t.id },
    }));

  if (loading) return <SALoader />;

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
                  <motion.span layoutId="saPlatformTab" className="absolute inset-0 z-0" style={{ background: "linear-gradient(135deg, var(--tenant-primary, #0f172a), var(--tenant-accent, #10b981))" }} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
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
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// On a Vite hot-reload the service module survives, so its session cache would
// keep serving stale data. Drop it on dispose → the remounted screen re-fetches
// from the API and updates state. Dev-only: stripped from production builds.
if (import.meta.hot) {
  import.meta.hot.dispose(() => platformService.clearCache());
}
