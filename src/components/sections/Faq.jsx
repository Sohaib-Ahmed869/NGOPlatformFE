import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { SectionHeading } from "../giving";
import RichText from "../RichText";
import { cn } from "../../utils/cn";

/* Section: an accordion of question/answer pairs (one open at a time). */
export default function FaqSection({ eyebrow, heading, items }) {
  const list = Array.isArray(items) ? items.filter((it) => it && (it.question || it.answer)) : [];
  const [open, setOpen] = useState(-1);
  if (!list.length) return null;
  return (
    <section className="bg-white px-6 py-16 lg:py-24">
      <div className="mx-auto max-w-3xl">
        {(eyebrow || heading) && <SectionHeading eyebrow={eyebrow} title={heading} center />}
        <div className="border-token border-gray-100 rounded-token">
          {list.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className={cn(i > 0 && "border-t border-gray-100")}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-background rounded-token-btn"
                >
                  <span className="font-medium text-primary">{it.question}</span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-accent transition-transform duration-200", isOpen && "rotate-180")} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && it.answer && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <RichText html={it.answer} className="px-5 pb-4 text-text-muted" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
