import { useReducedMotion } from "framer-motion";
import { cn } from "../../../utils/cn";

/* The values strip that sits directly under the hero — an endless run of the
   words the brand stands for, separated by accent diamonds. Uses the shared
   `animate-marquee` keyframe (see tailwind.config.js) and falls back to a
   static, wrapped row under reduced motion. */

const WORDS = [
  "Zakat & Sadaqah",
  "Clean Water",
  "Emergency Relief",
  "Education",
  "Orphan Care",
  "Food Security",
  "100% Donation Policy",
];

function Run({ ariaHidden }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-10 pr-10" aria-hidden={ariaHidden}>
      {WORDS.map((w, i) => (
        <span key={`${w}-${i}`} className="flex items-center gap-10 whitespace-nowrap">
          <span className="font-display text-lg font-semibold tracking-[-0.03em] text-primary/70 md:text-xl">{w}</span>
          <span className="h-1.5 w-1.5 rotate-45 bg-accent" />
        </span>
      ))}
    </div>
  );
}

export default function TrustMarquee() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-y border-primary/10 bg-warm-cream/60 py-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-28" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-28" />
      <div
        className={cn(
          "flex items-center",
          reduce ? "w-full flex-wrap justify-center gap-y-3 px-6" : "w-max animate-marquee",
        )}
      >
        <Run />
        {!reduce && <Run ariaHidden />}
      </div>
    </section>
  );
}
