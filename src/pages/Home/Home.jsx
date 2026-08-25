import { useEffect } from "react";
import { motion } from "framer-motion";
import usePageContent from "../../hooks/usePageContent";
import PageSections from "../../components/PageSections";
import Hero from "./Hero";
import TrustMarquee from "./sections/TrustMarquee";
import StoryBand from "./sections/StoryBand";
import ImpactBand from "./sections/ImpactBand";
import SpotlightCampaign from "./sections/SpotlightCampaign";
import HowItWorks from "./sections/HowItWorks";
import ClosingCTA from "./sections/ClosingCTA";
import Events from "./Events";
import Testimonials from "./Testimonials";
import NewsletterSection from "./Newsletter/newsletter";

/**
 * Home is a hybrid section-based page. The hero and the editorial sections
 * around it are bespoke (the hero is edited via the page's fixed hero fields),
 * the mid-page marketing (causes, CTA) are editable blocks (content.sections),
 * and the live Events feed + Testimonials carousel stay as fixed widgets.
 *
 * The hero is a flat-vector landscape whose river runs off the bottom edge into
 * <StoryBand/>, which is filled in the primary colour — the two are one continuous
 * image, so nothing may be inserted between them. After that the rhythm
 * alternates cream → dark → white so no two heavy surfaces meet.
 */
const Home = () => {
  const { content } = usePageContent("home");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = Array.isArray(content?.sections) ? content.sections : [];

  return (
    <motion.div data-home-display className="bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <Hero />
      {/* Picks up the river running off the bottom of the hero illustration. */}
      <StoryBand />
      <TrustMarquee />
      {/* Editable blocks: causes grid + CTA band (admin → Pages → Home). */}
      <PageSections sections={sections} />
      <HowItWorks />
      <SpotlightCampaign />
      <ImpactBand />
      <Events />
      <Testimonials />
      <ClosingCTA />
      <NewsletterSection />
    </motion.div>
  );
};

export default Home;
