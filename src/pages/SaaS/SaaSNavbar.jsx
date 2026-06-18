import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, HeartHandshake } from "lucide-react";
import { cn } from "../../utils/cn";
import { useTenant } from "../../context/TenantContext";

const NAV_LINKS = [
  { label: "Features", path: "/#features", hash: "features" },
  { label: "How it works", path: "/#how", hash: "how" },
  { label: "Pricing", path: "/plans" },
  { label: "Contact", path: "/contact" },
];

/* The platform marketing navbar mirrors the tenant public navbar: a transparent
   full-width bar over the hero that collapses into a floating, blurred capsule
   once scrolled past the hero. The hero is the first [data-hero] / <section>;
   pages without one fall back to a small scroll offset. Re-measured on
   scroll/route/resize. Colours come from the platform design tokens. */
export default function SaaSNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { platform } = useTenant();
  const brandName = platform?.name || "NGO Platform";

  // The home hero is a deep, immersive surface; every other page opens on a
  // light surface. So while we're on home AND still over the hero (not yet
  // collapsed into the capsule), the bar wears white text + the light logo;
  // everywhere else — and once collapsed — it reverts to dark on light.
  const isHome = location.pathname === "/";
  const onDark = isHome && !scrolled;
  const navLogo = onDark
    ? platform?.logo || platform?.logoDark || ""
    : platform?.logoDark || platform?.logo || "";

  useEffect(() => {
    const NAV_H = 64; // expanded bar height (h-16)
    const measure = () => {
      // Home: collapse only after the immersive full-screen hero (the bar stays
      // white-on-dark while over it). Every other page (plans, contact, …):
      // collapse into the capsule the moment the visitor starts scrolling.
      if (!isHome) {
        setScrolled(window.scrollY > 8);
        return;
      }
      const hero = document.querySelector("[data-hero], section");
      if (hero && hero.isConnected) {
        setScrolled(hero.getBoundingClientRect().bottom <= NAV_H);
      } else {
        setScrolled(window.scrollY > 24);
      }
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [location.pathname]);

  // Close the mobile menu on route change; lock body scroll while it's open.
  useEffect(() => setOpen(false), [location]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Smooth-scroll to a hash section when already on the homepage; otherwise let
  // the router navigate to "/" first (SaaSHome scrolls on mount via the hash).
  const handleNavClick = (e, link) => {
    if (link.hash && location.pathname === "/") {
      e.preventDefault();
      document.getElementById(link.hash)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const isActive = (path) =>
    (path === "/plans" || path === "/contact") && location.pathname === path;

  const linkClass = (path) => {
    const base =
      "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[14px] font-nav font-medium tracking-wide transition-all duration-200";
    if (onDark) {
      return cn(
        base,
        isActive(path)
          ? "text-white bg-white/15"
          : "text-white/75 hover:text-white hover:bg-white/10",
      );
    }
    return cn(
      base,
      isActive(path)
        ? "text-accent bg-accent/10"
        : "text-primary/60 hover:text-primary hover:bg-primary/5",
    );
  };

  return (
    <>
      <motion.header
        className="pointer-events-none fixed inset-x-0 top-0 z-50"
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div
          className={cn(
            "pointer-events-auto mx-auto transition-all duration-500 ease-out",
            scrolled ? "mt-3 max-w-6xl px-2" : "mt-0 max-w-7xl px-0",
          )}
        >
          <nav
            className={cn(
              "relative flex items-center justify-between gap-3 px-4 transition-all duration-500 ease-out sm:px-6",
              scrolled
                ? "h-14 rounded-full border border-black/[0.06] bg-background/90 shadow-lg shadow-black/[0.05] backdrop-blur-xl"
                : "h-16 rounded-none border border-transparent bg-transparent",
            )}
          >
            {/* Brand */}
            <Link to="/" className="flex shrink-0 items-center gap-2.5">
              {navLogo ? (
                <img
                  src={navLogo}
                  alt={brandName}
                  className={cn("w-auto object-contain transition-all duration-500", scrolled ? "h-8 max-w-[150px]" : "h-9 max-w-[170px]")}
                />
              ) : (
                <>
                  <span
                    className={cn(
                      "grid place-items-center rounded-token-btn text-white transition-all duration-500",
                      scrolled ? "h-8 w-8" : "h-9 w-9",
                    )}
                    style={{ background: "linear-gradient(135deg, var(--tenant-accent), var(--pf-accent-2, #065F46))" }}
                  >
                    <HeartHandshake className={cn("transition-all", scrolled ? "h-[17px] w-[17px]" : "h-[19px] w-[19px]")} />
                  </span>
                  <span className={cn("whitespace-nowrap font-nav text-[17px] font-extrabold leading-none tracking-tight transition-colors", onDark ? "text-white" : "text-primary")}>
                    {brandName}
                  </span>
                </>
              )}
            </Link>

            {/* Desktop links — centred */}
            <div className="hidden items-center gap-0.5 lg:absolute lg:left-1/2 lg:flex lg:-translate-x-1/2">
              {NAV_LINKS.map((l) => (
                <Link key={l.path} to={l.path} onClick={(e) => handleNavClick(e, l)} className={linkClass(l.path)}>
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Right cluster */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link
                to="/register"
                className="hidden items-center gap-2 rounded-token-btn bg-accent px-4 py-2 font-nav text-[14px] font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-light sm:inline-flex"
              >
                Get started <ArrowRight className="h-4 w-4" />
              </Link>

              {/* Mobile toggle */}
              <button
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                className={cn(
                  "inline-flex items-center justify-center rounded-full p-2 transition-colors lg:hidden",
                  onDark ? "text-white hover:bg-white/10" : "text-primary hover:bg-primary/5",
                )}
              >
                {open ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </nav>
        </div>
      </motion.header>

      {/* Mobile full-screen overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="saas-mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: "linear-gradient(160deg, var(--tenant-primary), var(--tenant-accent))" }}
          >
            <nav className="flex h-full flex-col overflow-y-auto px-6 pb-8 pt-24">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.path}
                  to={l.path}
                  onClick={(e) => handleNavClick(e, l)}
                  className="border-b border-white/10 py-4 font-nav text-xl font-medium text-white/85 transition-colors hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-8 space-y-3">
                <Link
                  to="/register"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-4 font-nav text-base font-semibold text-primary"
                >
                  Get started <ArrowRight size={16} />
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
