import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Celebration — a tasteful petal + confetti shower that falls from the top of
 * the screen, used to mark a happy moment (a completed donation / registration).
 *
 * Dependency-free (built on framer-motion, already in the app). Full-screen,
 * pointer-events-none overlay that auto-stops after `duration` ms and respects
 * prefers-reduced-motion. Mount it conditionally, e.g. `{done && <Celebration />}`.
 */

// Warm, celebratory palette — cherry-blossom pinks + tenant-gold + soft greens.
const COLORS = ["#E8A0BF", "#F4C2C2", "#F8C8DC", "#C9A84C", "#F6D88B", "#9CAF88", "#FCE7D8", "#ffffff"];

// One falling piece — a petal (teardrop), confetti strip, or small disc.
function Piece({ index }) {
  const cfg = useMemo(() => {
    const r = Math.random;
    const kind = r();
    const shape = kind > 0.55 ? "petal" : kind > 0.25 ? "confetti" : "disc";
    const base = 8 + r() * 9;
    return {
      left: r() * 100, // vw start
      drift: (r() - 0.5) * 220, // px horizontal sway
      rotate: (r() - 0.5) * 900,
      duration: 3.4 + r() * 3.4,
      delay: r() * 1.8,
      color: COLORS[Math.floor(r() * COLORS.length)],
      shape,
      w: shape === "confetti" ? base * 0.45 : base,
      h: shape === "petal" ? base * 1.5 : shape === "confetti" ? base * 0.32 : base,
    };
    // index keeps each piece's randomisation stable across re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const radius = cfg.shape === "petal" ? "100% 0 100% 0" : cfg.shape === "disc" ? "9999px" : "1px";

  return (
    <motion.span
      initial={{ y: "-12vh", x: 0, rotate: 0, opacity: 0 }}
      animate={{ y: "116vh", x: [0, cfg.drift * 0.6, cfg.drift], rotate: cfg.rotate, opacity: [0, 1, 1, 0] }}
      transition={{ duration: cfg.duration, delay: cfg.delay, ease: "easeIn" }}
      style={{
        position: "absolute",
        top: 0,
        left: `${cfg.left}vw`,
        width: cfg.w,
        height: cfg.h,
        background: cfg.color,
        borderRadius: radius,
        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        willChange: "transform, opacity",
      }}
    />
  );
}

export default function Celebration({ count = 110, duration = 7000 }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setActive(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

  if (reduce || !active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <Piece key={i} index={i} />
      ))}
    </div>
  );
}
