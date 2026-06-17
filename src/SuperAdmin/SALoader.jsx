import { motion } from "framer-motion";
import React from "react";
import TabLoader from "../components/TabLoader";
// Platform palette (emerald) — matches the shell's --tenant-accent.
const V = { primary: "#10b981", accent: "#059669" };

// ── Orbital ──────────────────────────────────────────────
export function OrbitalLoader({ label = "Loading" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div style={{ position: "relative", width: 64, height: 64 }}>
        {/* Static background ring */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "2px solid rgba(4,120,87,0.12)"
        }} />
        {/* Outer spinning ring */}
        <motion.div
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: "2.5px solid transparent",
            borderTopColor: V.primary,
            borderRightColor: "rgba(4,120,87,0.3)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        {/* Inner counter-spinning ring */}
        <motion.div
          style={{
            position: "absolute", inset: 10, borderRadius: "50%",
            border: "2px solid transparent",
            borderTopColor: V.accent,
            borderLeftColor: "rgba(245,158,11,0.3)",
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <LoaderLabel>{label}</LoaderLabel>
    </div>
  );
}

// ── Dots ─────────────────────────────────────────────────
export function DotsLoader({ label = "Processing" }) {
  const colors = [V.primary, V.primary, V.primary, V.accent, V.accent];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {colors.map((color, i) => (
          <motion.div
            key={i}
            style={{ width: 10, height: 10, borderRadius: "50%", background: color }}
            animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
          />
        ))}
      </div>
      <LoaderLabel>{label}</LoaderLabel>
    </div>
  );
}

// ── Bars ─────────────────────────────────────────────────
export function BarsLoader({ label = "Analyzing" }) {
  const bars = [
    { height: 28, color: "#047857", delay: 0 },
    { height: 40, color: "#9333EA", delay: 0.1 },
    { height: 20, color: "#A855F7", delay: 0.2 },
    { height: 36, color: "#C026D3", delay: 0.3 },
    { height: 24, color: "#F59E0B", delay: 0.4 },
    { height: 32, color: "#EC4899", delay: 0.5 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 40 }}>
        {bars.map((bar, i) => (
          <motion.div
            key={i}
            style={{
              width: 6, height: bar.height, borderRadius: "3px 3px 0 0",
              background: bar.color, transformOrigin: "bottom",
            }}
            animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: bar.delay }}
          />
        ))}
      </div>
      <LoaderLabel>{label}</LoaderLabel>
    </div>
  );
}

// ── Typing ────────────────────────────────────────────────
const WORDS = ["Thinking", "Processing", "Reasoning", "Generating", "Responding"];

export function TypingLoader() {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % WORDS.length), 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div style={{
        display: "flex", gap: 6, alignItems: "center",
        background: "#f3f4f6", border: "0.5px solid #e5e7eb",
        borderRadius: "18px 18px 18px 4px", padding: "14px 18px",
      }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <motion.div
            key={i}
            style={{ width: 8, height: 8, borderRadius: "50%", background: "#9ca3af" }}
            animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay }}
          />
        ))}
      </div>
      <LoaderLabel>{WORDS[index]}</LoaderLabel>
    </div>
  );
}

// ── Shared label ──────────────────────────────────────────
function LoaderLabel({ children }) {
  return (
    <motion.p
      style={{
        fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
        color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace", margin: 0,
      }}
      animate={{ opacity: [0.35, 1, 0.35] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.p>
  );
}

// ── Default export ───────────────────────────────────────
// Change this to test: "orbital" | "dots" | "bars" | "typing"
const DEFAULT_LOADER = "dots";

const LOADERS = {
  orbital: OrbitalLoader,
  dots: DotsLoader,
  bars: BarsLoader,
  typing: TypingLoader,
};

export default function SALoader({ label = "Loading" }) {
  // Unified loading across the whole console: the shared TabLoader (animated dots
  // → name sweep) — the same loader used in the tenant admin and the contact inbox.
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <TabLoader label={label} />
    </div>
  );
}