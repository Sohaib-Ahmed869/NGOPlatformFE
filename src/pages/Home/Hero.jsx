import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import usePageContent from "../../hooks/usePageContent";
import HeroIllustration from "./sections/HeroIllustration";

/**
 * Centred hero over a full-bleed flat-vector landscape.
 *
 * The copy block sits on the cream sky at the top of the illustration; the
 * illustration's river runs off the bottom edge into the primary-filled band
 * that follows (see sections/StoryBand.jsx), so the two read as one scene.
 *
 * Content still comes from the page's fixed hero fields, so the admin editor is
 * unchanged. `hero.image`, when set, is NOT used here — the illustration is the
 * hero art; the field remains in use by the donor dashboard header.
 */
const Hero = () => {
  const { content } = usePageContent("home");
  const hero = content?.hero || {};
  const reduce = useReducedMotion();

  const title = hero.title ?? "Changing Lives, One Act of Kindness";
  const subtitle =
    hero.subtitle ??
    "Every gift is tracked from your card to the field, so kindness reaches the people who need it — and you can see exactly where it landed.";
  const primaryCtaText = hero.primaryCtaText ?? "Donate Now";
  const primaryCtaLink = hero.primaryCtaLink ?? "/donate";
  const secondaryCtaText = hero.secondaryCtaText ?? "Learn More";
  const secondaryCtaLink = hero.secondaryCtaLink ?? "/about";

  const rise = (delay) => ({
    initial: reduce ? false : { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
  });

  return (
    <section className="relative overflow-hidden bg-background">
      {/* ── Copy ─────────────────────────────────────────────── */}
      <div className="relative z-10 px-6 pb-10 pt-32 text-center lg:pb-14 lg:pt-40">
        <motion.h1
          {...rise(0.05)}
          className="mx-auto max-w-4xl font-display text-[clamp(2.25rem,5.2vw,4.25rem)] font-bold leading-[1.08] tracking-[-0.03em] text-primary"
          style={{ textWrap: "balance" }}
        >
          {title}
        </motion.h1>

        <motion.p
          {...rise(0.15)}
          className="mx-auto mt-6 max-w-xl font-display text-base leading-relaxed text-text-muted md:text-lg"
        >
          {subtitle}
        </motion.p>

        <motion.div {...rise(0.25)} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={primaryCtaLink}
            className="inline-flex items-center rounded-full bg-accent px-8 py-3.5 font-display text-[15px] font-semibold text-primary transition-transform duration-300 hover:scale-[1.03]"
          >
            {primaryCtaText}
          </Link>
          <Link
            to={secondaryCtaLink}
            className="inline-flex items-center rounded-full bg-primary px-8 py-3.5 font-display text-[15px] font-semibold text-white transition-colors duration-300 hover:bg-primary-light"
          >
            {secondaryCtaText}
          </Link>
        </motion.div>
      </div>

      {/* ── Landscape ────────────────────────────────────────── */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        className="relative -mb-px"
      >
        <HeroIllustration />
      </motion.div>
    </section>
  );
};

export default Hero;
