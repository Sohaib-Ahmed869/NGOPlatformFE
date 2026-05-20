import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, ShoppingCart, ChevronDown, Menu, X } from "lucide-react";
import { useCart } from "./cart";
import { useAuth } from "../../context/AuthContext";
import { useTenant } from "../../context/TenantContext";
import toast from "react-hot-toast";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const { setIsOpen: setCartOpen, items } = useCart();
  const { user, logout } = useAuth();
  const { organisation, branding } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const timeoutRef = useRef(null);

  const noOverlayPages = ["/checkout", "/order-confirmation"];
  const isOverlayPage = !noOverlayPages.includes(location.pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/");
    setOpenDropdown(null);
  };

  const navItems = {
    "About Us": {
      path: "/about",
      items: [
        { path: "/about-us", label: "Our Team" },
        { path: "/our-partners", label: "Our Partners" },
      ],
    },
    "Our Initiatives": {
      path: "/initiatives",
      items: [
        { path: "/initiative-1", label: "Education" },
        { path: "/initiative-3", label: "Food" },
        { path: "/initiative-2", label: "Water" },
        { path: "/initiative-4", label: "Emergencies" },
      ],
    },
    "Islamic Giving": {
      path: "/giving",
      items: [
        { path: "/Ramadan", label: "Ramadan Donations" },
        { path: "/zakat/calculator", label: "Zakat Calculator" },
      ],
    },
  };

  const isHomePage = location.pathname === "/";
  const isLightHeroPage = isHomePage || location.pathname === "/donate" || location.pathname === "/checkout";

  // Determine if the tenant's bg is light
  const heroBgIsLight = (() => {
    const bg = branding?.backgroundColor || "#FAF7F2";
    const hex = bg.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 150;
  })();

  // Nav behavior:
  // - Homepage: transparent + adaptive text at top, solid themed bg on scroll
  // - Other pages: transparent + white text at top (over photo banners), solid themed bg on scroll
  let textColor, bgClass;

  if (!scrolled && !isOpen) {
    // At top — transparent over hero
    bgClass = "bg-transparent";
    textColor = isLightHeroPage
      ? (heroBgIsLight ? "text-primary" : "text-white")
      : "text-white"; // white over dark photo banners
  } else {
    // Scrolled — solid themed background
    bgClass = "bg-background/95 backdrop-blur-md shadow-[0_1px_20px_rgba(0,0,0,0.06)]";
    textColor = "text-primary";
  }

  const hoverColor = "hover:text-accent";
  const activeColor = "text-accent";

  const isActive = (path) => path === "/" ? location.pathname === "/" : (location.pathname === path || location.pathname.startsWith(path + "/"));
  const navLinkClass = (path) => `px-2.5 py-1.5 rounded-lg transition-colors text-[13px] font-nav font-medium tracking-wide ${isActive(path) ? `${activeColor}` : `${textColor} ${hoverColor}`}`;

  const NavDropdown = ({ title, path, items: dropItems }) => {
    const isDropdownOpen = openDropdown === title;
    return (
      <div className="relative group">
        <div className="flex items-center">
          <Link
            to={path}
            className={`flex-1 px-2 py-1 rounded-md transition-colors ${isActive(path) ? "text-accent font-semibold" : "text-gray-700 hover:text-primary"}`}
            onClick={() => setIsOpen(false)}
          >
            {title}
          </Link>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleDropdown(title); }}
            className="p-1 hover:bg-white/10 rounded-md"
          >
            <ChevronDown className={`h-4 w-4 transform transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
        <div
          className={`lg:absolute lg:hidden lg:group-hover:block w-48 bg-white/90 backdrop-blur-xl lg:shadow-xl rounded-xl lg:mt-1 py-2 lg:left-1/2 lg:-translate-x-1/2 z-50 transition-all border border-white/30 ${isDropdownOpen ? "block" : "hidden"}`}
          onMouseLeave={() => setOpenDropdown(null)}
        >
          {dropItems.map((item) => (
            <Link key={item.path} to={item.path} className="block w-full text-left px-4 py-2 font-nav text-sm text-gray-700 hover:bg-background hover:text-primary transition-colors" onClick={() => { setIsOpen(false); setOpenDropdown(null); }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const UserDropdown = () => {
    const isActive = openDropdown === "user";
    return (
      <div className="relative">
        <button onClick={(e) => { e.preventDefault(); toggleDropdown("user"); }} className={`flex items-center ${hoverColor} transition-colors`} aria-label="User menu">
          <User size={22} />
          <ChevronDown className={`ml-1 h-4 w-4 transform transition-transform ${isActive ? "rotate-180" : ""}`} />
        </button>
        <div className={`absolute right-0 w-48 bg-white/90 backdrop-blur-xl shadow-xl rounded-xl mt-2 py-2 z-50 border border-white/30 ${isActive ? "block" : "hidden"}`} onMouseLeave={() => setOpenDropdown(null)}>
          {user ? (
            <>
              <Link to="/user/dashboard" className="block px-4 py-2 font-nav text-sm text-gray-700 hover:bg-background hover:text-primary transition-colors" onClick={() => setOpenDropdown(null)}>Dashboard</Link>
              <button onClick={handleLogout} className="block w-full text-left px-4 py-2 font-nav text-sm text-gray-700 hover:bg-background hover:text-primary transition-colors">Logout</button>
            </>
          ) : (
            <Link to="/login" className="block px-4 py-2 font-nav text-sm text-gray-700 hover:bg-background hover:text-primary transition-colors" onClick={() => setOpenDropdown(null)}>Login</Link>
          )}
        </div>
      </div>
    );
  };

  const handleMouseEnter = (title) => { clearTimeout(timeoutRef.current); setOpenDropdown(title); };
  const handleMouseLeave = () => { timeoutRef.current = setTimeout(() => setOpenDropdown(null), 300); };

  useEffect(() => { return () => clearTimeout(timeoutRef.current); }, []);

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${bgClass}`}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand — org logo + name */}
          <Link to="/" className="flex items-center gap-2.5">
            {branding?.logo ? (
              <img src={branding.logo} alt={organisation?.name || ""} className="h-8 w-8 object-contain rounded" />
            ) : organisation ? (
              <div className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: branding?.accentColor || "#C9A84C" }}>
                {organisation.name?.charAt(0) || ""}
              </div>
            ) : null}
            <div className="flex flex-col">
              <span className={`font-nav text-lg font-extrabold tracking-tight leading-tight ${textColor} transition-colors`}>
                {organisation?.name || ""}
              </span>
              {branding?.tagline && (
                <span className={`text-[10px] leading-tight ${!scrolled && !isOpen ? (heroBgIsLight ? "text-primary/50" : "text-white/60") : "text-text-muted"}`}>
                  {branding.tagline}
                </span>
              )}
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:space-x-6">
            <Link to="/" className={navLinkClass("/")}>Home</Link>
            {Object.entries(navItems).map(([title, { path, items: navSubItems }]) => (
              <div key={title} className="relative group" onMouseEnter={() => handleMouseEnter(title)} onMouseLeave={handleMouseLeave}>
                <div className="flex items-center space-x-1">
                  <Link to={path} className={navLinkClass(path)}>{title}</Link>
                  <ChevronDown className={`h-3.5 w-3.5 ${textColor}`} />
                </div>
                <div className={`absolute ${openDropdown === title ? "block" : "hidden"} w-48 bg-white/90 backdrop-blur-xl shadow-xl rounded-xl mt-1 py-2 left-1/2 -translate-x-1/2 z-50 border border-white/30`} onMouseEnter={() => clearTimeout(timeoutRef.current)} onMouseLeave={handleMouseLeave}>
                  {navSubItems.map((item) => (
                    <Link key={item.path} to={item.path} className="block px-4 py-2 font-nav text-sm text-gray-700 hover:bg-background hover:text-primary transition-colors text-sm">{item.label}</Link>
                  ))}
                </div>
              </div>
            ))}
            <Link to="/team-hope" className={navLinkClass("/team-hope")}>Team Hope</Link>
            <Link to="/events" className={navLinkClass("/events")}>Events</Link>
            <Link to="/contact-us" className={navLinkClass("/contact-us")}>Contact Us</Link>
          </div>

          {/* User Icons */}
          <div className={`flex items-center space-x-4 ${textColor}`}>
            <UserDropdown />
            <button className={`${hoverColor} transition-colors relative`} onClick={() => setCartOpen(true)} aria-label="Shopping cart">
              <ShoppingCart size={22} />
              {items.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{items.length}</span>
              )}
            </button>
            <button onClick={() => setIsOpen(!isOpen)} className={`lg:hidden inline-flex items-center justify-center p-2 rounded-md ${textColor} ${hoverColor}`} aria-expanded={isOpen}>
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <motion.div
        className={`lg:hidden overflow-hidden ${isOpen ? "" : "pointer-events-none"}`}
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="px-4 pt-2 pb-4 space-y-1 bg-background/90 backdrop-blur-xl">
          <Link to="/" className={`block px-3 py-2 rounded-md ${isActive("/") ? "text-accent font-semibold bg-accent/5" : "text-gray-700 hover:text-primary hover:bg-gray-50"}`} onClick={() => setIsOpen(false)}>Home</Link>
          {Object.entries(navItems).map(([title, { path, items: navSubItems }]) => (
            <NavDropdown key={title} title={title} path={path} items={navSubItems} />
          ))}
          <Link to="/team-hope" className={`block px-3 py-2 rounded-md ${isActive("/team-hope") ? "text-accent font-semibold bg-accent/5" : "text-gray-700 hover:text-primary hover:bg-gray-50"}`} onClick={() => setIsOpen(false)}>Team Hope</Link>
          <Link to="/events" className={`block px-3 py-2 rounded-md ${isActive("/events") ? "text-accent font-semibold bg-accent/5" : "text-gray-700 hover:text-primary hover:bg-gray-50"}`} onClick={() => setIsOpen(false)}>Events</Link>
          <Link to="/contact-us" className={`block px-3 py-2 rounded-md ${isActive("/contact-us") ? "text-accent font-semibold bg-accent/5" : "text-gray-700 hover:text-primary hover:bg-gray-50"}`} onClick={() => setIsOpen(false)}>Contact Us</Link>
        </div>
      </motion.div>
    </motion.nav>
  );
};

export default Navbar;
