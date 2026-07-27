import { useEffect, useState } from "react";

// Uploaded logos arrive in two broad shapes: a wide horizontal wordmark, or a
// stacked lockup (mark above the wordmark, sometimes a tagline under it). The
// sidebar used to force both into a fixed 40px-tall box, which only suits the
// first — a stacked lockup squeezed to 40px renders its wordmark unreadably
// small. Measure the natural aspect ratio and size the box to the shape.

// width/height at or above which a logo reads as a horizontal wordmark.
const WORDMARK_RATIO = 2.2;

// Natural ratios are stable per URL — measure each logo once per session.
const cache = new Map();

/**
 * Measures a logo's natural aspect ratio and returns the classes that fit it
 * into the sidebar rail, expanded (256px) and collapsed (64px).
 *
 * Until the image loads it assumes a wordmark — the previous behaviour — so a
 * horizontal logo never shifts on first paint.
 *
 * `align: "center"` drops the left anchor and the whitespace nudge, for rails
 * that centre the brand block rather than running it flush with the nav items.
 */
export default function useLogoFit(src, { align = "left" } = {}) {
  const [ratio, setRatio] = useState(() => (src ? cache.get(src) ?? null : null));

  useEffect(() => {
    if (!src) {
      setRatio(null);
      return;
    }
    const cached = cache.get(src);
    if (cached) {
      setRatio(cached);
      return;
    }
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!img.naturalHeight) return;
      const r = img.naturalWidth / img.naturalHeight;
      cache.set(src, r);
      if (alive) setRatio(r);
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  const wordmark = ratio === null || ratio >= WORDMARK_RATIO;
  // Left-aligned rails nudge the image back to cancel the side whitespace logo
  // files usually carry; a centred rail must not, or the logo lands off-centre.
  const nudge = align === "center" ? "" : "-ml-1.5 ";
  const anchor = align === "center" ? "" : " object-left";

  return {
    ratio,
    wordmark,
    // Expanded rail: 256px wide, 16px padding → 224px usable. A wordmark keeps
    // the old fixed height; a stacked lockup instead gets real height, so its
    // wordmark stays legible.
    expandedClass: wordmark
      ? `${nudge}h-10 w-auto max-w-[170px] object-contain${anchor}`
      : `h-auto max-h-16 w-auto max-w-[190px] object-contain${anchor}`,
    // Collapsed rail: 64px wide. Fit the largest square the rail allows (the
    // header drops to px-2 for this) rather than the old 36px, which wasted
    // a quarter of the available width.
    collapsedClass: "h-11 w-11 object-contain",
  };
}
