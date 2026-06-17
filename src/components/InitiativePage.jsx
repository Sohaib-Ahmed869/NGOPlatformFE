import { useEffect } from "react";
import { motion } from "framer-motion";
import usePageContent from "../hooks/usePageContent";
import NewsletterSection from "../pages/Home/Newsletter/newsletter";
import QuickDonate from "../pages/Components/QuickDonate";
import PageSections from "./PageSections";

/**
 * Shared layout for the four "initiative" pages (Education, Water, Food,
 * Emergencies). These are now section-based: the backend synthesises blocks
 * from each page's content (config/sectionTypes.js → initiativeSections via the
 * template `buildSections` hook), and admins edit them with the section builder.
 *
 * The QuickDonate banner stays a live widget (it preselects this cause), so it's
 * rendered here rather than as a static block.
 */
const DONATE_HINT = { education: "Education", water: "Water", food: "Food", emergencies: "Emergency" };

const InitiativePage = ({ pageKey }) => {
  const { content } = usePageContent(pageKey);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pageKey]);

  const sections = Array.isArray(content?.sections) ? content.sections : [];
  const donateBanner = content?.donateBanner || {};

  return (
    <motion.div className="bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <PageSections sections={sections} />
      <QuickDonate image={donateBanner.image} title={donateBanner.title} defaultType={DONATE_HINT[pageKey]} />
      <NewsletterSection />
    </motion.div>
  );
};

export default InitiativePage;
