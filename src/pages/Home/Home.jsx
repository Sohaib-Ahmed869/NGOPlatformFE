import { useEffect } from "react";
import { motion } from "framer-motion";
import usePageContent from "../../hooks/usePageContent";
import PageSections from "../../components/PageSections";
import Hero from "./Hero";
import Events from "./Events";
import Testimonials from "./Testimonials";
import NewsletterSection from "./Newsletter/newsletter";

/**
 * Home is a hybrid section-based page. The hero keeps its original bespoke
 * design (the <Hero/> component, edited via the page's fixed hero fields), the
 * mid-page marketing (causes, CTA) are editable blocks (content.sections), and
 * the live Events feed + Testimonials carousel stay as fixed widgets.
 */
const Home = () => {
  const { content } = usePageContent("home");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = Array.isArray(content?.sections) ? content.sections : [];

  return (
    <motion.div className="bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <Hero />
      <PageSections sections={sections} />
      <Events />
      <Testimonials />
      <NewsletterSection />
    </motion.div>
  );
};

export default Home;
