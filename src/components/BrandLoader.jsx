import { motion } from "framer-motion";
import { useTenant } from "../context/TenantContext";
import { cn } from "../utils/cn";

// "calcite" → "Calcite", "hope-fund" → "Hope Fund"; leave real names untouched.
function prettify(raw) {
  if (!raw) return "Loading";
  if (/[A-Z]/.test(raw) || /\s/.test(raw)) return raw;
  return raw.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const PULSE = {
  animate: { opacity: [0.55, 1, 0.55] },
  transition: { repeat: Infinity, duration: 1.4, ease: "easeInOut" },
};

/**
 * Brand loader — the tenant logo (or, only when no logo exists, a wordmark) over
 * an indeterminate bar driven by the live theme accent. Surface-aware: the dark
 * logo shows on the light surface, the light logo on the dark surface (admin
 * dark mode). Designed to sit inside a section/panel, not as a full overlay.
 */
export function BrandLoader({ label, className = "" }) {
  const { branding, organisation, slug } = useTenant();
  const name = prettify(organisation?.name || branding?.siteTitle || slug);

  // logoDark = dark mark for light backgrounds; logo = light mark for dark.
  const logoForLight = branding?.logoDark;
  const logoForDark = branding?.logo;
  const hasLogo = Boolean(logoForLight || logoForDark);

  return (
    <div className={cn("flex flex-col items-center gap-4", className)} role="status" aria-live="polite" aria-busy="true">
      {hasLogo ? (
        <motion.div className="flex h-9 items-center" {...PULSE}>
          {logoForLight ? (
            <img
              src={logoForLight}
              alt={name}
              className={cn("h-9 w-auto max-w-[180px] object-contain", logoForDark && "dark:hidden")}
            />
          ) : null}
          {logoForDark ? (
            <img
              src={logoForDark}
              alt={name}
              className={cn("h-9 w-auto max-w-[180px] object-contain", logoForLight ? "hidden dark:block" : "")}
            />
          ) : null}
        </motion.div>
      ) : (
        <motion.span className="font-heading text-2xl font-bold tracking-tight text-primary" {...PULSE}>
          {name}
          <span style={{ color: "var(--tenant-accent, #C9A84C)" }}>.</span>
        </motion.span>
      )}

      {/* Indeterminate progress bar — driven by the live theme accent var. */}
      <div className="h-0.5 w-40 overflow-hidden rounded-full bg-gray-200">
        <motion.div
          className="h-full w-1/3 rounded-full"
          style={{ background: "var(--tenant-accent, #C9A84C)" }}
          animate={{ x: ["-120%", "320%"] }}
          transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
        />
      </div>

      {label ? <p className="text-[11px] font-medium text-text-muted">{label}</p> : null}
    </div>
  );
}

export default BrandLoader;
