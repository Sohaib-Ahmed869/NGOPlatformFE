import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, ShoppingCart, ChevronDown, Menu, X, HeartHandshake, ArrowRight } from "lucide-react";
import { useCart } from "./cart";
import { useAuth } from "../../context/AuthContext";
import { useTenant } from "../../context/TenantContext";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

/* ── Mobile overlay motion ── */
const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
const mobileNavVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } }, exit: {} };
const mobileLinkVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.15 } },
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const { setIsOpen: setCartOpen, items } = useCart();
  const { user, logout } = useAuth();
  const { organisation, branding, pages } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const timeoutRef = useRef(null);
  const prevPathRef = useRef(location.pathname);

  // Collapse into the floating capsule only once scrolled past the hero — the
  // page's first <section>. Pages without a hero fall back to a small offset.
  // Re-measured on scroll, route change and resize.
  useEffect(() => {
    const NAV_H = 64; // expanded bar height (h-16)
    const measure = () => {
      const hero = document.querySelector("section");
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

  // Close the mobile menu on route change.
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      setIsOpen(false);
    }
  }, [location.pathname]);

  // Lock body scroll while the mobile overlay is open.
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const toggleDropdown = (dropdown) => setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  const handleMouseEnter = (key) => { clearTimeout(timeoutRef.current); setOpenDropdown(key); };
  const handleMouseLeave = () => { timeoutRef.current = setTimeout(() => setOpenDropdown(null), 300); };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/");
    setOpenDropdown(null);
    setIsOpen(false);
  };

  // Build the navigation from the tenant's enabled pages (auto-generated).
  const enabledNav = (Array.isArray(pages) ? pages : []).filter((p) => p.enabled && p.showInNav);
  const childrenOf = (key) =>
    enabledNav
      .filter((p) => p.navParentKey === key)
      .sort((a, b) => a.navOrder - b.navOrder)
      .map((p) => ({ key: p.key, label: p.navLabel, path: p.path }));
  const navTree = enabledNav
    .filter((p) => !p.navParentKey)
    .sort((a, b) => a.navOrder - b.navOrder)
    .map((p) => ({ key: p.key, label: p.navLabel, path: p.path, children: childrenOf(p.key) }));

  const isHomePage = location.pathname === "/";
  // Both /programs (listing) and /programs/:id (detail) use a dark, image-led
  // hero → white nav text at the top, so they're NOT light-hero pages. /donate too.
  const isLightHeroPage = isHomePage || location.pathname === "/checkout";

  // Is the tenant's hero background light enough for dark text?
  const heroBgIsLight = (() => {
    const bg = branding?.backgroundColor || "#FAF7F2";
    const hex = bg.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 150;
  })();

  // Three visual modes:
  //  - scrolled        → solid floating capsule, dark text
  //  - at top (open or dark hero) → transparent bar, white text
  //  - at top, light hero         → transparent bar, dark text
  const atTopDark = !scrolled && (isOpen || (isLightHeroPage ? !heroBgIsLight : true));
  const onDarkText = atTopDark;

  const primaryColor = branding?.primaryColor || "#2C2418";
  const accentColor = branding?.accentColor || "#C9A84C";
  const ctaGradient = `linear-gradient(135deg, ${primaryColor}, ${accentColor})`;

  // Logo variant: white-text bar sits over a dark surface → use the light logo.
  const navLogo = onDarkText
    ? branding?.logo || branding?.logoDark
    : branding?.logoDark || branding?.logo;

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname === path || location.pathname.startsWith(path + "/");

  const navLinkClass = (path) => {
    const active = isActive(path);
    const base = "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-nav font-medium tracking-wide transition-all duration-200";
    if (onDarkText) {
      return cn(base, active ? "text-white bg-white/15" : "text-white/75 hover:text-white hover:bg-white/10");
    }
    return cn(base, active ? "text-accent bg-accent/10" : "text-primary/60 hover:text-primary hover:bg-primary/5");
  };

  const iconColor = onDarkText ? "text-white/80 hover:text-white" : "text-primary/70 hover:text-accent";

  const UserDropdown = () => {
    const open = openDropdown === "user";
    return (
      <div className="relative">
        <button onClick={(e) => { e.preventDefault(); toggleDropdown("user"); }} className={cn("flex items-center transition-colors", iconColor)} aria-label="User menu">
          <User size={20} />
          <ChevronDown className={cn("ml-0.5 h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
        <div className={cn("absolute right-0 mt-2 w-48 border border-black/5 bg-white/95 py-2 shadow-xl backdrop-blur-xl", open ? "block" : "hidden")} onMouseLeave={() => setOpenDropdown(null)}>
          {user ? (
            <>
              <Link to="/user/dashboard" className="block px-4 py-2 font-nav text-sm text-gray-700 transition-colors hover:bg-background hover:text-primary" onClick={() => setOpenDropdown(null)}>Dashboard</Link>
              <button onClick={handleLogout} className="block w-full px-4 py-2 text-left font-nav text-sm text-gray-700 transition-colors hover:bg-background hover:text-primary">Logout</button>
            </>
          ) : (
            <Link to="/login" className="block px-4 py-2 font-nav text-sm text-gray-700 transition-colors hover:bg-background hover:text-primary" onClick={() => setOpenDropdown(null)}>Login</Link>
          )}
        </div>
      </div>
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
              "flex items-center justify-between gap-3 px-4 transition-all duration-500 ease-out sm:px-6",
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
                  alt={organisation?.name || ""}
                  className={cn("w-auto object-contain object-left transition-all duration-500", scrolled ? "h-8 max-w-[140px]" : "h-9 max-w-[160px]")}
                />
              ) : (
                <>
                  {organisation ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded text-white" style={{ backgroundColor: accentColor }}>
                      <HeartHandshake className="h-[18px] w-[18px]" />
                    </div>
                  ) : null}
                  <span className={cn("whitespace-nowrap font-nav text-lg font-extrabold leading-tight tracking-tight transition-colors", onDarkText ? "text-white" : "text-primary")}>
                    {organisation?.name || ""}
                  </span>
                </>
              )}
            </Link>

            {/* Desktop nav — auto-generated from enabled pages */}
            <div className="hidden shrink-0 items-center gap-0.5 lg:flex">
              {navTree.map((item) =>
                item.children.length ? (
                  <div key={item.key} className="relative" onMouseEnter={() => handleMouseEnter(item.key)} onMouseLeave={handleMouseLeave}>
                    <Link to={item.path} className={navLinkClass(item.path)}>
                      {item.label}
                      <ChevronDown className={cn("h-3.5 w-3.5 opacity-70 transition-transform", openDropdown === item.key && "rotate-180")} />
                    </Link>
                    <div
                      className={cn("absolute left-1/2 z-50 mt-2 w-52 -translate-x-1/2 border border-black/5 bg-white/95 py-2 shadow-xl backdrop-blur-xl", openDropdown === item.key ? "block" : "hidden")}
                      onMouseEnter={() => clearTimeout(timeoutRef.current)}
                      onMouseLeave={handleMouseLeave}
                    >
                      {item.children.map((c) => (
                        <Link key={c.key} to={c.path} className="block px-4 py-2 font-nav text-sm text-gray-700 transition-colors hover:bg-background hover:text-primary">{c.label}</Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link key={item.key} to={item.path} className={navLinkClass(item.path)}>{item.label}</Link>
                ),
              )}
            </div>

            {/* Right cluster */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className={cn("hidden h-5 w-px lg:block", onDarkText ? "bg-white/20" : "bg-black/10")} />

              <UserDropdown />

              <button className={cn("relative transition-colors", iconColor)} onClick={() => setCartOpen(true)} aria-label="Shopping cart">
                <ShoppingCart size={20} />
                {items.length > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-white">{items.length}</span>
                )}
              </button>

              {/* Mobile toggle */}
              <button
                onClick={() => setIsOpen((v) => !v)}
                aria-label={isOpen ? "Close menu" : "Open menu"}
                aria-expanded={isOpen}
                className={cn("inline-flex items-center justify-center rounded-full p-2 transition-colors lg:hidden", onDarkText ? "text-white hover:bg-white/10" : "text-primary hover:bg-primary/5")}
              >
                {isOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </nav>
        </div>
      </motion.header>

      {/* ── Mobile full-screen overlay ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="mobile-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ backgroundColor: primaryColor }}
          >
            <motion.nav variants={mobileNavVariants} initial="hidden" animate="visible" exit="exit" className="flex h-full flex-col overflow-y-auto px-6 pb-8 pt-24">
              {navTree.map((item) => (
                <motion.div key={item.key} variants={mobileLinkVariants} className="border-b border-white/10">
                  <Link to={item.path} className={cn("block py-4 text-xl font-medium transition-colors", isActive(item.path) ? "text-white" : "text-white/80 hover:text-white")}>
                    {item.label}
                  </Link>
                  {item.children.length > 0 && (
                    <div className="-mt-1 pb-3 pl-3">
                      {item.children.map((c) => (
                        <Link key={c.key} to={c.path} className={cn("block py-2 text-base transition-colors", isActive(c.path) ? "text-white" : "text-white/55 hover:text-white")}>
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}

              <motion.div variants={mobileLinkVariants} className="mt-8 space-y-3">
                <Link to="/donate" className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-semibold text-white shadow-sm" style={{ background: ctaGradient }}>
                  Donate
                  <ArrowRight size={16} />
                </Link>
                <button
                  onClick={() => { setCartOpen(true); setIsOpen(false); }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-white/10"
                >
                  <ShoppingCart size={16} />
                  View cart{items.length > 0 ? ` (${items.length})` : ""}
                </button>
                {user ? (
                  <>
                    <Link to="/user/dashboard" className="block py-2 text-center text-base font-medium text-white/80 transition-colors hover:text-white">Dashboard</Link>
                    <button onClick={handleLogout} className="block w-full py-2 text-center text-base font-medium text-white/80 transition-colors hover:text-white">Logout</button>
                  </>
                ) : (
                  <Link to="/login" className="block py-2 text-center text-base font-medium text-white/80 transition-colors hover:text-white">Login</Link>
                )}
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
