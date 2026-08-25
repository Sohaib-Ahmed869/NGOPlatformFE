import { ClosingHorizon } from "./scenes";
import { V, Reveal, Btn, DonexusMark } from "./ui";

/**
 * The marketing site's one closing block — home, plans, FAQ and the register
 * route all end here, so the site closes the same way wherever you leave it.
 *
 * Filled in the primary colour with the hero's landscape at dusk along the
 * bottom edge: the page opens on that place in daylight and closes on it at
 * night. The horizon is absolutely positioned, so the copy reserves room for it
 * with its own bottom padding — change one and change the other.
 *
 * It also mounts OUTSIDE .saas-page on the register route, so nothing here may
 * depend on the shared page stylesheet.
 */
export default function CtaSection({
  title = "Ready to help your charity raise more?",
  subtitle = "Pick a plan, choose your web address, and we will walk you through the rest.",
  primaryLabel = "Get started",
  primaryTo = "/register",
  secondaryLabel = "Talk to us",
  secondaryTo = "/contact",
  className = "",
}) {
  return (
    <section className={`relative z-[1] overflow-hidden ${className}`} style={{ background: V.ink }}>
      <div className="relative z-10 px-6 pb-[clamp(200px,22vw,300px)] pt-[clamp(64px,8vw,104px)] text-center">
        <Reveal>
          <DonexusMark size={56} className="mx-auto mb-7" />
          <h2
            className="mx-auto max-w-[20ch] text-[clamp(28px,4vw,52px)] font-bold leading-[1.08] tracking-[-0.03em] text-white"
            style={{ fontFamily: "var(--font-heading, 'Outfit', ui-sans-serif, system-ui, sans-serif)" }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mx-auto mt-5 max-w-[46ch] text-[15.5px] leading-relaxed" style={{ color: "rgba(255,255,255,.6)" }}>
              {subtitle}
            </p>
          )}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Btn to={primaryTo} tone="brand">{primaryLabel}</Btn>
            <Btn to={secondaryTo} tone="outline">{secondaryLabel}</Btn>
          </div>
        </Reveal>
      </div>

      <ClosingHorizon className="absolute inset-x-0 bottom-0 block h-[clamp(180px,20vw,260px)] w-full" />
    </section>
  );
}
