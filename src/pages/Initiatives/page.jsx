import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Target, ArrowRight, Heart, HandHeart } from "lucide-react";
import NewsletterSection from "../Home/Newsletter/newsletter";
import usePageContent from "../../hooks/usePageContent";
import { useTenant } from "../../context/TenantContext";
import { PageHero, GivingSubNav, SectionHeading, CardHoverGlow, CTABand } from "../../components/giving";
import { INITIATIVES_HUB_CARDS, INITIATIVES_NAV, INITIATIVES_HERO_IMG } from "../../config/initiatives";

/* One initiative card — a clickable link when it points somewhere, otherwise a
   static "Coming soon" card. */
function InitiativeCard({ card, reduce }) {
  const isLink = card.link && card.link !== "#";
  const inner = (
    <>
      <CardHoverGlow />
      <div className="relative h-44 overflow-hidden">
        <img
          src={card.icon}
          alt={card.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <h3 className="absolute bottom-3 left-4 font-heading text-lg font-bold text-white drop-shadow">{card.title}</h3>
      </div>
      <div className="relative flex flex-1 flex-col p-6">
        <p className="flex-1 text-sm leading-relaxed text-text-muted">{card.description}</p>
        {isLink ? (
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent transition-all group-hover:gap-3">
            Learn more <ArrowRight className="h-4 w-4" />
          </span>
        ) : (
          <span className="mt-4 inline-flex w-fit items-center bg-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
            Coming soon
          </span>
        )}
      </div>
    </>
  );

  const cls =
    "group relative flex h-full flex-col overflow-hidden border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduce ? {} : { y: -6 }}
    >
      {isLink ? (
        <Link to={card.link} className={cls}>
          {inner}
        </Link>
      ) : (
        <div className={cls}>{inner}</div>
      )}
    </motion.div>
  );
}

const InitiativesSection = () => {
  const { content } = usePageContent("initiatives");
  const { organisation } = useTenant();
  const reduce = useReducedMotion();
  const hero = content?.hero || {};
  const orgName = organisation?.name || "us";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const cards = content?.cards?.length ? content.cards : INITIATIVES_HUB_CARDS;

  return (
    <motion.div className="bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <PageHero
        image={hero.image ?? INITIATIVES_HERO_IMG}
        icon={Target}
        eyebrow={hero.eyebrow ?? "What we do"}
        title={hero.title ?? "Our Initiatives"}
        subtitle={hero.subtitle ?? "Programs that drive real, measurable impact in the communities that need it most."}
        maxWidth="max-w-4xl"
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/donate"
            className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-light"
          >
            Donate now <Heart className="h-4 w-4" />
          </Link>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            About our work <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PageHero>

      <GivingSubNav items={INITIATIVES_NAV} />

      {/* ── Programs grid ────────────────────────────────────────────────── */}
      <section className="bg-background px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            icon={Target}
            eyebrow="Our programs"
            title="Where your support goes"
            intro="Each initiative tackles a different need — explore the work and choose the cause closest to your heart."
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card, i) => (
              <InitiativeCard key={card.title || i} card={card} reduce={reduce} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <CTABand
        title={`Your support powers every initiative at ${orgName}`}
        text="From a child's first classroom to clean water and emergency relief — every gift turns into real, lasting change."
      >
        <Link
          to="/donate"
          className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-light"
        >
          Donate now <Heart className="h-4 w-4" />
        </Link>
        <Link
          to="/contact-us"
          className="inline-flex items-center gap-2 border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          Get involved <HandHeart className="h-4 w-4" />
        </Link>
      </CTABand>

      <NewsletterSection />
    </motion.div>
  );
};

export default InitiativesSection;
