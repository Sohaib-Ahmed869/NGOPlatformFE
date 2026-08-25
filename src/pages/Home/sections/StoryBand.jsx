import { motion, useReducedMotion } from "framer-motion";
import { useTenant } from "../../../context/TenantContext";
import usePageContent from "../../../hooks/usePageContent";
import { Reveal, PillButton } from "../ui";

/**
 * The colour block the hero's river runs into.
 *
 * Filled edge-to-edge in the primary colour so it continues the water at the
 * bottom of HeroIllustration with no seam. Carries the headline stats, which
 * used to sit in a bar under the hero — they read better here, against the
 * dark, than floating on the cream.
 */

const PHOTO = "https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=1000&q=80";

export default function StoryBand() {
  const { organisation } = useTenant();
  const { content } = usePageContent("home");
  const reduce = useReducedMotion();
  const orgName = organisation?.name || "We";

  const stats =
    Array.isArray(content?.hero?.stats) && content.hero.stats.length
      ? content.hero.stats.slice(0, 4)
      : [
          { value: "$2.4M+", label: "Raised" },
          { value: "48K+", label: "Lives impacted" },
          { value: "120+", label: "Projects" },
          { value: "30+", label: "Countries" },
        ];

  return (
    <section className="relative overflow-hidden bg-primary px-6 pb-16 pt-14 lg:pb-20 lg:pt-20">
      <span aria-hidden className="pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal className="relative">
            <div className="relative mx-auto max-w-lg lg:mx-0">
              <motion.span
                aria-hidden
                animate={reduce ? {} : { y: [0, -14, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-6 -top-6 h-24 w-24 rounded-[1.75rem] bg-accent/30 blur-[2px]"
              />
              <div className="relative overflow-hidden rounded-[1.5rem]">
                <img src={PHOTO} alt="" loading="lazy" className="h-[20rem] w-full object-cover sm:h-[24rem]" />
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <h2 className="font-display text-[clamp(1.9rem,4vw,3.25rem)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
                A new era of humanitarian impact
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-white/65">
                {orgName} run our own teams in thirty countries — no middlemen between your gift and the family it
                reaches, and every project logged in the open.
              </p>
            </Reveal>
            <Reveal delay={0.14}>
              <div className="mt-8">
                <PillButton to="/about" tone="light">
                  Read our story
                </PillButton>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Headline numbers */}
        <Reveal delay={0.1}>
          <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-[1.5rem] bg-white/10 lg:mt-20 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.label || i} className="bg-primary px-6 py-7 text-center lg:text-left">
                <p className="font-display text-3xl font-bold tracking-[-0.03em] text-white md:text-4xl">{s.value}</p>
                <p className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-white/45">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
