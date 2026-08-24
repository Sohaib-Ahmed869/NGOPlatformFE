import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

/**
 * Count-up for a KPI figure.
 *
 * Two details that are easy to get wrong and are the reason this is shared:
 *
 * 1. The displayed value is tracked in `shownRef` and updated inside onUpdate —
 *    NOT recorded before the animation starts. Recording it up front makes
 *    StrictMode's second invoke see "already at target" and skip, leaving the
 *    tile frozen at 0.
 *
 * 2. `animate()` is imperative, so it does not inherit <MotionConfig
 *    reducedMotion="user">. The media query is checked here instead, otherwise
 *    these keep animating for people who asked the OS for no motion.
 *
 * Replaces thirteen near-identical copies that had drifted across the console.
 * All of them carried the StrictMode fix; none honoured reduced motion.
 *
 * @param {number} value    target figure
 * @param {Function} format renders the interpolated number (money, compact, …)
 * @param {string} prefix   leading text, e.g. "$"
 * @param {string} suffix   trailing text, e.g. "%"
 */
export default function AnimatedNumber({ value = 0, format, prefix = "", suffix = "", duration = 0.9 }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce || shownRef.current === target) {
      shownRef.current = target;
      setDisplay(target);
      return undefined;
    }
    const controls = animate(shownRef.current, target, {
      duration,
      ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (v) => {
        shownRef.current = v;
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [target, duration]);

  if (format) return <>{format(display)}</>;
  return (
    <>
      {prefix}
      {Math.round(display).toLocaleString()}
      {suffix}
    </>
  );
}
