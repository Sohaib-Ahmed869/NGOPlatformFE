import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Reveal, Eyebrow } from "../../pages/Home/ui";

/* Card / feature grid section — tall image cards with the title set over the
   photograph and a corner arrow chip. Shares the homepage's rounded editorial
   language (see pages/Home/ui.jsx) so a page mixing bespoke and CMS blocks
   reads as one design. */
const CardGridSection = ({ eyebrow, heading, intro, items }) => {
  const reduce = useReducedMotion();
  const cards = Array.isArray(items) ? items : [];
  if (!cards.length) return null;

  return (
    <section className="bg-background px-6 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl">
        {(eyebrow || heading || intro) && (
          <Reveal className="mb-12 max-w-2xl">
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {heading && (
              <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.08] tracking-[-0.03em] text-primary">
                {heading}
              </h2>
            )}
            {intro && <p className="mt-4 text-[15px] leading-relaxed text-text-muted md:text-base">{intro}</p>}
          </Reveal>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => {
            const isLink = card.link && card.link !== "#";
            const cls =
              "group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-primary/10 bg-white transition-colors duration-300 hover:border-accent/50";
            const inner = (
              <>
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={card.image}
                    alt={card.title || ""}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/10 to-transparent" />
                  <h3 className="absolute bottom-4 left-5 right-14 font-display text-xl font-bold leading-tight text-white">
                    {card.title}
                  </h3>
                  {isLink && (
                    <span className="absolute bottom-4 right-4 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-primary transition-all duration-300 group-hover:rotate-45 group-hover:bg-accent">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="flex-1 text-sm leading-relaxed text-text-muted">{card.description}</p>
                </div>
              </>
            );
            return (
              <motion.div
                key={card.title || i}
                initial={reduce ? false : { opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: (i % 4) * 0.08 }}
                whileHover={reduce ? {} : { y: -6 }}
                className="h-full"
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
