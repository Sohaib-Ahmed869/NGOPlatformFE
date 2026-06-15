import { useEffect } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Droplets, Utensils, LifeBuoy, Target, TrendingUp, Sparkles, Award } from "lucide-react";
import usePageContent from "../hooks/usePageContent";
import NewsletterSection from "../pages/Home/Newsletter/newsletter";
import QuickDonate from "../pages/Components/QuickDonate";
import AutoPlayIframe from "../pages/Components/AutoPlayIframe";
import { PageHero, GivingSubNav, SectionHeading, Eyebrow, CardHoverGlow, IconBadge, reveal } from "./giving";
import { INITIATIVES, INITIATIVES_NAV } from "../config/initiatives";

/**
 * Shared layout for the four "initiative" pages (Education, Water, Food,
 * Emergencies). Renders a premium, consistent page from `usePageContent(key)`
 * merged over `src/config/initiatives.js` defaults: existing CMS copy wins, and
 * the config fills the new structural pieces (eyebrow, mission media, stats,
 * secondary feature). Media is image-first — a video only renders when a
 * `videoId` is set, so the page can never show a broken embed.
 */

const ICONS = { GraduationCap, Droplets, Utensils, LifeBuoy, Target, TrendingUp, Sparkles, Award };
const resolveIcon = (name) => ICONS[name] || Sparkles;

// Hint that pre-selects a relevant cause in the donate banner per page.
const DONATE_HINT = { education: "Education", water: "Water", food: "Food", emergencies: "Emergency" };

/* Image, or a video when one is configured. */
function Media({ image, videoId, alt }) {
  return videoId ? (
    <AutoPlayIframe videoId={videoId} title={alt} className="w-full" />
  ) : (
    <img src={image} alt={alt} className="aspect-[4/3] w-full object-cover" loading="lazy" />
  );
}

/* Media + text feature row (media side alternates via `reverse`). */
function Feature({ icon, eyebrow, heading, text, image, videoId, reverse, bg }) {
  return (
    <section className={`${bg} px-6 py-16 lg:py-20`}>
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <motion.div
          {...reveal()}
          className={`overflow-hidden border border-gray-100 shadow-md ${reverse ? "lg:order-2" : ""}`}
        >
          <Media image={image} videoId={videoId} alt={heading} />
        </motion.div>
        <motion.div {...reveal(0.1)}>
          {eyebrow && <Eyebrow icon={icon}>{eyebrow}</Eyebrow>}
          <h2 className="mt-3 font-heading text-2xl font-bold text-primary md:text-3xl">{heading}</h2>
          <p className="mt-4 leading-relaxed text-text-muted">{text}</p>
        </motion.div>
      </div>
    </section>
  );
}

const InitiativePage = ({ pageKey }) => {
  const fallback = INITIATIVES[pageKey] || {};
  const { content } = usePageContent(pageKey);
  const c = content || {};

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pageKey]);

  // Content wins (real/seeded CMS copy); config fills the new structural fields.
  const hero = { ...fallback.hero, ...(c.hero || {}) };
  const mission = { ...fallback.mission, ...(c.mission || {}) };
  const donateBanner = { ...fallback.donateBanner, ...(c.donateBanner || {}) };
  const focusHeading = c.focusHeading || fallback.focusHeading || "Our Focus Areas";
  const focusAreas = c.focusAreas?.length ? c.focusAreas : fallback.focusAreas || [];
  const stats = c.stats?.items?.length ? c.stats : fallback.stats;
  const feature = c.feature?.heading ? { ...fallback.feature, ...c.feature } : fallback.feature;
  const Icon = resolveIcon(fallback.icon);

  const focusCols =
    focusAreas.length === 2 ? "md:grid-cols-2" : focusAreas.length >= 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3";

  return (
    <motion.div className="bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <PageHero image={hero.image} icon={Icon} eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} />

      <GivingSubNav items={INITIATIVES_NAV} />

      {/* Mission feature */}
      <Feature
        icon={Icon}
        eyebrow={mission.eyebrow || "Our mission"}
        heading={mission.heading}
        text={mission.text}
        image={mission.image}
        videoId={mission.videoId}
        bg="bg-background"
      />

      <QuickDonate image={donateBanner.image} title={donateBanner.title} defaultType={DONATE_HINT[pageKey]} />

      {/* Impact stats */}
      {stats?.items?.length ? (
        <section className="bg-white px-6 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeading icon={TrendingUp} eyebrow="Our impact" title={stats.heading || "Our Impact in Numbers"} center />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {stats.items.map((s, i) => (
                <motion.div
                  key={i}
                  {...reveal((i % 3) * 0.05)}
                  className="group relative overflow-hidden border border-gray-100 bg-white p-7 text-center shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
                >
                  <CardHoverGlow />
                  <div className="relative mx-auto mb-4 w-fit">
                    <IconBadge icon={Award} />
                  </div>
                  <h3 className="relative font-heading text-2xl font-bold text-primary">{s.value}</h3>
                  {s.tagline && <p className="relative mt-2 text-sm font-medium text-text-muted">{s.tagline}</p>}
                  {s.tags?.length ? (
                    <div className="relative mt-3 flex flex-wrap justify-center gap-2">
                      {s.tags.map((t, ti) => (
                        <span key={ti} className="bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">{t}</span>
                      ))}
                    </div>
                  ) : null}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Focus areas */}
      {focusAreas.length ? (
        <section className="bg-background px-6 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeading icon={Target} eyebrow="What we do" title={focusHeading} />
            <div className={`grid grid-cols-1 gap-6 ${focusCols}`}>
              {focusAreas.map((area, i) => (
                <motion.div
                  key={i}
                  {...reveal((i % 3) * 0.08)}
                  className="group relative flex flex-col overflow-hidden border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={area.image}
                      alt={area.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-heading text-base font-bold text-primary">{area.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-muted">{area.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Secondary feature (optional) */}
      {feature?.heading ? (
        <Feature
          icon={Sparkles}
          eyebrow={feature.eyebrow || "Our story"}
          heading={feature.heading}
          text={feature.text}
          image={feature.image}
          videoId={feature.videoId}
          reverse
          bg="bg-white"
        />
      ) : null}

      <NewsletterSection />
    </motion.div>
  );
};

export default InitiativePage;
