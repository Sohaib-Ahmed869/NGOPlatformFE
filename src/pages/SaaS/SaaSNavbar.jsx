import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowRight, HeartHandshake } from "lucide-react";

const V = {
  bg: "#F3F8F5", ink: "#102A23", inkSoft: "#46685C", inkFaint: "#8AA89C",
  primary: "#047857", primary2: "#065F46", accent: "#F59E0B",
  surface: "#FFFFFF", line: "rgba(6,40,30,.08)", success: "#059669",
};

export default function SaaSNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location]);

  // Scroll to hash section when navigating from another page
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [location]);

  const navLinks = [
    { label: "Features", path: "/#features", hash: "features" },
    { label: "How it works", path: "/#how", hash: "how" },
    { label: "Pricing", path: "/plans" },
    { label: "Contact", path: "/contact" },
  ];

  const handleNavClick = (e, link) => {
    if (link.hash) {
      // If already on homepage, scroll to section
      if (location.pathname === "/") {
        e.preventDefault();
        const el = document.getElementById(link.hash);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }
      // If on another page, React Router will navigate to /, then we scroll
    }
  };

  return (
    <>
      <nav
        className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none"
        style={{ fontFamily: "'Times New Roman', Tinos, Times, serif" }}
      >
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="pointer-events-auto flex items-center gap-1 pl-4 pr-1.5 py-1.5 rounded-[10px]"
          style={{
            background: scrolled
              ? "rgba(255,255,255,.88)"
              : "rgba(255,255,255,.75)",
            backdropFilter: "blur(20px) saturate(140%)",
            border: `1px solid ${V.line}`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,.95), 0 1px 2px rgba(15,23,42,.04), 0 10px 30px -10px rgba(15,23,42,.12)`,
          }}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 pr-4 mr-1 border-r" style={{ borderColor: V.line }}>
            <div
              className="w-8 h-8 rounded-xl grid place-items-center text-white"
              style={{
                background: `linear-gradient(135deg, ${V.primary}, ${V.primary2})`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,.35), 0 6px 16px -6px rgba(4,120,87,.6)`,
              }}
            >
              <HeartHandshake className="w-[18px] h-[18px]" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight" style={{ color: V.ink }}>
              NGO Platform
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={(e) => handleNavClick(e, link)}
                className="px-3 py-2 text-[13px] rounded-md transition-colors hover:bg-black/5"
                style={{
                  color: location.pathname === link.path ? V.primary : V.inkSoft,
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <Link
            to="/plans"
            className="hidden md:inline-flex items-center gap-2 ml-1.5 px-4 py-2 rounded-[7px] text-[13px] font-semibold text-white transition-transform hover:scale-[1.02]"
            style={{
              background: `linear-gradient(180deg, ${V.primary} 0%, ${V.primary2} 100%)`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,.30), inset 0 -1px 0 rgba(0,0,0,.25), 0 1px 2px rgba(0,0,0,.30), 0 12px 32px -8px rgba(4,120,87,.6)`,
            }}
          >
            Get started <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg"
            style={{ color: V.ink }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </motion.div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed top-16 left-4 right-4 z-50 overflow-hidden rounded-xl border"
            style={{
              fontFamily: "'Times New Roman', Tinos, Times, serif",
              background: "rgba(255,255,255,.95)",
              backdropFilter: "blur(20px)",
              borderColor: V.line,
            }}
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={(e) => handleNavClick(e, link)}
                  className="block px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-black/5"
                  style={{ color: V.inkSoft }}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/plans"
                className="block w-full text-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white mt-2"
                style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})` }}
              >
                Get started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
