import { motion } from "framer-motion";
import { reveal } from "../giving";

/* Stats band — dark, full-width strip of headline numbers. */
export default function StatsBandSection({ eyebrow, heading, items }) {
  const stats = Array.isArray(items) ? items.filter((s) => s && (s.value || s.label)) : [];
  if (!stats.length) return null;

  return (
    <section className="relative overflow-hidden bg-primary px-6 py-16 lg:py-20">
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        {(eyebrow || heading) && (
          <motion.div {...reveal()} className="mb-10 text-center">
            {eyebrow && (
              <span className="inline-flex items-center gap-1.5 border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                {eyebrow}
              </span>
            )}
            {heading && <h2 className="mt-3 font-heading text-3xl font-bold text-white md:text-4xl">{heading}</h2>}
          </motion.div>
        )}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: (i % 4) * 0.08 }}
              className="text-center"
            >
              <p className="font-heading text-4xl font-bold tabular-nums text-white md:text-5xl">{s.value}</p>
              {s.label && <p className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-white/70">{s.label}</p>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
