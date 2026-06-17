import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { SectionHeading, CardHoverGlow, IconBadge, icon as resolveIcon } from "../giving";

/* Icon feature grid — accent icon-badge cards with a title + text and an
   optional "Enquire" link. Used for Mission/Vision/Values, "Why partner",
   "Ways to get involved", etc. */
const FeatureGridSection = ({ eyebrow, heading, intro, items }) => {
  const reduce = useReducedMotion();
  const cards = Array.isArray(items) ? items : [];
  if (!cards.length) return null;

  return (
    <section className="bg-background px-6 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl">
        {(eyebrow || heading || intro) && (
          <SectionHeading icon={Sparkles} eyebrow={eyebrow} title={heading} intro={intro} center />
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((card, i) => {
            const Ic = resolveIcon(card.icon);
            const isLink = card.link && card.link !== "#";
            const cls =
              "group relative block h-full overflow-hidden rounded-token border-token border-gray-100 bg-white p-8 shadow-token transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20";
            const inner = (
              <>
                <CardHoverGlow />
                <div className="relative mb-5">
                  <IconBadge icon={Ic} size="lg" />
                </div>
                <h3 className="relative font-heading text-xl font-bold text-primary">{card.title}</h3>
                <p className="relative mt-3 text-sm leading-relaxed text-text-muted">{card.text}</p>
                {isLink && (
                  <span className="relative mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-all group-hover:gap-2.5">
                    Enquire <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </>
            );
            return (
              <motion.div
                key={card.title || i}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: (i % 3) * 0.08 }}
                whileHover={reduce ? {} : { y: -6 }}
              >
                {isLink ? <Link to={card.link} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeatureGridSection;
