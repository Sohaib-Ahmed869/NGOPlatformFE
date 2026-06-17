import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { SectionHeading, CardHoverGlow } from "../giving";

/* Team grid — photo cards with name / role / bio. */
export default function TeamGridSection({ eyebrow, heading, intro, items }) {
  const members = Array.isArray(items) ? items.filter((m) => m && (m.name || m.photo)) : [];
  if (!members.length) return null;

  return (
    <section className="bg-background px-6 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl">
        {(eyebrow || heading || intro) && (
          <SectionHeading icon={Users} eyebrow={eyebrow} title={heading} intro={intro} center />
        )}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: (i % 3) * 0.08 }}
            >
              <div className="group relative flex h-full flex-col overflow-hidden rounded-token border-token border-gray-100 bg-white shadow-token transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20">
                <CardHoverGlow />
                {m.photo && (
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={m.photo}
                      alt={m.name || ""}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="relative flex flex-1 flex-col p-5">
                  {m.name && <h3 className="font-heading text-lg font-bold text-primary">{m.name}</h3>}
                  {m.role && <p className="mt-0.5 text-sm font-medium text-accent">{m.role}</p>}
                  {m.bio && <p className="mt-2 text-sm leading-relaxed text-text-muted">{m.bio}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
