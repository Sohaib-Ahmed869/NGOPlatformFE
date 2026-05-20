import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Heart,
  Target,
  CreditCard,
  Clock,
  LogOut,
  User,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";

const UserSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const menuItems = [
    { title: "Dashboard", path: "/user/dashboard", icon: LayoutDashboard },
    { title: "My Donations", path: "/user/donations", icon: Heart },
    { title: "My Programs", path: "/user/programs", icon: Target },
    {
      section: "Subscriptions",
      items: [
        { title: "Active Subscriptions", path: "/user/subscriptions/active", icon: CreditCard },
        { title: "Previous Subscriptions", path: "/user/subscriptions/previous", icon: Clock },
      ],
    },
    {
      section: "Settings",
      items: [
        { title: "Profile Settings", path: "/user/settings/profile", icon: User },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full font-body">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/10">
        <h2 className="text-lg font-heading font-bold text-white tracking-wide">My Account</h2>
        <p className="text-xs text-white/40 mt-0.5">{user?.name || user?.email}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-4">
          {menuItems.map((item, index) => {
            if (item.section) {
              return (
                <li key={index}>
                  <div className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.15em] mb-2 px-3">
                    {item.section}
                  </div>
                  <ul className="space-y-1">
                    {item.items.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isActive = location.pathname === subItem.path;
                      return (
                        <li key={subItem.path}>
                          <Link
                            to={subItem.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                              isActive
                                ? "bg-accent/15 text-accent font-medium"
                                : "text-white/60 hover:bg-white/5 hover:text-white"
                            }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <SubIcon className="w-[18px] h-[18px]" />
                            <span>{subItem.title}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            }

            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive
                      ? "bg-accent/15 text-accent font-medium"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
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
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:bg-white/5 hover:text-white w-full text-left transition-all"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="block lg:hidden fixed top-4 left-4 z-30">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl bg-white shadow-md text-primary hover:bg-background transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-20 transition-opacity duration-300 ${
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
        <div
          className={`absolute top-0 left-0 h-full w-64 transform transition-transform duration-300 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ background: `linear-gradient(180deg, var(--tenant-sidebar-top, #4A3F30) 0%, var(--tenant-sidebar-bottom, #3D3226) 100%)` }}
        >
          {sidebarContent}
        </div>
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

export default UserSidebar;
