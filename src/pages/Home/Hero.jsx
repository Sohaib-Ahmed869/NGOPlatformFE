import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTenant } from "../../context/TenantContext";
import usePageContent from "../../hooks/usePageContent";

/**
 * Mix a hex color toward white by a ratio (0 = original, 1 = white).
 */
function lighten(hex, ratio) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * ratio));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * ratio));
  const b = Math.min(255, Math.round((n & 0xff) + (255 - (n & 0xff)) * ratio));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function darken(hex, ratio) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - ratio)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - ratio)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - ratio)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const Hero = () => {
  const { branding, organisation } = useTenant();
  const { content } = usePageContent("home");
  const hero = content?.hero || {};

  // Derive hero gradient colors from theme
  const primary = branding?.primaryColor || "#2C2418";
  const accent = branding?.accentColor || "#C9A84C";
  const bg = branding?.backgroundColor || "#FAF7F2";

  // Create a warm gradient base from the background color (lightened/shifted)
  const gradBase = lighten(bg, -0.08);      // slightly darker than bg
  const gradMid = lighten(bg, -0.03);       // between bg and base
  const gradDark = lighten(bg, -0.15);      // darker edge
  const accentDark = darken(accent, 0.35);  // dark accent for gradient text

  const orgName = organisation?.name || "";

  // Content with fallbacks to the original copy (zero visual change until edited)
  const badge = hero.badge ?? "Empowering communities worldwide";
  const subtitle =
    hero.subtitle ??
    "Join thousands of donors making a real difference in communities around the world. Transparent. Accountable. Impactful.";
  const primaryCtaText = hero.primaryCtaText ?? "Donate Now";
  const primaryCtaLink = hero.primaryCtaLink ?? "/donate";
  const secondaryCtaText = hero.secondaryCtaText ?? "Learn More";
  const secondaryCtaLink = hero.secondaryCtaLink ?? "/about";
  const stats =
    Array.isArray(hero.stats) && hero.stats.length
      ? hero.stats
      : [
          { value: "$2.4M+", label: "Raised" },
          { value: "48K+", label: "Lives Impacted" },
          { value: "120+", label: "Projects" },
          { value: "30+", label: "Countries" },
        ];

  // Render the title with an optional highlighted phrase in the accent gradient.
  const renderTitle = () => {
    const title = hero.title ?? "Changing Lives, One Act of Kindness";
    const highlight = hero.highlight ?? "One Act";
    if (highlight && title.includes(highlight)) {
      const idx = title.indexOf(highlight);
      const before = title.slice(0, idx);
      const after = title.slice(idx + highlight.length);
      return (
        <>
          {before && <span style={{ color: primary }}>{before}</span>}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(90deg, ${accentDark}, ${accent}, ${accentDark})` }}
          >
            {highlight}
          </span>
          {after && <span style={{ color: primary }}>{after}</span>}
        </>
      );
    }
    return <span style={{ color: primary }}>{title}</span>;
  };

  return (
    <section className="relative flex flex-col overflow-hidden will-change-auto" style={{ minHeight: "100dvh" }}>
      {/* === BACKGROUND — derived from tenant theme === */}

      {/* Base gradient from bg color */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(165deg, ${gradBase} 0%, ${gradMid} 35%, ${gradBase} 65%, ${gradDark} 100%)`,
          transform: "translateZ(0)",
        }}
      />

      {/* Aurora bands with accent tint */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse 80% 50% at 20% 20%, rgba(255,255,255,0.15) 0%, transparent 60%)",
            `radial-gradient(ellipse 60% 40% at 80% 70%, ${accent}10 0%, transparent 55%)`,
            "radial-gradient(ellipse 50% 60% at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 50%)",
          ].join(", "),
          transform: "translateZ(0)",
        }}
      />

      {/* Animated orbs */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          top: "10%", left: "-10%", width: 700, height: 700,
          background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 65%)",
          willChange: "transform",
        }}
        animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          bottom: "5%", right: "-5%", width: 500, height: 500,
          background: `radial-gradient(circle, ${accent}0F 0%, transparent 60%)`,
          willChange: "transform",
        }}
        animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Top gloss */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: "45%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
          transform: "translateZ(0)",
        }}
      />

      {/* Diagonal accent stripe */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, transparent 40%, ${accent}0F 49%, ${accent}1A 50%, ${accent}0F 51%, transparent 60%)`,
          transform: "translateZ(0)",
        }}
      />

      {/* === CONTENT === */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 pt-24 pb-40">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-10"
          >
            <span
              className="inline-flex items-center gap-2.5 px-6 py-2.5 text-sm font-body tracking-widest uppercase"
              style={{
                color: primary,
                border: `1px solid ${primary}20`,
                background: "linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.25) 100%)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
              {badge}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.08] mb-8 tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            {renderTitle()}
          </motion.h1>

          {/* Sub */}
          <motion.p
            className="font-body text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
            style={{ color: `${primary}B0` }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
          >
            {subtitle}
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
          >
            <Link
              to={primaryCtaLink}
              className="group relative inline-flex items-center gap-2 font-semibold px-10 py-4 text-lg overflow-hidden transition-all hover:scale-[1.02]"
              style={{
                color: primary,
                background: `linear-gradient(180deg, ${lighten(accent, 0.15)} 0%, ${accent} 100%)`,
                boxShadow: `0 4px 24px ${accent}4D, inset 0 1px 0 rgba(255,255,255,0.25)`,
              }}
            >
              <span className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none" />
              <span className="relative">{primaryCtaText}</span>
              <svg className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
            <Link
              to={secondaryCtaLink}
              className="relative inline-flex items-center gap-2 px-10 py-4 text-lg overflow-hidden transition-all hover:bg-white/40"
              style={{
                color: primary,
                border: `1px solid ${primary}33`,
                background: "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.15) 100%)",
              }}
            >
              <span className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              <span className="relative">{secondaryCtaText}</span>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
          >
            {stats.map((stat, i) => (
              <div
                key={stat.label || i}
                className="relative text-center p-5 overflow-hidden"
                style={{
                  border: "1px solid rgba(255,255,255,0.5)",
                  background: "linear-gradient(145deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.3) 100%)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                <div className="relative">
                  <div className="font-heading text-3xl md:text-4xl font-bold mb-1" style={{ color: accentDark }}>{stat.value}</div>
                  <div className="font-body text-[11px] md:text-xs tracking-[0.15em] uppercase" style={{ color: `${primary}80` }}>{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
