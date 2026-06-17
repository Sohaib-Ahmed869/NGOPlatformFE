import { useRef } from "react";
import { NavLink } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  Moon,
  Calculator,
  Coins,
  HandHeart,
  HandCoins,
  Sparkles,
  Gem,
  ShieldCheck,
  Heart,
  Star,
  Wallet,
  TrendingUp,
  Briefcase,
  Scale,
  ArrowRight,
  Target,
  LayoutGrid,
  GraduationCap,
  Droplets,
  Utensils,
  LifeBuoy,
  Eye,
  Globe,
  Building2,
  Users,
  Boxes,
  Megaphone,
  Handshake,
  Award,
} from "lucide-react";
import { useTenant } from "../context/TenantContext";
import { cn } from "../utils/cn";

/* Resolves the plain string icon names used in the content config to lucide
   components, so the content config stays serialisable (CMS-ready). */
export const ICONS = {
  Moon,
  Calculator,
  Coins,
  HandHeart,
  HandCoins,
  Sparkles,
  Gem,
  ShieldCheck,
  Heart,
  Star,
  Wallet,
  TrendingUp,
  Briefcase,
  Scale,
  ArrowRight,
  Target,
  LayoutGrid,
  GraduationCap,
  Droplets,
  Utensils,
  LifeBuoy,
  Eye,
  Globe,
  Building2,
  Users,
  Boxes,
  Megaphone,
  Handshake,
  Award,
};

export const icon = (name) => ICONS[name] || ArrowRight;

/**
 * Shared building blocks for the giving suite (Islamic Giving hub, Zakat
 * Calculator, Ramadan Giving). These were copy-pasted across each page; this
 * module is the single source of truth so the whole suite stays consistent.
 */

/* Scroll-reveal motion preset (mirrors the Donate / Contact pages). */
export const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
});

/* Small accent pill used to introduce a section. */
export function Eyebrow({ icon: Icon, children, light = false }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-token px-3 py-1 text-xs font-semibold uppercase tracking-wider",
        light ? "border border-white/25 bg-white/10 text-white backdrop-blur-sm" : "bg-accent/10 text-accent",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />} {children}
    </span>
  );
}

/* Soft accent wash that fades in on hover. Drop inside a `group relative
   overflow-hidden` card as its first child. */
export function CardHoverGlow() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
    />
  );
}

/* The rounded accent icon tile used on every feature/info card. Animates with
   its parent `group` on hover. */
export function IconBadge({ icon: Icon, size = "md" }) {
  const dim = size === "lg" ? "h-14 w-14" : "h-12 w-12";
  const ic = size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl bg-accent/10 text-accent transition-all duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-accent group-hover:text-white",
        dim,
      )}
    >
      <Icon className={ic} />
    </span>
  );
}

/* Standard section heading (eyebrow + title + optional intro). */
export function SectionHeading({ icon, eyebrow, title, intro, center = false }) {
  return (
    <motion.div {...reveal()} className={cn("mb-10", center && "text-center")}>
      <Eyebrow icon={icon}>{eyebrow}</Eyebrow>
      <h2 className="mt-3 font-heading text-3xl font-bold text-primary md:text-4xl">{title}</h2>
      {intro && <p className={cn("mt-3 max-w-2xl text-text-muted", center && "mx-auto")}>{intro}</p>}
    </motion.div>
  );
}

/* Full-bleed parallax hero shared by every giving page. `children` renders
   below the subtitle (CTAs, trust badges, etc.). */
export function PageHero({ image, icon, eyebrow, title, subtitle, align = "center", maxWidth = "max-w-4xl", children }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "16%"]);
  const bgScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 1.12]);
  const centered = align === "center";
  const Icon = icon;

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden pb-20 pt-32 lg:pb-24 lg:pt-40"
    >
      <motion.div style={{ y: bgY, scale: bgScale }} className="absolute -inset-y-[8%] inset-x-0 will-change-transform">
        <img src={image} alt="" className="h-full w-full object-cover" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/40" />
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: `linear-gradient(135deg, var(--tenant-primary, #2C2418), transparent 70%)` }}
      />
      <div className={cn("relative z-10 mx-auto px-6", maxWidth, centered && "text-center")}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {eyebrow && (
            <span className="inline-flex items-center gap-1.5 rounded-token border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              {Icon && <Icon className="h-3.5 w-3.5" />} {eyebrow}
            </span>
          )}
          <h1 className="mt-5 font-heading text-4xl font-bold leading-[1.08] text-white md:text-5xl lg:text-6xl">{title}</h1>
          {subtitle && (
            <p className={cn("mt-5 max-w-2xl font-body text-lg leading-relaxed text-white/75", centered && "mx-auto")}>
              {subtitle}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </motion.div>
      </div>
    </section>
  );
}

/* Sub-navigation that ties the giving pages together into one section. A
   centered, floating segmented control that straddles the bottom of the hero
   (it is NOT sticky — it scrolls away with the page). Highlights the active
   page, hides pages the tenant has disabled, and disappears if only one remains. */
export function GivingSubNav({ items }) {
  const { isPathEnabled } = useTenant();
  const visible = items.filter((it) => {
    try {
      return typeof isPathEnabled === "function" ? isPathEnabled(it.to) : true;
    } catch {
      return true;
    }
  });
  if (visible.length <= 1) return null;

  return (
    <div className="relative z-30 -mt-7 px-6">
      <nav className="mx-auto flex w-fit max-w-full flex-wrap justify-center gap-1 rounded-token border border-gray-100 bg-white p-1.5 shadow-xl shadow-black/5">
        {visible.map((it) => {
          const Ic = icon(it.icon);
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-2 whitespace-nowrap rounded-token-btn px-4 py-2.5 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-accent text-white shadow-sm shadow-accent/25"
                    : "text-text-muted hover:bg-accent/10 hover:text-primary",
                )
              }
            >
              <Ic className="h-4 w-4" /> {it.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

/* Dark primary CTA band with corner glows. `children` renders the buttons. */
export function CTABand({ title, text, children }) {
  return (
    <section className="relative overflow-hidden bg-primary px-6 py-16 lg:py-20">
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
        <h2 className="font-heading text-2xl font-bold text-white md:text-3xl">{title}</h2>
        {text && <p className="max-w-2xl text-white/70">{text}</p>}
        {children && <div className="flex flex-wrap justify-center gap-3">{children}</div>}
      </div>
    </section>
  );
}
