import { useEffect } from "react";
import { motion } from "framer-motion";
import NewsletterSection from "../Home/Newsletter/newsletter";
import usePageContent from "../../hooks/usePageContent";
import PageSections from "../../components/PageSections";

/**
 * About is a fully section-based (block) page. Content is an ordered list of
 * sections (content.sections) edited with the admin section builder. For
 * tenants seeded before the section builder existed, we synthesise an
 * equivalent section list from the legacy { hero, cards } content so nothing
 * regresses until they're backfilled.
 */
function legacyAboutSections(content) {
  const hero = content?.hero || {};
  const cards = Array.isArray(content?.cards) ? content.cards : [];
  return [
    {
      id: "about-hero",
      type: "hero",
      data: {
        eyebrow: hero.eyebrow ?? "Who we are",
        title: hero.title ?? "About Us",
        subtitle: hero.subtitle ?? "Our mission to create lasting, measurable change in the communities we serve.",
        image: hero.image,
        icon: "HandHeart",
        primaryCtaText: "Support our work",
        primaryCtaLink: "/donate",
        secondaryCtaText: "Get in touch",
        secondaryCtaLink: "/contact-us",
      },
    },
    cards.length
      ? {
          id: "about-cards",
          type: "cardGrid",
          data: {
            eyebrow: "Get to know us",
            heading: "The people and purpose behind our work",
            intro: "From our mission and leadership to our partners and impact — here's what drives everything we do.",
            items: cards.map((c) => ({ image: c.image, title: c.title, description: c.description, link: c.link })),
          },
        }
      : null,
    {
      id: "about-cta",
      type: "ctaBand",
      data: {
        title: "Be part of the story",
        text: "Your support turns our mission into real, lasting change — join us today.",
        primaryCtaText: "Donate now",
        primaryCtaLink: "/donate",
        secondaryCtaText: "Explore our work",
        secondaryCtaLink: "/initiatives",
      },
    },
  ].filter(Boolean);
}

const AboutSection = () => {
  const { content } = usePageContent("about");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections =
    Array.isArray(content?.sections) && content.sections.length
      ? content.sections
      : legacyAboutSections(content);

  return (
    <motion.div className="bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <PageSections sections={sections} />
      <NewsletterSection />
    </motion.div>
  );
};

export default AboutSection;
