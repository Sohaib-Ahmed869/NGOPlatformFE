import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Menu, PanelLeftClose, PanelLeftOpen, ChevronDown, LogOut, Sun, Moon, Settings } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useAdminUi } from "../../context/AdminUiContext";
import { cn } from "../../utils/cn";
import ProfileService from "../../services/profile.service";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
// Resolve a stored avatar path (relative upload, absolute URL or data-URI) — mirrors Settings.
function resolveAvatar(path) {
  if (!path || path.includes("/api/placeholder")) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${API_BASE}/${String(path).replace(/\\/g, "/").replace(/^\/+/, "")}`;
}

const LABELS = {
  "/dashboard": "Dashboard",
  "/organisations": "Organisations",
  "/plans": "Plans",
  "/billing": "Billing",
  "/invoices": "Invoices",
  "/coupons": "Coupons",
  "/tickets": "Support Tickets",
  "/kanban": "Kanban",
  "/branding-requests": "Branding Requests",
  "/contact-queries": "Contact Queries",
  "/settings": "Settings",
  "/profile": "Settings",
};

// The header bar is always dark (matches the sidebar) → light-on-dark controls.
const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-white";

function getInitials(name) {
  if (!name) return "SA";
  const p = name.trim().split(/\s+/);
  return (p[0][0] + (p[1]?.[0] || "")).toUpperCase();
}

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside?.();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}

function ThemeToggle() {
  const { theme, toggleTheme } = useAdminUi();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={iconBtn}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

function UserMenu() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  // Avatar: live from the auth user (updates instantly after an upload in
  // Settings), with a one-time profile fetch as the initial fallback.
  const [fetchedImg, setFetchedImg] = useState("");
  useEffect(() => {
    const cached = ProfileService.getCached?.();
    if (cached?.profileImage) { setFetchedImg(cached.profileImage); return; }
    ProfileService.getProfile().then((p) => setFetchedImg(p?.profileImage || "")).catch(() => {});
  }, []);
  const avatar = resolveAvatar(user?.profileImage || fetchedImg);

  const email = user?.email || "";
  const name =
    user?.name ||
    (email ? email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Super Admin");

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      /* best-effort */
    }
    toast.success("Logged out");
    setOpen(false);
    navigate("/login");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 p-1 pr-1.5 transition-colors hover:bg-white/5"
      >
        {avatar ? (
          <img src={avatar} alt={name} className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/20" />
        ) : (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--tenant-accent, #10b981), var(--tenant-accent-light, #34d399))" }}
          >
            {getInitials(name)}
          </span>
        )}
        <div className="hidden min-w-0 text-left leading-tight sm:block">
          <p className="max-w-[150px] truncate text-[13px] font-semibold text-white">{name}</p>
          <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">Super Admin</p>
        </div>
        <ChevronDown className={cn("hidden h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 sm:block", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg dark:border-white/10 dark:bg-[var(--admin-elevated)]">
          <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/10">
            {avatar ? (
              <img src={avatar} alt={name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
            ) : (
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, var(--tenant-accent, #10b981), var(--tenant-accent-light, #34d399))" }}
              >
                {getInitials(name)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
              <p className="truncate text-[12px] text-gray-500 dark:text-white/55">{email}</p>
            </div>
          </div>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/5"
          >
            <Settings className="h-4 w-4 text-gray-400 dark:text-white/50" /> Settings
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-sm text-red-600 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function SATopbar() {
  const { openMobileSidebar, toggleSidebar, sidebarCollapsed } = useAdminUi();
  const location = useLocation();
  const current = LABELS[location.pathname] || "";

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-30 flex h-16 items-center text-white transition-[left] duration-300 ease-in-out",
        sidebarCollapsed ? "md:left-16" : "md:left-64",
      )}
      style={{ background: "var(--tenant-sidebar-top, #1e293b)", boxShadow: "0 4px 18px -10px rgba(0,0,0,0.6)" }}
    >
      <div className="flex h-full w-full items-center gap-3 px-3 lg:px-4">
        <button type="button" className={cn(iconBtn, "md:hidden")} onClick={openMobileSidebar} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          className={cn(iconBtn, "hidden md:inline-flex")}
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>

        <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 items-center gap-1.5 text-sm md:flex">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-white/55 transition-colors hover:text-white">
            <Home className="h-3.5 w-3.5" /> Platform
          </Link>
          {current && (
            <>
              <span className="text-white/25">/</span>
              <span className="truncate font-medium text-white">{current}</span>
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
