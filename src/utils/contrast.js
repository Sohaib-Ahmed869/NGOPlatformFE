/**
 * WCAG luminance/contrast helpers, used to keep accent-filled surfaces legible.
 *
 * Buttons across the app are `bg-accent text-white`. That assumes a dark accent
 * — a tenant who picks a pale one (mint #4FB587 → 2.5:1, lime #E4EB99 → 1.3:1)
 * gets a white label on near-white, i.e. an invisible button. `onColor()` picks
 * the label colour that actually reads, and index.css applies it through
 * --tenant-accent-contrast so the 300+ existing call sites need no edit.
 */

// Below this white-on-fill ratio, a white label is considered unreadable and is
// swapped for dark ink. 3.0 is the WCAG AA floor for large text and non-text
// contrast. RAISING this flips more palettes to dark labels; lowering it flips
// fewer. See the note in the theme presets before changing it.
export const MIN_WHITE_CONTRAST = 3.0;

// Fallback label when the tenant's own primary is too light to sit on the fill.
const DEFAULT_INK = "#0F172A";

function channels(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ""));
  return m ? [1, 2, 3].map((i) => parseInt(m[i], 16) / 255) : null;
}

/** WCAG relative luminance, 0 (black) → 1 (white). */
export function luminance(hex) {
  const c = channels(hex);
  if (!c) return 0;
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours, 1 → 21. */
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The label colour to place on a `fill` background: white while it still reads,
 * otherwise dark ink — the tenant's `preferredInk` (normally their primary, so
 * the label stays on-brand) when that contrasts well, else slate-900.
 */
export function onColor(fill, preferredInk) {
  if (!channels(fill)) return "#FFFFFF";
  if (contrastRatio("#FFFFFF", fill) >= MIN_WHITE_CONTRAST) return "#FFFFFF";
  return preferredInk && contrastRatio(preferredInk, fill) >= 4.5 ? preferredInk : DEFAULT_INK;
}

/** True when a white label still reads on `fill`. */
export function carriesWhite(fill) {
  return !channels(fill) || contrastRatio("#FFFFFF", fill) >= MIN_WHITE_CONTRAST;
}

/**
 * The far stop for primary→accent gradients that carry white text (tab pills,
 * page-header bands). Those run dark→accent, so a pale accent leaves the white
 * label sitting on near-white at the tail. Falls back to `primaryLight` — still
 * a brand colour, still dark enough — only when the accent can't hold white.
 */
export function gradientStop(accent, primaryLight) {
  return carriesWhite(accent) ? accent : primaryLight;
}
