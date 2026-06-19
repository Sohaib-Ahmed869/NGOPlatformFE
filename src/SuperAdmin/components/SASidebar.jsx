import { useState, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, Layers, CreditCard, Receipt, Ticket, LifeBuoy, KanbanSquare, Paintbrush, MessageSquare, LogOut, HeartHandshake, Settings, Globe, ChevronDown, ShieldCheck, ScrollText, SlidersHorizontal } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useAdminUi } from "../../context/AdminUiContext";
import { cn } from "../../utils/cn";
import platformService from "../../services/platform.service";
import { useSARealtime } from "../context/SARealtimeContext";

// Logically grouped nav. The first group is `flat` (no header) for the overview;
// the rest are collapsible sections (collapsedGroups/toggleGroup from useAdminUi).
const NAV_GROUPS = [
  { flat: true, items: [{ label: "Dashboard", path: "/dashboard", icon: LayoutDashboard }] },
  {
    label: "Tenants",
    items: [
      { label: "Organisations", path: "/organisations", icon: Building2 },
      { label: "Branding Requests", path: "/branding-requests", icon: Paintbrush },
    ],
  },
  {
    label: "Billing",
    items: [
      { label: "Plans", path: "/plans", icon: Layers },
      { label: "Features", path: "/features", icon: SlidersHorizontal },
      { label: "Coupons", path: "/coupons", icon: Ticket },
      { label: "Billing", path: "/billing", icon: CreditCard },
      { label: "Invoices", path: "/invoices", icon: Receipt },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Support Tickets", path: "/tickets", icon: LifeBuoy },
      { label: "Kanban", path: "/kanban", icon: KanbanSquare },
      { label: "Contact Queries", path: "/contact-queries", icon: MessageSquare },
    ],
  },
  {
    label: "Security",
    items: [
      { label: "Support Sessions", path: "/support-sessions", icon: ShieldCheck },
      { label: "Audit Log", path: "/audit", icon: ScrollText },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Platform", path: "/platform", icon: Globe },
      { label: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

// accent-tinted active state reads the platform CSS vars at runtime → inline style.
const activeItemStyle = {
  backgroundColor: "rgba(var(--tenant-accent-rgb, 16, 185, 129), 0.18)",
  color: "var(--tenant-accent, #10b981)",
};

export default function SASidebar() {
  const { logout } = useAuth();
  const { sidebarCollapsed, mobileSidebarOpen, closeMobileSidebar, collapsedGroups, toggleGroup } = useAdminUi();
  const { unreadContactQueries, pendingBrandingRequests } = useSARealtime();
  const location = useLocation();
  const navigate = useNavigate();

  // The platform's own branding (SuperAdmin → Platform). The sidebar is a DARK
  // surface, so the light logo/icon (the "for dark backgrounds" variants) read
  // best — fall back to the dark variants, then to the icon + name.
  const [brand, setBrand] = useState(null);
  useEffect(() => {
    platformService.getPublic().then((res) => setBrand(res.data)).catch(() => {});
  }, []);
  const brandName = brand?.name || "NGO Platform";
  const expandedLogo = brand?.logo || brand?.logoDark || "";
  const collapsedIcon = brand?.iconLogo || brand?.iconLogoDark || "";

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      /* best-effort */
    }
    toast.success("Logged out");
    closeMobileSidebar();
    navigate("/login");
  };

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col text-white transition-[width,transform] duration-300 ease-in-out",
          sidebarCollapsed ? "md:w-16" : "md:w-64",
          "w-64",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
        style={{
          background: [
            "linear-gradient(to right, rgba(var(--tenant-accent-rgb, 16, 185, 129), 0.16), rgba(var(--tenant-accent-rgb, 16, 185, 129), 0.05) 45%, transparent 78%)",
            "linear-gradient(180deg, var(--tenant-sidebar-top, #1e293b) 0%, var(--tenant-sidebar-bottom, #0f172a) 100%)",
          ].join(", "),
          boxShadow: "4px 0 18px -10px rgba(0,0,0,0.6)",
        }}
      >
        {/* Brand — collapsed shows the icon, expanded shows the full logo */}
        <div className={cn("flex shrink-0 items-center", sidebarCollapsed ? "h-16 justify-center px-3" : "gap-2.5 px-4 pt-6 pb-4")}>
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5" onClick={closeMobileSidebar}>
            {sidebarCollapsed ? (
              collapsedIcon ? (
                <img src={collapsedIcon} alt={brandName} className="h-9 w-9 shrink-0 rounded-lg object-contain" />
              ) : (
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white ring-1 ring-white/20"
                  style={{
                    background: "linear-gradient(135deg, var(--tenant-accent, #10b981), var(--tenant-accent-light, #34d399))",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.25)",
                  }}
                >
                  <HeartHandshake className="h-5 w-5" />
                </span>
              )
            ) : expandedLogo ? (
              <img src={expandedLogo} alt={brandName} className="h-9 w-auto max-w-[180px] shrink-0 object-contain object-left" />
            ) : (
              <>
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white ring-1 ring-white/20"
                  style={{
                    background: "linear-gradient(135deg, var(--tenant-accent, #10b981), var(--tenant-accent-light, #34d399))",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.25)",
                  }}
                >
                  <HeartHandshake className="h-5 w-5" />
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-[15px] font-bold tracking-tight text-white">{brandName}</span>
                  <span className="truncate text-[9px] font-medium uppercase tracking-[0.18em] text-white/40">Platform Console</span>
                </span>
              </>
            )}
          </Link>
        </div>

        {/* Nav (grouped) */}
        <nav className="scrollbar-none flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group, gi) => {
            const groupOpen = group.flat || sidebarCollapsed || !collapsedGroups[group.label];
            return (
              <div key={group.label || `g${gi}`}>
                {group.flat ? null : !sidebarCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={groupOpen}
                    className="mb-1 flex w-full items-center justify-between gap-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white/70"
                  >
                    <span className="truncate">{group.label}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200", groupOpen ? "rotate-0" : "-rotate-90")} />
                  </button>
                ) : (
                  <div className="mx-2 my-2 border-t border-white/10" />
                )}

                {groupOpen ? (
                  <ul
                    className={cn(
                      "space-y-1 transition-[margin,padding,border-color] duration-300 ease-in-out",
                      !group.flat && "border-l",
                      !group.flat && (sidebarCollapsed ? "ml-0 border-transparent pl-0" : "ml-3 border-white/10 pl-2.5"),
                    )}
                  >
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                      const badgeCount =
                        item.path === "/contact-queries"
                          ? unreadContactQueries
                          : item.path === "/branding-requests"
                            ? pendingBrandingRequests
                            : 0;
                      return (
                        <li key={item.path}>
                          <NavLink
                            to={item.path}
                            title={sidebarCollapsed ? item.label : undefined}
                            onClick={closeMobileSidebar}
                            style={active ? activeItemStyle : undefined}
                            className={cn(
                              "group relative flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors duration-200",
                              !active && "text-white/70 hover:bg-white/5 hover:text-white",
                            )}
                          >
                            {active && !sidebarCollapsed ? (
                              <span
                                className={cn("absolute inset-y-1 w-[3px] rounded-full", group.flat ? "left-0" : "-left-[11px]")}
                                style={{ backgroundColor: "var(--tenant-accent, #10b981)" }}
                                aria-hidden="true"
                              />
                            ) : null}
                            <Icon className="h-[18px] w-[18px] shrink-0" />
                            <span className={cn("min-w-0 flex-1 truncate transition-opacity duration-200", sidebarCollapsed && "opacity-0")}>{item.label}</span>
                            {badgeCount > 0 ? (
                              sidebarCollapsed ? (
                                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
                              ) : (
                                <span className="ml-auto shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{badgeCount}</span>
                              )
                            ) : null}
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="shrink-0 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            title={sidebarCollapsed ? "Logout" : undefined}
            aria-label="Logout"
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className={cn("min-w-0 flex-1 truncate text-left transition-opacity duration-200", sidebarCollapsed && "opacity-0")}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={closeMobileSidebar}
        />
      )}
    </>
  );
}
