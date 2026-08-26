import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { SectionHeading, CardHoverGlow } from "../giving";

/* Card / feature grid section — image-topped cards with an overlaid title,
   body copy and a "Read more" link. Mirrors the legacy About cards. */
const CardGridSection = ({ eyebrow, heading, intro, items }) => {
  const reduce = useReducedMotion();
  const cards = Array.isArray(items) ? items : [];
  if (!cards.length) return null;

  return (
    <section className="bg-background px-6 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl">
        {(eyebrow || heading || intro) && (
          <SectionHeading icon={Sparkles} eyebrow={eyebrow} title={heading} intro={intro} center />
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => {
            const isLink = card.link && card.link !== "#";
            const cls =
              "group relative flex h-full flex-col overflow-hidden rounded-token border-token border-gray-100 bg-white shadow-token transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20";
            const inner = (
              <>
                <CardHoverGlow />
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={card.image}
                    alt={card.title || ""}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                  <h3 className="absolute bottom-3 left-4 right-4 font-heading text-lg font-bold text-white drop-shadow">
                    {card.title}
                  </h3>
                </div>
                <div className="relative flex flex-1 flex-col p-5">
                  <p className="flex-1 text-sm leading-relaxed text-text-muted">{card.description}</p>
                  {isLink && (
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent transition-all group-hover:gap-3">
                      Read more <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </>
            );
            return (
              <motion.div
                key={card.title || i}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: (i % 4) * 0.08 }}
                whileHover={reduce ? {} : { y: -6 }}
              >
                {isLink ? (
                  <Link to={card.link} className={cls}>{inner}</Link>
                ) : (
                  <div className={cls}>{inner}</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CardGridSection;
