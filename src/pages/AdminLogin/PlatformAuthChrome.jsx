// The real Donexus mark, rendered as a CSS mask (not an <img>) so it always
// reads crisp and recolors to the live accent instead of showing a baked-in
// colour. Same asset + technique as the public marketing site's hero.
import donexusMark from "../../assets/Donexus Logo/Donexus-268.png";
// Re-exported rather than redeclared: index.html paints this same colour before
// the bundle parses, so there can only be one definition of it.
import { GROUND_TOP, GROUND_BOTTOM } from "../../utils/authTransition";

export { GROUND_TOP, GROUND_BOTTOM };

/**
 * Shared furniture for the SuperAdmin console's three pre-auth pages:
 * /login, /forgot-password and /accept-invite/:token.
 *
 * The house style here is DELIBERATELY plain: a flat near-black ground, one
 * hairline, one accent. An earlier version had drifting aurora blobs, floating
 * particles, a pulsing halo behind the card and a light sheen that swept across
 * the button on hover. Individually each was defensible; together they read as
 * a generic "dark SaaS landing page" template rather than the front door of an
 * internal operations console, and they made a page whose entire job is "type a
 * password" feel like a product tour.
 *
 * The one survivor is the oversized mark turning in the bottom-right corner
 * (kept at the user's request). It works where the others didn't because it is
 * the BRAND rather than an effect, it is one shape rather than a field of
 * them, and at 160 seconds a revolution it is slow enough that you never catch
 * it moving -- you only notice the corner looks different when you come back.
 *
 * What replaced them is not less design, it is design spent elsewhere: a real
 * type scale, a single alignment spine, hairlines instead of glows, and the
 * accent reserved for exactly two things -- the primary button and the focus
 * ring. If something here needs emphasis, it gets weight or space, not colour
 * and not light.
 */

export const PRIMARY = "#0a1f19";
export const ACCENT = "#047857";
export const ACCENT_LIGHT = "#34d399";

export const HAIRLINE = "rgba(255,255,255,.07)";
export const SURFACE = "rgba(255,255,255,.022)";

// A repeating fractal-noise tile at very low opacity. The one piece of the old
// canvas worth keeping: without it a large flat dark panel bands visibly on an
// 8-bit display.
const GRAIN_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export function lighten(hex, ratio) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * ratio));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * ratio));
  const b = Math.min(255, Math.round((n & 0xff) + (255 - (n & 0xff)) * ratio));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** The mark, flat. A gradient fill on a logo is a decoration the brand didn't ask for. */
export function DonexusMark({ size = 34, opacity = 1, color = ACCENT_LIGHT }) {
  return (
    <span
      aria-hidden
      style={{
        display: "block",
        width: size,
        height: size,
        opacity,
        backgroundColor: color,
        WebkitMaskImage: `url(${donexusMark})`,
        maskImage: `url(${donexusMark})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

/** Mark + wordmark, the lockup every pre-auth page opens with. */
export function BrandLockup({ name = "Donexus", size = 20 }) {
  return (
    <div className="flex items-center gap-2.5">
      <DonexusMark size={size} />
      <span className="text-[15px] font-semibold tracking-tight text-white/85">{name}</span>
    </div>
  );
}

/**
 * Full-bleed ground shared by the pre-auth pages. Renders behind whatever the
 * page stacks on top of it: the tone shift, the grain, and the mark turning
 * slowly out of the bottom-right corner.
 *
 * The rotation is a plain CSS keyframe rather than a motion library, so the
 * canvas stays dependency-free, and it stops entirely under
 * `prefers-reduced-motion` -- decoration is exactly the kind of movement that
 * setting exists to switch off.
 */
export function AuthCanvas({ mark = true }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden"
      style={{ background: `linear-gradient(180deg, ${GROUND_TOP} 0%, ${GROUND_BOTTOM} 100%)` }}
    >
      {mark && (
        <>
          <style>{
            "@keyframes donexus-turn{to{transform:rotate(360deg)}}" +
            "@media (prefers-reduced-motion:reduce){.donexus-turn{animation:none!important}}"
          }</style>
          <div
            className="donexus-turn pointer-events-none absolute -bottom-40 -right-40"
            style={{ animation: "donexus-turn 160s linear infinite" }}
          >
            <DonexusMark size={620} opacity={0.05} />
          </div>
        </>
      )}

      <div
        className="absolute inset-0 opacity-[.035] mix-blend-overlay"
        style={{ backgroundImage: `url("${GRAIN_URI}")` }}
      />
    </div>
  );
}

/** A small live/status dot. Static ring, no pulse. */
export function LiveDot({ color = ACCENT_LIGHT }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full"
      style={{ background: color, boxShadow: `0 0 0 3px ${color}1f` }}
    />
  );
}

/**
 * A plain surface panel. Kept under its old name because /login and
 * /forgot-password import it, but there is no glass left in it: one hairline,
 * a 2% wash to lift it off the ground, and a modest radius.
 */
export function GlassCard({ children, className = "", contentClassName = "" }) {
  return (
    <div
      className={`rounded-xl border ${className}`}
      style={{ borderColor: HAIRLINE, background: SURFACE }}
    >
      <div className={`p-7 ${contentClassName}`}>{children}</div>
    </div>
  );
}

/** Arrow (or any icon) that shifts a couple of pixels on hover of its group. */
export function NudgeIcon({ children }) {
  return (
    <span className="inline-flex transition-transform duration-200 group-hover:translate-x-0.5">
      {children}
    </span>
  );
}

/**
 * Primary action. Solid accent, one darker step on hover, nothing sweeping
 * across it. Kept under its old name for the pages that import it.
 */
export function ShimmerButton({ children, className = "", accent = ACCENT, style, ...props }) {
  return (
    <button
      className={`group relative inline-flex items-center justify-center gap-2 transition-[background-color,opacity] duration-200 ${className}`}
      style={{ backgroundColor: accent, ...style }}
      onMouseEnter={(e) => {
        if (!props.disabled) e.currentTarget.style.backgroundColor = lighten(accent, 0.1);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = accent;
      }}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Form input. Label above, optional leading icon, optional trailing slot.
 * Focus is a 1px accent border plus a 1px ring -- enough to be unmistakable,
 * not a glow.
 */
export function GlassField({ label, icon: Icon, trailing, accent = ACCENT, inputRef, hint, ...inputProps }) {
  return (
    <div>
      {label && (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">{label}</label>
          {hint}
        </div>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-white/30 transition-colors"
            data-glass-icon
          />
        )}
        <input
          ref={inputRef}
          className={`h-11 w-full rounded-lg border text-[14.5px] text-white outline-none transition-colors placeholder:text-white/25 ${Icon ? "pl-10" : "pl-3.5"} ${trailing ? "pr-11" : "pr-3.5"}`}
          style={{ borderColor: "rgba(255,255,255,.11)", backgroundColor: "rgba(255,255,255,.03)" }}
          onFocus={(e) => {
            e.target.style.borderColor = accent;
            e.target.style.boxShadow = `0 0 0 1px ${accent}`;
            const icon = e.target.previousElementSibling;
            if (icon?.hasAttribute("data-glass-icon")) icon.style.color = "rgba(255,255,255,.65)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "rgba(255,255,255,.11)";
            e.target.style.boxShadow = "none";
            const icon = e.target.previousElementSibling;
            if (icon?.hasAttribute("data-glass-icon")) icon.style.color = "";
          }}
          {...inputProps}
        />
        {trailing}
      </div>
    </div>
  );
}
