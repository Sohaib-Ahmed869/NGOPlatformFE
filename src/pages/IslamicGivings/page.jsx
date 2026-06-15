import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Moon, Calculator, ArrowRight, HandHeart, Coins, Heart } from "lucide-react";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { useTenant } from "../../context/TenantContext";
import usePageContent from "../../hooks/usePageContent";
import {
  PageHero,
  GivingSubNav,
  SectionHeading,
  CardHoverGlow,
  IconBadge,
  CTABand,
  icon,
} from "../../components/giving";
import { GIVING_PATHS, GIVING_FORMS, GIVING_TRUST, GIVING_NAV, GIVING_HERO_IMG } from "../../config/giving";

const IslamicGiving = () => {
  const { organisation } = useTenant();
  const { content } = usePageContent("giving");
  const hero = content?.hero || {};
  const reduce = useReducedMotion();
  const orgName = organisation?.name || "us";

  // CMS-editable cards, falling back to config defaults before content loads.
  const forms = content?.forms?.length ? content.forms : GIVING_FORMS;

  return (
    <motion.div className="bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <PageHero
        image={hero.image ?? GIVING_HERO_IMG}
        icon={Moon}
        eyebrow={hero.eyebrow ?? "Faith in action"}
        title={hero.title ?? "Islamic Giving"}
        subtitle={
          hero.subtitle ??
          "Fulfil your Zakat, multiply your reward this Ramadan, and give Sadaqah that reaches those who need it most."
        }
        maxWidth="max-w-5xl"
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/zakat/calculator"
            className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-light"
          >
            Calculate your Zakat <Calculator className="h-4 w-4" />
          </Link>
          <Link
            to="/Ramadan"
            className="inline-flex items-center gap-2 border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            Ramadan giving <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {GIVING_TRUST.map((t) => {
            const Ic = icon(t.icon);
            return (
              <span key={t.label} className="inline-flex items-center gap-2 text-xs font-medium text-white/70">
                <Ic className="h-4 w-4 text-accent" /> {t.label}
              </span>
            );
          })}
        </div>
      </PageHero>

      <GivingSubNav items={GIVING_NAV} />

      {/* ── Two primary journeys ─────────────────────────────────────────── */}
      <section className="bg-background px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading icon={HandHeart} eyebrow="Choose your path" title="Two ways to give with intention" center />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {GIVING_PATHS.map((p, i) => {
              const Ic = icon(p.icon);
              return (
                <motion.div
                  key={p.to}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
                  whileHover={reduce ? {} : { y: -6 }}
                >
                  <Link
                    to={p.to}
                    className="group relative flex h-full flex-col overflow-hidden border border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
                  >
                    <CardHoverGlow />
                    <div className="relative mb-6">
                      <IconBadge icon={Ic} size="lg" />
                    </div>
                    <p className="relative text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{p.eyebrow}</p>
                    <h3 className="relative mt-1 font-heading text-2xl font-bold text-primary">{p.title}</h3>
                    <p className="relative mt-3 flex-grow text-sm leading-relaxed text-text-muted">{p.description}</p>
                    <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent transition-all group-hover:gap-3">
                      {p.cta} <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Forms of Islamic giving (CMS-editable) ───────────────────────── */}
      <section className="bg-white px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            icon={Coins}
            eyebrow="Understanding the obligation"
            title="The forms of Islamic giving"
            intro="Whether obligatory or voluntary, every act of charity draws you closer to Allah. Here's how each form works."
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {forms.map((f, i) => {
              const Ic = icon(f.icon);
              return (
                <motion.div
                  key={f.title || i}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
                  whileHover={reduce ? {} : { y: -6 }}
                  className="group relative overflow-hidden border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
                >
                  <CardHoverGlow />
                  <div className="relative p-6">
                    <div className="mb-4">
                      <IconBadge icon={Ic} />
                    </div>
                    <h3 className="mb-1.5 font-heading text-base font-bold text-primary">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-text-muted">{f.text}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Closing CTA band ─────────────────────────────────────────────── */}
      <CTABand
        title={`Give with ${orgName} — and let your wealth purify your soul`}
        text="“The likeness of those who spend their wealth in the way of Allah is as the likeness of a grain that grows seven ears.”"
      >
        <Link
          to="/zakat/calculator"
          className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-light"
        >
          Calculate your Zakat <Calculator className="h-4 w-4" />
        </Link>
        <Link
          to="/donate"
          className="inline-flex items-center gap-2 border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          Give Sadaqah now <Heart className="h-4 w-4" />
        </Link>
      </CTABand>

      <NewsletterSection />
    </motion.div>
  );
};

export default IslamicGiving;
