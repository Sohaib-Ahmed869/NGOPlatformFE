import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { cn } from "../../utils/cn";
import { useTenant } from "../../context/TenantContext";
// The Donexus wordmark. Two cuts of the same lockup: dark ink for the light
// bar, white for the dark mobile overlay. Used as real <img>s (not the CSS
// mask <DonexusMark/> uses) because the wordmark's type must stay legible and
// must NOT recolour with the tenant accent — this is OUR brand, not theirs.
import donexusWordmark from "../../assets/Donexus Logo/Donexus-260.png";
import donexusWordmarkLight from "../../assets/Donexus Logo/Donexus-265.png";

const NAV_LINKS = [
  { label: "Product", path: "/#product", hash: "product" },
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
  const brandName = platform?.name || "Donexus";

  // Every page — home included, since the hero was rebuilt on light — opens on
  // a light surface, so the bar is dark-on-light throughout. `isHome` survives
  // only to decide WHEN the bar collapses (see below), not how it's coloured.
  const isHome = location.pathname === "/";
  // A platform logo set in SuperAdmin still wins; the Donexus wordmark is the
  // default rather than the old icon-plus-text lockup, so an unconfigured
  // install ships the real brand instead of a placeholder.
  const navLogo = platform?.logoDark || platform?.logo || donexusWordmark;
  // The mobile overlay is a dark gradient and the bar renders ABOVE it (z-50 vs
  // z-40), so the dark-ink wordmark would sit invisible on dark green while the
  // menu is open. Swap in the white cut for as long as it is.
  const openLogo = platform?.logo || platform?.logoDark || donexusWordmarkLight;

  useEffect(() => {
    const NAV_H = 64; // expanded bar height (h-16)
    const measure = () => {
      // Home: collapse only after the full-screen hero, so the bar rides it
      // transparent and edge-to-edge. Every other page (plans, contact, …):
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

  const linkClass = (path) =>
    cn(
      "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[14px] font-nav font-medium tracking-wide transition-all duration-200",
      isActive(path)
        ? "text-accent bg-accent/10"
        : "text-primary/60 hover:text-primary hover:bg-primary/5",
    );

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
                ? "h-14 rounded-full border border-black/[0.06] shadow-lg shadow-black/[0.05] backdrop-blur-xl"
                : "h-16 rounded-none border border-transparent",
            )}
            /* The fill is set here, not with `bg-background/90`: Tailwind cannot
               apply a slash-opacity to a bare var() colour, so that utility was
               emitting nothing and the capsule was fully transparent. Over the
               light page you could not tell — but the bar is fixed, so it also
               rides over the dark CTA and footer, where a see-through capsule
               left the wordmark and every link unreadable. Opaque. */
            style={{ background: scrolled ? "var(--tenant-bg, #F3F8F5)" : "transparent" }}
          >
            {/* Brand */}
            <Link to="/" className="flex shrink-0 items-center" aria-label={brandName}>
              <img
                src={open ? openLogo : navLogo}
                alt={brandName}
                /* The lockup is ~3.3:1, so it is height-capped and left to find
                   its own width; max-w only guards a tenant logo with a wilder
                   ratio. Slightly smaller once collapsed, matching the bar. */
                className={cn(
                  "w-auto object-contain transition-all duration-500",
                  scrolled ? "h-8 max-w-[170px]" : "h-9 max-w-[190px]",
                )}
              />
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
                to="/get-started"
                className="hidden font-nav text-[14px] font-semibold text-primary/80 transition-colors hover:text-primary lg:inline-flex"
              >
                Talk to Sales
              </Link>
              <Link
                to="/register"
                className="hidden items-center gap-2 rounded-token-btn px-4 py-2 font-nav text-[14px] font-semibold text-white shadow-lg shadow-accent/30 transition-all duration-300 hover:brightness-110 sm:inline-flex"
                style={{ background: "linear-gradient(90deg, var(--tenant-primary, #102A23) 0%, var(--tenant-primary, #102A23) 22%, var(--tenant-accent, #047857) 100%)" }}
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
                  // Same reason as the logo swap: while the overlay is open the
                  // button is sitting on dark green, not on the light bar.
                  open ? "text-white hover:bg-white/10" : "text-primary hover:bg-primary/5",
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
                <Link
                  to="/get-started"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-4 font-nav text-base font-semibold text-white"
                >
                  Talk to Sales
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
