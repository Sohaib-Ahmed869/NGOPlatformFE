import { useEffect } from "react";
import { motion } from "framer-motion";
import NewsletterSection from "../Home/Newsletter/newsletter";
import usePageContent from "../../hooks/usePageContent";
import PageSections from "../../components/PageSections";

/**
 * Get Involved — section-based hub page. Content is an ordered list of blocks
 * (content.sections) edited with the admin section builder; the backend merges
 * the template's default sections over any tenant edits.
 */
const GetInvolved = () => {
  const { content } = usePageContent("getInvolved");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = Array.isArray(content?.sections) ? content.sections : [];

  return (
    <motion.div className="bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <PageSections sections={sections} />
      <NewsletterSection />
    </motion.div>
  );
};

export default GetInvolved;
