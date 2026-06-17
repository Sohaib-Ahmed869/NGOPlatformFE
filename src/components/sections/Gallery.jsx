import { motion } from "framer-motion";
import { SectionHeading } from "../giving";

/* Section: responsive image grid with hover zoom + optional caption overlay. */
export default function GallerySection({ eyebrow, heading, items }) {
  const list = Array.isArray(items) ? items.filter((it) => it && it.image) : [];
  if (!list.length) return null;
  return (
    <section className="bg-background px-6 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl">
        {(eyebrow || heading) && <SectionHeading eyebrow={eyebrow} title={heading} center />}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: Math.min(i * 0.05, 0.4) }}
              className="group relative overflow-hidden rounded-token"
            >
              <img
                src={it.image}
                alt={it.caption || ""}
                loading="lazy"
                className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {it.caption && (
                <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="p-3 text-sm font-medium text-white">{it.caption}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
