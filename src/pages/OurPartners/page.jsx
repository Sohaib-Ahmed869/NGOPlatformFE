import { useEffect } from "react";
import { motion } from "framer-motion";
import NewsletterSection from "../Home/Newsletter/newsletter";
import usePageContent from "../../hooks/usePageContent";
import PageSections from "../../components/PageSections";

/**
 * Our Partners — a fully section-based (block) page. Content is an ordered list
 * of sections (content.sections) edited with the admin section builder. The
 * backend merges the template's default sections over any tenant edits, so
 * `content.sections` is always populated.
 */
const PartnersSection = () => {
  const { content } = usePageContent("partners");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = Array.isArray(content?.sections) ? content.sections : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <PageSections sections={sections} />
      <NewsletterSection />
    </motion.div>
  );
};

export default PartnersSection;
