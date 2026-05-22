import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Heart,
  Users,
  CalendarDays,
  CreditCard,
  Contact,
  PersonStanding,
  Newspaper,
  LogOut,
  Menu,
  X,
  User,
  XCircle,
  ShoppingCart,
  Layers,
  Gift,
  Star,
  Stars,
  Target,
  Paintbrush,
  Settings
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      toast.error("Please login to access admin panel");
      navigate("/login");
      return;
    }
    if (!user.role?.includes("admin")) {
      toast.error("You don't have permission to access admin panel");
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebar = document.getElementById("admin-sidebar");
      const toggleButton = document.getElementById("sidebar-toggle");
      if (
        isMobileMenuOpen &&
        sidebar &&
        !sidebar.contains(event.target) &&
        toggleButton &&
        !toggleButton.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    const isAdmin = user && user.role?.includes("admin");
    try {
      await logout();
      toast.success("Logged out successfully");
      if (isAdmin) {
        navigate("/admin/login");
      } else {
        navigate("/login");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed. Please try again.");
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const menuItems = [
    { title: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { title: "All Donations", path: "/admin/donations", icon: Heart },
    { title: "Donors", path: "/admin/donors", icon: Users },
    { title: "Subscriptions", path: "/admin/subscriptions", icon: CreditCard },
    { title: "Installments", path: "/admin/installments", icon: Layers },
    { title: "Cancellation Requests", path: "/admin/cancellation-requests", icon: XCircle },
    { title: "Events", path: "/admin/events", icon: CalendarDays },
    { title: "Contacts", path: "/admin/contacts", icon: Contact },
    { title: "Volunteers", path: "/admin/volunteers", icon: PersonStanding },
    { title: "Newsletter", path: "/admin/newsletter", icon: Newspaper },
    { title: "Products Management", path: "/admin/products", icon: ShoppingCart },
    { title: "Donation Types", path: "/admin/donation-types", icon: Stars },
    { title: "Programs", path: "/admin/programs", icon: Target },
    { title: "Portal Branding", path: "/admin/branding", icon: Paintbrush },
    { title: "Organisation Settings", path: "/admin/settings", icon: Settings },
    { title: "Profile Settings", path: "/admin/profile", icon: User },
  ];

  if (!user || !user.role?.includes("admin")) {
    return null;
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/10">
        <h2 className="text-lg font-bold text-[#F5EDE0] tracking-wide">Admin Panel</h2>
        <p className="text-xs text-[#F5EDE0]/40 mt-0.5">{user.name || user.email}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive
                      ? "font-medium"
                      : "text-[#F5EDE0]/60 hover:bg-white/5 hover:text-[#F5EDE0]"
                  }`}
                  style={isActive ? { backgroundColor: `rgba(var(--tenant-accent-rgb, 201, 168, 76), 0.2)`, color: `var(--tenant-accent, #C9A84C)` } : undefined}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span>{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#F5EDE0]/60 hover:bg-white/5 hover:text-[#F5EDE0] w-full text-left transition-all"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="block lg:hidden fixed top-4 left-4 z-40">
        <button
          id="sidebar-toggle"
          onClick={toggleMobileMenu}
          className="p-2 rounded-xl bg-white shadow-md text-primary hover:bg-background transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black z-30 transition-opacity duration-300 lg:hidden ${
          isMobileMenuOpen ? "opacity-50" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile sidebar */}
      <div
        id="admin-sidebar"
        className={`fixed top-0 left-0 h-full w-64 z-30 transform transition-transform duration-300 lg:hidden overflow-auto ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: `linear-gradient(180deg, var(--tenant-sidebar-top, #4A3F30) 0%, var(--tenant-sidebar-bottom, #3D3226) 100%)` }}
      >
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div
        className="hidden lg:block h-full w-64 shadow-lg"
        style={{ background: `linear-gradient(180deg, var(--tenant-sidebar-top, #4A3F30) 0%, var(--tenant-sidebar-bottom, #3D3226) 100%)` }}
      >
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;
