import { motion } from "framer-motion";
import { useTenant } from "../context/TenantContext";
import { cn } from "../utils/cn";

/**
 * TabLoader — the global TenantLoader's look (animated dots → tenant-name sweep
 * reveal → tagline → bottom pulse) scoped to a single tab/section.
 *
 * Unlike TenantLoader this NEVER takes over the screen: no `fixed inset-0`, no
 * z-index stacking, no body scroll-lock and no intro/exit-on-ready timeline. It
 * is a normally-flowing, continuously-looping block that sits inside whatever
 * panel renders it — so it only ever shows within the active tab.
 *
 * Drop-in for BrandLoader: same `{ label, className }` API, so existing wrappers
 * (`min-h-[60vh]`, drawer `h-72`, …) keep controlling the surrounding layout.
 *
 * Theme-aware: the name + tagline are driven through the `text-primary` /
 * `text-text-muted` utilities, which admin dark mode remaps to light ink, so the
 * loader stays legible on both the light portal and the dark admin shell.
 *
 * Usage:
 *   if (loading) return <TabLoader />;
 *   if (loading) return <TabLoader label="Loading donors…" />;
 */

// "calcite" → "Calcite", "hope-fund" → "Hope Fund"; leave real names untouched.
function prettify(raw) {
  if (!raw) return "Loading";
  if (/[A-Z]/.test(raw) || /\s/.test(raw)) return raw;
  return raw.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const ACCENT = "var(--tenant-accent, #C9A84C)";

// 7 dots, alternating accent / theme-aware primary — staggered breathing pulse.
function Dots() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      {Array.from({ length: 7 }).map((_, i) => {
        const isAccent = i % 2 === 0;
        return (
          <motion.span
            key={i}
            className={cn("block h-2.5 w-2.5 rounded-full", isAccent ? "" : "text-primary")}
            style={{ backgroundColor: isAccent ? ACCENT : "currentColor" }}
            animate={{ scale: [0.55, 1, 0.55], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
          />
        );
      })}
    </div>
  );
}

export function TabLoader({ label = "Loading", className = "" }) {
  const { branding, organisation, slug, platform } = useTenant();
  // In the operator console there's no tenant — fall back to the platform's own
  // name (e.g. "Calcite") so the branded loader shows there too.
  const name = prettify(organisation?.name || branding?.siteTitle || platform?.name || slug);

  const nameCls =
    "font-heading text-2xl font-bold tracking-tight text-center select-none sm:text-3xl md:text-4xl";

  return (
    <div
      className={cn("flex w-full flex-col items-center justify-center", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Dots */}
      <div className="mb-7">
        <Dots />
      </div>

      {/* Name with looping sweep reveal */}
      <div className="relative px-2">
        {/* Faint ghost underneath (opacity, not colour-alpha, so it's theme-safe) */}
        <h2 className={cn(nameCls, "text-primary")} style={{ opacity: 0.1 }}>
          {name}
        </h2>
        {/* Revealed overlay sweeps in from the left, holds, then erases */}
        <motion.h2
          aria-hidden="true"
          className={cn(nameCls, "absolute inset-0 px-2 text-primary")}
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          animate={{ clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)", "inset(0 0% 0 0)", "inset(0 100% 0 0)"] }}
          transition={{ duration: 2.6, times: [0, 0.42, 0.72, 1], repeat: Infinity, ease: "easeInOut" }}
        >
          {name}
        </motion.h2>
      </div>

      {/* Tagline with flanking rules */}
      <motion.div
        className="mt-5 flex items-center gap-3"
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="h-px w-8" style={{ backgroundColor: ACCENT }} />
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-text-muted">{label}</p>
        <span className="h-px w-8" style={{ backgroundColor: ACCENT }} />
      </motion.div>

      {/* Bottom pulse */}
      <div className="mt-7 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ backgroundColor: ACCENT, animationDelay: `${i * 0.25}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default TabLoader;
