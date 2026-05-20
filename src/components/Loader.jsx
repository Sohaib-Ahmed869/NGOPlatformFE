/**
 * Themed animated loader — uses tenant CSS variables.
 * Drop-in replacement for PageLoader across admin and donor dashboards.
 *
 * Usage:
 *   if (loading) return <Loader />;
 *   if (loading) return <Loader label="Loading donors..." />;
 */
import { motion } from "framer-motion";

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

function DotsAnimation() {
  const accent = "var(--tenant-accent, #C9A84C)";
  const primary = "var(--tenant-primary, #2C2418)";
  const colors = [primary, primary, primary, accent, accent];
  return (
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
  );
}

export default function Loader({ label = "Loading" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <DotsAnimation />
        <LoaderLabel>{label}</LoaderLabel>
      </div>
    </div>
  );
}
