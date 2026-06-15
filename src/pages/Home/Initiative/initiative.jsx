import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Target, ArrowRight } from "lucide-react";
import { Eyebrow, CardHoverGlow } from "../../../components/giving";
import { INITIATIVES_HUB_CARDS } from "../../../config/initiatives";

const InitiativesSection = () => {
  const reduce = useReducedMotion();
  // Real, correctly-linked initiatives (drop the "coming soon" placeholders).
  const cards = INITIATIVES_HUB_CARDS.filter((c) => c.link && c.link !== "#").slice(0, 4);

  return (
    <section className="bg-background px-6 py-20 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow icon={Target}>Where your support goes</Eyebrow>
            <h2 className="mt-3 font-heading text-3xl font-bold text-primary md:text-4xl">
              Programs that create lasting change
            </h2>
            <p className="mt-3 max-w-2xl text-text-muted">
              Every contribution is directed to programs that deliver real, measurable impact in the communities that need it most.
            </p>
          </div>
          <Link
            to="/initiatives"
            className="inline-flex shrink-0 items-center gap-2 border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-accent/50 hover:text-accent"
          >
            View all initiatives <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <motion.div
              key={c.title || i}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: (i % 4) * 0.08 }}
              whileHover={reduce ? {} : { y: -6 }}
            >
              <Link
                to={c.link}
                className="group relative flex h-full flex-col overflow-hidden border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
              >
                <CardHoverGlow />
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={c.icon}
                    alt={c.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                  <h3 className="absolute bottom-3 left-4 font-heading text-lg font-bold text-white drop-shadow">{c.title}</h3>
                </div>
                <div className="relative flex flex-1 flex-col p-5">
                  <p className="flex-1 text-sm leading-relaxed text-text-muted">{c.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent transition-all group-hover:gap-3">
                    Learn more <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InitiativesSection;
