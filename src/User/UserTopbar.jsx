import { useRef, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, ChevronDown, User, LogOut, Heart, Home, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { cn } from "../utils/cn";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// Breadcrumb trail per route (the "Home" root is rendered separately).
const CRUMBS = {
  "/user/dashboard": [{ label: "Dashboard" }],
  "/user/donations": [{ label: "My Donations" }],
  "/user/programs": [{ label: "My Programs" }],
  "/user/subscriptions/active": [{ label: "Subscriptions" }, { label: "Active" }],
  "/user/subscriptions/previous": [{ label: "Subscriptions" }, { label: "Previous" }],
  "/user/settings/payment": [{ label: "Settings" }, { label: "Payment Methods" }],
  "/user/settings/profile": [{ label: "Settings" }, { label: "Profile" }],
};

const getInitials = (name) => {
  if (!name) return "U";
  const p = name.trim().split(/\s+/);
  return (p[0][0] + (p[1]?.[0] || "")).toUpperCase();
};

const resolveAvatar = (path) => {
  if (!path || path.includes("/api/placeholder")) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${API_BASE}/${String(path).replace(/\\/g, "/").replace(/^\/+/, "")}`;
};

const iconBtn = "inline-flex h-9 w-9 items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-white";

function Breadcrumbs() {
  const { pathname } = useLocation();
  const crumbs = CRUMBS[pathname] || [{ label: "My Account" }];
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 items-center gap-1.5 text-sm md:flex">
      <Link to="/user/dashboard" className="inline-flex items-center gap-1 text-white/55 transition-colors hover:text-white">
        <Home className="h-3.5 w-3.5" /> Home
      </Link>
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i}`} className="inline-flex min-w-0 items-center gap-1.5">
          <span className="text-white/25">/</span>
          {c.path && i < crumbs.length - 1 ? (
            <Link to={c.path} className="truncate text-white/55 transition-colors hover:text-white">{c.label}</Link>
          ) : (
            <span className="truncate font-medium text-white">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

const UserTopbar = ({ onMenu, collapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const displayName =
    user?.name ||
    (user?.email ? user.email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Member");
  const avatar = resolveAvatar(user?.profileImage);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      /* best-effort */
    }
    toast.success("Logged out successfully");
    setOpen(false);
    navigate("/login");
  };

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-30 flex h-16 items-center text-white transition-[left] duration-300 ease-in-out",
        collapsed ? "md:left-16" : "md:left-64",
      )}
      style={{ background: "var(--tenant-sidebar-top, #4A3F30)", boxShadow: "0 4px 18px -10px rgba(0,0,0,0.6)" }}
    >
      <div className="flex h-full w-full items-center gap-3 px-3 lg:px-5">
        {/* Mobile: open drawer. Desktop: collapse/expand the rail. */}
        <button type="button" className={cn(iconBtn, "md:hidden")} onClick={onMenu} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          className={cn(iconBtn, "hidden md:inline-flex")}
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>

        <Breadcrumbs />

        <div className="ml-auto flex items-center gap-2">
          {/* Home (back to public site) */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 border border-white/20 px-3.5 py-2 text-sm font-medium text-white/85 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white"
          >
            <Home className="h-4 w-4" /> <span className="hidden sm:inline">Home</span>
          </Link>

          {/* Make a Donation */}
          <Link
            to="/donate"
            className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/25 transition-colors hover:bg-accent-light"
          >
            <Heart className="h-4 w-4" /> <span className="hidden sm:inline">Make a Donation</span>
          </Link>

          <div className="mx-1 hidden h-7 w-px bg-white/15 sm:block" />

          {/* User chip + menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="flex items-center gap-2.5 p-1 pr-1.5 transition-colors hover:bg-white/5"
            >
              {avatar ? (
                <img src={avatar} alt={displayName} className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/15" />
              ) : (
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, var(--tenant-accent, #C9A84C), var(--tenant-accent-light, #D4B85A))" }}
                >
                  {getInitials(displayName)}
                </span>
              )}
              <div className="hidden min-w-0 text-left leading-tight sm:block">
                <p className="max-w-[160px] truncate text-[13px] font-semibold text-white">{displayName}</p>
                <p className="max-w-[160px] truncate text-[11px] text-white/45">{user?.email}</p>
              </div>
              <ChevronDown className={cn("hidden h-4 w-4 shrink-0 text-white/40 transition-transform sm:block", open && "rotate-180")} />
            </button>
            {open ? (
              <div className="absolute right-0 z-40 mt-2 w-60 overflow-hidden border border-gray-100 bg-white shadow-xl">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-primary">{displayName}</p>
                  <p className="truncate text-xs text-text-muted">{user?.email}</p>
                </div>
                <Link
                  to="/user/settings/profile"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-background hover:text-primary"
                  onClick={() => setOpen(false)}
                >
                  <User className="h-4 w-4 text-text-muted" /> Profile settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-sm text-danger transition-colors hover:bg-background"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export default UserTopbar;
