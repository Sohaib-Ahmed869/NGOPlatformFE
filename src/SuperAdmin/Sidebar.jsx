import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, CreditCard, Paintbrush, MessageSquare, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const V = {
  ink: "#1A0D2E", inkFaint: "#9D90B5",
  primary: "#7C3AED", primary2: "#6D28D9", accent: "#DB2777",
  line: "rgba(28,15,55,.08)",
};
const mono = "'JetBrains Mono', monospace";

const menuItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Organisations", path: "/organisations", icon: Building2 },
  { title: "Billing", path: "/billing", icon: CreditCard },
  { title: "Branding Requests", path: "/branding-requests", icon: Paintbrush },
  { title: "Contact Queries", path: "/contact-queries", icon: MessageSquare },
];

export default function SuperAdminSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Logged out");
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6" style={{ borderBottom: `1px solid rgba(255,255,255,.08)` }}>
        <div className="flex items-center gap-2.5 mb-3">
          {/* <div className="w-7 h-7 rounded-md grid place-items-center text-white text-[10px] font-bold"
            style={{ background: `linear-gradient(135deg, ${V.primary}, ${V.accent})`, boxShadow: `0 0 16px rgba(124,58,237,.4)` }}>
            N
          </div> */}
          <span className="text-white font-medium text-[15px]">NGO Platform</span>
        </div>
        <div className="text-[10px] tracking-[.08em] uppercase" style={{ fontFamily: mono, color: "rgba(255,255,255,.4)" }}>
          Super Admin
        </div>
        {user && (
          <p className="text-xs mt-1 truncate" style={{ color: "rgba(255,255,255,.5)" }}>{user.email}</p>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] transition-all"
              style={isActive ? {
                background: `linear-gradient(135deg, ${V.primary}, ${V.primary2})`,
                color: "#fff", fontWeight: 600,
                boxShadow: `0 0 20px rgba(124,58,237,.3), inset 0 1px 0 rgba(255,255,255,.15)`,
              } : {
                color: "rgba(255,255,255,.6)",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,.06)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Version + Logout */}
      <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <div className="px-3.5 py-1.5 mb-2 text-[10px] tracking-[.06em]" style={{ fontFamily: mono, color: "rgba(255,255,255,.25)" }}>
          v2.4 · platform admin
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3.5 py-2.5 w-full text-[13px] rounded-lg transition-colors"
          style={{ color: "rgba(255,255,255,.5)" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,.06)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg text-white"
        style={{ background: V.ink }}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 transform transition-transform lg:transform-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ background: `linear-gradient(180deg, ${V.ink} 0%, #120826 100%)` }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
