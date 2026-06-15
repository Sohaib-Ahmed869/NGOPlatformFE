import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Handshake,
  HeartHandshake,
  Building2,
  Users,
  Globe,
  Sparkles,
  Boxes,
  Megaphone,
  ShieldCheck,
  TrendingUp,
  Award,
  ArrowRight,
  Heart,
} from "lucide-react";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { useTenant } from "../../context/TenantContext";
import usePageContent from "../../hooks/usePageContent";
import {
  PageHero,
  SectionHeading,
  CardHoverGlow,
  IconBadge,
  CTABand,
  reveal,
} from "../../components/giving";
import {
  PARTNERS_HERO_IMG,
  PARTNERS_STATS,
  PARTNERS_WHY,
  PARTNERS_WAYS,
  PARTNERS_DEFAULT,
} from "../../config/partners";

// Resolve the plain icon-name strings used in config/partners.js (CMS-ready).
const ICONS = {
  Handshake,
  HeartHandshake,
  Building2,
  Users,
  Globe,
  Sparkles,
  Boxes,
  Megaphone,
  ShieldCheck,
  TrendingUp,
  Award,
  Heart,
};
const ic = (name) => ICONS[name] || Handshake;

// Inline SVG placeholder so a broken/missing logo never shows a broken image.
const LOGO_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23f1f0ec'/%3E%3Cg transform='translate(70 70)' fill='none' stroke='%23b9b3a7' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='30' cy='30' r='28'/%3E%3Cpath d='M18 34l8 8 16-18'/%3E%3C/g%3E%3C/svg%3E";

/* Card animation shared by the grids. */
const cardIn = (i) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: (i % 4) * 0.08 },
});

const PartnersSection = () => {
  const { organisation } = useTenant();
  const { content } = usePageContent("partners");
  const hero = content?.hero || {};
  const reduce = useReducedMotion();
  const orgName = organisation?.name || "us";

  // CMS-editable lists, falling back to config defaults before content loads.
  const stats = content?.stats?.length ? content.stats : PARTNERS_STATS;
  const why = content?.why?.length ? content.why : PARTNERS_WHY;
  const ways = content?.ways?.length ? content.ways : PARTNERS_WAYS;
  const partners = content?.partners?.length ? content.partners : PARTNERS_DEFAULT;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <PageHero
        image={hero.image ?? PARTNERS_HERO_IMG}
        icon={Handshake}
        eyebrow={hero.eyebrow ?? "Stronger together"}
        title={hero.title ?? "Our Partners"}
        subtitle={
          hero.subtitle ??
          "We're proud to stand alongside organisations and individuals who share our mission — together, our impact reaches further."
        }
        maxWidth="max-w-5xl"
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/become-a-partner"
            className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-light"
          >
            Become a partner <HeartHandshake className="h-4 w-4" />
          </Link>
          <Link
            to="/donate"
            className="inline-flex items-center gap-2 border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            Support our work <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PageHero>

      {/* ── Stats band ───────────────────────────────────────────────────── */}
      {stats.length > 0 && (
        <section className="border-b border-gray-100 bg-white px-6 py-12">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div key={s.label || i} {...reveal(i * 0.08)} className="text-center">
                <p className="font-heading text-3xl font-bold text-accent md:text-4xl">{s.value}</p>
                <p className="mt-1 text-sm text-text-muted">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Why partner with us ──────────────────────────────────────────── */}
      <section className="bg-background px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            icon={Sparkles}
            eyebrow={content?.whyEyebrow ?? "Why partner with us"}
            title={content?.whyHeading ?? "Collaboration that creates real change"}
            intro={content?.whyIntro ?? "When good people and good organisations join forces, the impact compounds. Here's what partnering with us means."}
            center
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {why.map((w, i) => {
              const Ic = ic(w.icon);
              return (
                <motion.div
                  key={w.title || i}
                  {...cardIn(i)}
                  whileHover={reduce ? {} : { y: -6 }}
                  className="group relative overflow-hidden border border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
                >
                  <CardHoverGlow />
                  <div className="relative mb-5">
                    <IconBadge icon={Ic} size="lg" />
                  </div>
                  <h3 className="relative font-heading text-xl font-bold text-primary">{w.title}</h3>
                  <p className="relative mt-3 text-sm leading-relaxed text-text-muted">{w.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Partner logos grid ───────────────────────────────────────────── */}
      <section className="bg-white px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            icon={Handshake}
            eyebrow={content?.introLabel ?? "Our network"}
            title={content?.introHeading ?? "We are proudly partnered with"}
            center
          />
          <motion.div
            className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          >
            {partners.map((partner, index) => (
              <motion.div
                key={partner.name || index}
                variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
                whileHover={reduce ? {} : { y: -6 }}
                className="group relative flex flex-col items-center overflow-hidden border border-gray-100 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
              >
                <CardHoverGlow />
                <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-full border border-gray-100 bg-gray-50">
                  <img
                    src={partner.logo || LOGO_FALLBACK}
                    alt={partner.name}
                    loading="lazy"
                    onError={(e) => { e.target.onerror = null; e.target.src = LOGO_FALLBACK; }}
                    className="h-full w-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
                  />
                </div>
                <p className="relative text-sm font-semibold text-primary">{partner.name}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Ways to get involved ─────────────────────────────────────────── */}
      <section className="bg-background px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            icon={HeartHandshake}
            eyebrow={content?.waysEyebrow ?? "Get involved"}
            title={content?.waysHeading ?? "Ways to partner with us"}
            intro={content?.waysIntro ?? "However you're placed to help, there's a way to work together. Find the partnership that fits you."}
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ways.map((w, i) => {
              const Ic = ic(w.icon);
              return (
                <motion.div key={w.title || i} {...cardIn(i)} whileHover={reduce ? {} : { y: -6 }}>
                  <Link
                    to={`/become-a-partner?type=${w.type || "other"}`}
                    className="group relative block h-full overflow-hidden border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
                  >
                    <CardHoverGlow />
                    <div className="relative p-6">
                      <div className="mb-4">
                        <IconBadge icon={Ic} />
                      </div>
                      <h3 className="mb-1.5 font-heading text-base font-bold text-primary">{w.title}</h3>
                      <p className="text-sm leading-relaxed text-text-muted">{w.text}</p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-all group-hover:gap-2.5">
                        Enquire <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Closing CTA band ─────────────────────────────────────────────── */}
      <CTABand
        title={content?.cta?.title ?? `Let's create change together with ${orgName}`}
        text={content?.cta?.text ?? "Whether you're an organisation, business or community group, we'd love to explore how we can work together."}
      >
        <Link
          to="/become-a-partner"
          className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-light"
        >
          Become a partner <HeartHandshake className="h-4 w-4" />
        </Link>
        <Link
          to="/donate"
          className="inline-flex items-center gap-2 border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          Donate now <Heart className="h-4 w-4" />
        </Link>
      </CTABand>

      <NewsletterSection />
    </motion.div>
  );
};

export default PartnersSection;
