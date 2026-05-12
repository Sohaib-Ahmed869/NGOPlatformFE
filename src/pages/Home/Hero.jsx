import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative flex flex-col overflow-hidden will-change-auto" style={{ minHeight: "100dvh" }}>
      {/* === BACKGROUND (all GPU-composited, no repaints) === */}

      {/* Warm beige base */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(165deg, #C4B5A0 0%, #D1C4B0 35%, #C4B5A0 65%, #B8A993 100%)",
          transform: "translateZ(0)",
        }}
      />

      {/* Warm subtle aurora bands — static, no animation */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse 80% 50% at 20% 20%, rgba(255,255,255,0.15) 0%, transparent 60%)",
            "radial-gradient(ellipse 60% 40% at 80% 70%, rgba(201,168,76,0.06) 0%, transparent 55%)",
            "radial-gradient(ellipse 50% 60% at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 50%)",
          ].join(", "),
          transform: "translateZ(0)",
        }}
      />

      {/* Animated orbs — GPU-only transforms, no blur repaints */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          top: "10%",
          left: "-10%",
          width: 700,
          height: 700,
          background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 65%)",
          willChange: "transform",
        }}
        animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          bottom: "5%",
          right: "-5%",
          width: 500,
          height: 500,
          background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 60%)",
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

      {/* Diagonal accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, transparent 40%, rgba(201,168,76,0.06) 49%, rgba(201,168,76,0.1) 50%, rgba(201,168,76,0.06) 51%, transparent 60%)",
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
              className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full text-[#5C4A32] text-sm font-body tracking-widest uppercase"
              style={{
                border: "1px solid rgba(92,74,50,0.15)",
                background: "linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.25) 100%)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#A0884C] animate-pulse" />
              Empowering communities worldwide
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.08] mb-8 tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <span className="text-[#2C2418]">Changing Lives, </span>
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, #8B6914, #A0884C, #8B6914)" }}
            >
              One Act
            </span>
            <br />
            <span className="text-[#2C2418]">of Kindness</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            className="font-body text-lg md:text-xl text-[#5C4A32]/70 max-w-2xl mx-auto mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
          >
            Join thousands of donors making a real difference in communities
            around the world. Transparent. Accountable. Impactful.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
          >
            <Link
              to="/donate"
              className="group relative inline-flex items-center gap-2 text-[#2C2418] font-semibold rounded-full px-10 py-4 text-lg overflow-hidden transition-all hover:scale-[1.02]"
              style={{
                background: "linear-gradient(180deg, #D4B85A 0%, #C9A84C 100%)",
                boxShadow: "0 4px 24px rgba(201,168,76,0.3), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              <span className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none" />
              <span className="relative">Donate Now</span>
              <svg className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
            <Link
              to="/about"
              className="relative inline-flex items-center gap-2 text-[#2C2418] rounded-full px-10 py-4 text-lg overflow-hidden transition-all hover:bg-white/40"
              style={{
                border: "1px solid rgba(44,36,24,0.2)",
                background: "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.15) 100%)",
              }}
            >
              <span className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              <span className="relative">Learn More</span>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
          >
            {[
              { value: "$2.4M+", label: "Raised" },
              { value: "48K+", label: "Lives Impacted" },
              { value: "120+", label: "Projects" },
              { value: "30+", label: "Countries" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="relative text-center p-5 rounded-2xl overflow-hidden"
                style={{
                  border: "1px solid rgba(255,255,255,0.5)",
                  background: "linear-gradient(145deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.3) 100%)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                <div className="relative">
                  <div className="font-heading text-3xl md:text-4xl font-bold text-[#8B6914] mb-1">{stat.value}</div>
                  <div className="font-body text-[11px] md:text-xs text-[#5C4A32]/50 tracking-[0.15em] uppercase">{stat.label}</div>
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
