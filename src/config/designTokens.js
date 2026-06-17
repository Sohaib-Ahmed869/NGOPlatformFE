/**
 * Per-tenant DESIGN system registry (Phase 1: fonts + shape + token-only
 * templates). The single source of truth for the FE: the curated font list,
 * the shape options, and the predefined templates. Every default equals the
 * CURRENT design, so an empty `design` renders exactly today's look.
 *
 * Applied via CSS variables on <html> by TenantContext.applyDesign().
 */
import { getThemeById } from "./themePresets";

/* ── Curated fonts (~12) ──────────────────────────────────────────────────
 * `stack`  = the CSS font-family applied (var --font-heading/body/nav).
 * `google` = Google Fonts family spec to load (null = no web font needed).
 * `role`   = which pickers it's offered in.
 */
export const FONTS = [
  { id: "serif", name: "Times (Serif) — default", stack: '"Times New Roman", Tinos, Times, serif', google: null, roles: ["heading", "body", "nav"] },
  { id: "playfair", name: "Playfair Display", stack: '"Playfair Display", Georgia, serif', google: "Playfair+Display:wght@400;500;600;700", roles: ["heading"] },
  { id: "lora", name: "Lora", stack: '"Lora", Georgia, serif', google: "Lora:wght@400;500;600;700", roles: ["heading", "body"] },
  { id: "merriweather", name: "Merriweather", stack: '"Merriweather", Georgia, serif', google: "Merriweather:wght@400;700", roles: ["heading", "body"] },
  { id: "sourceSerif", name: "Source Serif 4", stack: '"Source Serif 4", Georgia, serif', google: "Source+Serif+4:wght@400;500;600;700", roles: ["heading", "body"] },
  { id: "inter", name: "Inter", stack: '"Inter", ui-sans-serif, system-ui, sans-serif', google: "Inter:wght@400;500;600;700", roles: ["heading", "body", "nav"] },
  { id: "poppins", name: "Poppins", stack: '"Poppins", ui-sans-serif, system-ui, sans-serif', google: "Poppins:wght@400;500;600;700", roles: ["heading", "body", "nav"] },
  { id: "outfit", name: "Outfit", stack: '"Outfit", ui-sans-serif, system-ui, sans-serif', google: "Outfit:wght@400;500;600;700", roles: ["heading", "body", "nav"] },
  { id: "nunito", name: "Nunito", stack: '"Nunito", ui-sans-serif, system-ui, sans-serif', google: "Nunito:wght@400;500;600;700", roles: ["heading", "body", "nav"] },
  { id: "workSans", name: "Work Sans", stack: '"Work Sans", ui-sans-serif, system-ui, sans-serif', google: "Work+Sans:wght@400;500;600;700", roles: ["heading", "body", "nav"] },
  { id: "dmSans", name: "DM Sans", stack: '"DM Sans", ui-sans-serif, system-ui, sans-serif', google: "DM+Sans:wght@400;500;600;700", roles: ["heading", "body", "nav"] },
  { id: "sourceSans", name: "Source Sans 3", stack: '"Source Sans 3", ui-sans-serif, system-ui, sans-serif', google: "Source+Sans+3:wght@400;500;600;700", roles: ["heading", "body", "nav"] },
];
export const FONT_MAP = FONTS.reduce((a, f) => ((a[f.id] = f), a), {});
export const fontsForRole = (role) => FONTS.filter((f) => f.roles.includes(role));

/* ── Shape options (defaults = current square look) ──────────────────────── */
export const ROUNDNESS = [
  { id: "sharp", name: "Sharp", vars: { "--radius-card": "0px", "--radius-btn": "0px", "--radius-input": "0px", "--radius-pill": "9999px" } },
  { id: "soft", name: "Soft", vars: { "--radius-card": "8px", "--radius-btn": "6px", "--radius-input": "6px", "--radius-pill": "9999px" } },
  { id: "rounded", name: "Rounded", vars: { "--radius-card": "16px", "--radius-btn": "10px", "--radius-input": "10px", "--radius-pill": "9999px" } },
  { id: "pill", name: "Pill", vars: { "--radius-card": "20px", "--radius-btn": "9999px", "--radius-input": "12px", "--radius-pill": "9999px" } },
];
export const BORDER_WIDTH = [
  { id: "thin", name: "Thin", vars: { "--border-width": "1px" } },
  { id: "none", name: "None", vars: { "--border-width": "0px" } },
  { id: "bold", name: "Bold", vars: { "--border-width": "2px" } },
];
export const SHADOW = [
  { id: "soft", name: "Soft", vars: { "--card-shadow": "0 1px 2px 0 rgb(0 0 0 / 0.05)" } },
  { id: "none", name: "None", vars: { "--card-shadow": "none" } },
  { id: "lifted", name: "Lifted", vars: { "--card-shadow": "0 10px 24px -8px rgb(0 0 0 / 0.14)" } },
];
export const ROUNDNESS_MAP = ROUNDNESS.reduce((a, x) => ((a[x.id] = x), a), {});
export const BORDER_WIDTH_MAP = BORDER_WIDTH.reduce((a, x) => ((a[x.id] = x), a), {});
export const SHADOW_MAP = SHADOW.reduce((a, x) => ((a[x.id] = x), a), {});

/* ── Component layout variants (Phase 2) ─────────────────────────────────── */
export const NAVBAR_VARIANTS = [
  { id: "classic", name: "Classic", desc: "Logo left, links inline; collapses to a floating capsule on scroll." },
  { id: "centered", name: "Centered logo", desc: "Logo dead-centre with the links split into two equal halves either side." },
  { id: "split", name: "Split", desc: "Logo left, links centred, actions on the right." },
  { id: "minimal", name: "Minimal", desc: "Logo left, links pushed to the right beside the actions." },
  { id: "allExpanded", name: "All expanded", desc: "Every page flattened onto one row — no dropdowns, everything visible." },
  { id: "mega", name: "Mega menu", desc: "Inline links; a group opens a full-width multi-column panel of its pages." },
  { id: "command", name: "Command (⌘K)", desc: "A centred search trigger that opens a ⌘K quick-jump palette for every page." },
];
export const FOOTER_VARIANTS = [
  { id: "classic", name: "Classic", desc: "Full multi-column footer — brand, links and contact." },
  { id: "compact", name: "Compact", desc: "A slim single-band footer — logo, links, socials and copyright." },
  { id: "centered", name: "Centered", desc: "Stacked and centred — logo, links, socials and copyright." },
];
export const VARIANTS = { navbar: NAVBAR_VARIANTS, footer: FOOTER_VARIANTS };

/* ── Predefined templates (fonts + shape + layout variants) ──────────────── */
// Templates bundle fonts + shape + layout, and (except Classic) a colour palette
// referencing config/themePresets.js. `colorThemeId: null` = keep the tenant's
// current colours.
export const TEMPLATES = [
  { id: "classic", name: "Classic", desc: "The current look — warm serif, sharp edges.", colorThemeId: null, fonts: { heading: "serif", body: "serif", nav: "serif" }, shape: { roundness: "sharp", borderWidth: "thin", shadow: "soft" }, variants: { navbar: "classic", footer: "classic" } },
  { id: "modern", name: "Modern Rounded", desc: "Clean sans-serif, rounded corners, centred logo.", colorThemeId: "modern-slate", fonts: { heading: "poppins", body: "inter", nav: "inter" }, shape: { roundness: "rounded", borderWidth: "none", shadow: "lifted" }, variants: { navbar: "centered", footer: "compact" } },
  { id: "editorial", name: "Editorial", desc: "Elegant display serif over a readable serif body.", colorThemeId: "warm-burgundy", fonts: { heading: "playfair", body: "lora", nav: "inter" }, shape: { roundness: "soft", borderWidth: "thin", shadow: "soft" }, variants: { navbar: "classic", footer: "classic" } },
  { id: "minimal", name: "Minimal", desc: "Quiet, borderless, flat — lets content lead.", colorThemeId: "pro-charcoal", fonts: { heading: "outfit", body: "inter", nav: "inter" }, shape: { roundness: "sharp", borderWidth: "none", shadow: "none" }, variants: { navbar: "centered", footer: "compact" } },
  { id: "bold", name: "Bold Impact", desc: "Punchy campaign look — crimson accent, heavy borders, split nav.", colorThemeId: "modern-crimson", fonts: { heading: "poppins", body: "inter", nav: "poppins" }, shape: { roundness: "soft", borderWidth: "bold", shadow: "lifted" }, variants: { navbar: "split", footer: "centered" } },
  { id: "coastal", name: "Coastal", desc: "Fresh ocean blues, soft rounded cards, centred logo.", colorThemeId: "nature-ocean", fonts: { heading: "workSans", body: "sourceSans", nav: "workSans" }, shape: { roundness: "rounded", borderWidth: "none", shadow: "soft" }, variants: { navbar: "centered", footer: "compact" } },
  { id: "heritage", name: "Heritage", desc: "Warm terracotta, classic serif, traditional layout.", colorThemeId: "warm-terracotta", fonts: { heading: "merriweather", body: "lora", nav: "inter" }, shape: { roundness: "soft", borderWidth: "thin", shadow: "soft" }, variants: { navbar: "classic", footer: "classic" } },
  { id: "midnight", name: "Midnight", desc: "Deep indigo, sleek sans, links to the right.", colorThemeId: "pro-midnight", fonts: { heading: "outfit", body: "dmSans", nav: "dmSans" }, shape: { roundness: "rounded", borderWidth: "none", shadow: "lifted" }, variants: { navbar: "minimal", footer: "centered" } },
  { id: "grove", name: "Grove", desc: "Forest greens with a fully-expanded nav — every page on one row.", colorThemeId: "nature-forest", fonts: { heading: "dmSans", body: "nunito", nav: "dmSans" }, shape: { roundness: "rounded", borderWidth: "none", shadow: "soft" }, variants: { navbar: "allExpanded", footer: "centered" } },
];

/** Resolve a template's colour palette ({primary,accent,bg}) or null (keep current). */
export function templateColors(t) {
  if (!t || !t.colorThemeId) return null;
  const th = getThemeById(t.colorThemeId);
  return th ? { primary: th.primary, accent: th.accent, bg: th.bg } : null;
}
export const TEMPLATE_MAP = TEMPLATES.reduce((a, t) => ((a[t.id] = t), a), {});

/* The baseline design — equals today's look. Used when a tenant has no design. */
export const DEFAULT_DESIGN = {
  templateId: "classic",
  // colour stays null by default → the tenant's branding colours are used.
  colorThemeId: null,
  colors: null,
  fonts: { heading: "serif", body: "serif", nav: "serif" },
  shape: { roundness: "sharp", borderWidth: "thin", shadow: "soft" },
  variants: { navbar: "classic", footer: "classic" },
};

/** Merge a stored (partial) design over the baseline so all fields resolve. */
export function resolveDesign(design) {
  const d = design || {};
  return {
    templateId: d.templateId || DEFAULT_DESIGN.templateId,
    colorThemeId: d.colorThemeId ?? null,
    colors: d.colors || null,
    fonts: { ...DEFAULT_DESIGN.fonts, ...(d.fonts || {}) },
    shape: { ...DEFAULT_DESIGN.shape, ...(d.shape || {}) },
    variants: { ...DEFAULT_DESIGN.variants, ...(d.variants || {}) },
  };
}

/** The full set of CSS vars (fonts + shape) for a design — used for live preview. */
export function designCssVars(design) {
  const d = resolveDesign(design);
  const vars = {};
  ["heading", "body", "nav"].forEach((role) => {
    vars[`--font-${role}`] = (FONT_MAP[d.fonts[role]] || FONT_MAP.serif).stack;
  });
  Object.assign(
    vars,
    ROUNDNESS_MAP[d.shape.roundness]?.vars || {},
    BORDER_WIDTH_MAP[d.shape.borderWidth]?.vars || {},
    SHADOW_MAP[d.shape.shadow]?.vars || {},
  );
  // A template's colour palette (preview only — published colours are written to
  // branding, which the public site reads as usual).
  if (d.colors) {
    if (d.colors.primary) vars["--tenant-primary"] = d.colors.primary;
    if (d.colors.accent) vars["--tenant-accent"] = d.colors.accent;
    if (d.colors.bg) vars["--tenant-bg"] = d.colors.bg;
  }
  return vars;
}

/** Inject a Google font stylesheet once (no-op for the serif default). */
export function loadFontById(id) {
  if (typeof document === "undefined") return;
  const font = FONT_MAP[id];
  if (!font || !font.google) return;
  const elId = `gfont-${font.id}`;
  if (document.getElementById(elId)) return;
  const link = document.createElement("link");
  link.id = elId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
  document.head.appendChild(link);
}

/** Ensure all fonts referenced by a design are loaded. */
export function loadFontsForDesign(design) {
  const d = resolveDesign(design);
  [...new Set(Object.values(d.fonts))].forEach(loadFontById);
}
