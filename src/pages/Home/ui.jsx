import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Shared primitives for the homepage.
 *
 * The page runs a flat, illustration-led layout: solid pill controls, generous
 * corner radii, hairline borders and no heavy shadows — surfaces are separated
 * by colour, not elevation. Every surface declares its own `rounded-*` class on
 * purpose: the [data-public-site] shape CSS in index.css only auto-rounds
 * elements that have NOT opted into a radius, so these keep their shape under
 * every tenant shape token while still using the tenant's colours.
 */

export const R = {
  hero: "rounded-[2.5rem]",
  card: "rounded-[1.5rem]",
  tile: "rounded-[1.25rem]",
  panel: "rounded-[2rem]",
};

/* Scroll reveal. */
export function Reveal({ children, delay = 0, y = 24, className }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/* Small capsule label that opens a section. */
export function Eyebrow({ children, tone = "dark", className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]",
        tone === "light" ? "bg-white/10 text-white/85" : "bg-primary/[0.06] text-primary/70",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {children}
    </span>
  );
}

/* Solid pill control. `arrow` adds the corner chevron for links that lead off
   the page; leave it off for the primary actions, which read cleaner plain. */
export function PillButton({ to, href, children, tone = "accent", arrow = false, className }) {
  const styles = {
    accent: "bg-accent text-primary hover:brightness-[1.06]",
    dark: "bg-primary text-white hover:bg-primary-light",
    light: "bg-white text-primary hover:bg-white/90",
    ghost: "border border-primary/15 bg-transparent text-primary hover:bg-primary/[0.04]",
    outlineLight: "border border-white/25 bg-transparent text-white hover:bg-white/10",
  }[tone];

  const cls = cn(
    "inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-semibold leading-none transition-all duration-300",
    styles,
    className,
  );
  const inner = (
    <>
      {children}
      {arrow && <ArrowUpRight className="h-4 w-4" />}
    </>
  );

  if (href) return <a href={href} className={cls}>{inner}</a>;
  return <Link to={to || "#"} className={cls}>{inner}</Link>;
}

/* Text link with a sliding arrow. */
export function TextLink({ to, children, tone = "dark", className }) {
  return (
    <Link
      to={to || "#"}
      className={cn(
        "group inline-flex items-center gap-2 text-sm font-semibold transition-colors",
        tone === "light" ? "text-white/80 hover:text-white" : "text-primary hover:text-accent",
        className,
      )}
    >
      {children}
      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

/* Section heading block. */
export function SectionTitle({ eyebrow, title, intro, tone = "dark", center = false, className }) {
  return (
    <Reveal className={cn(center && "text-center", className)}>
      {eyebrow && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
      <h2
        className={cn(
          "mt-5 font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.08] tracking-[-0.03em]",
          tone === "light" ? "text-white" : "text-primary",
        )}
      >
        {title}
      </h2>
      {intro && (
        <p
          className={cn(
            "mt-4 max-w-lg text-[15px] leading-relaxed md:text-base",
            tone === "light" ? "text-white/60" : "text-text-muted",
            center && "mx-auto",
          )}
        >
          {intro}
        </p>
      )}
    </Reveal>
  );
}

/* Overlapping avatar row. */
export function AvatarStack({ people, size = "h-9 w-9" }) {
  return (
    <div className="flex -space-x-3">
      {people.map((src, i) => (
        <img key={i} src={src} alt="" loading="lazy" className={cn("rounded-full border-2 border-background object-cover", size)} />
      ))}
    </div>
  );
}
