import { Link, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Heart, Target, CreditCard, Clock, User, Wallet, Receipt, Megaphone, LifeBuoy, LogOut } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import { cn } from "../utils/cn";

function prettifyName(raw) {
  if (!raw) return "My Account";
  if (/[A-Z]/.test(raw) || /\s/.test(raw)) return raw;
  return raw.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const NAV = [
  {
    flat: true,
    items: [
      { label: "Dashboard", path: "/user/dashboard", icon: LayoutDashboard },
      { label: "My Donations", path: "/user/donations", icon: Heart },
      { label: "Subscriptions", path: "/user/subscriptions", icon: CreditCard },
      { label: "My Payments", path: "/user/payments", icon: Receipt },
      { label: "My Programs", path: "/user/programs", icon: Target },
      { label: "My Fundraisers", path: "/user/fundraisers", icon: Megaphone },
      { label: "Support", path: "/user/support", icon: LifeBuoy },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Payment Methods", path: "/user/settings/payment", icon: Wallet },
      { label: "Profile", path: "/user/settings/profile", icon: User },
    ],
  },
];

// accent-tinted active state reads tenant CSS vars at runtime → inline style.
const activeItemStyle = {
  backgroundColor: "rgba(var(--tenant-accent-rgb, 201, 168, 76), 0.18)",
  color: "var(--tenant-accent, #C9A84C)",
};

const UserSidebar = ({ collapsed, mobileOpen, onClose }) => {
  const { logout } = useAuth();
  const { organisation, branding, slug } = useTenant();
  const navigate = useNavigate();

  const brandName = prettifyName(organisation?.name || slug);
  const brandInitial = (brandName || "M").trim().charAt(0).toUpperCase();
  // The rail is a dark surface → prefer the light logo, fall back to the dark
  // variant. Collapsed uses a dedicated square icon mark when available.
  const expandedLogo = branding?.logo || branding?.logoDark;
  const collapsedLogo = branding?.iconLogo || branding?.iconLogoDark || expandedLogo;

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      /* best-effort */
    }
    toast.success("Logged out successfully");
    onClose?.();
    navigate("/login");
  };

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col text-white transition-[width,transform] duration-300 ease-in-out",
          collapsed ? "md:w-16" : "md:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
        style={{
          background: [
            "linear-gradient(to right, rgba(var(--tenant-accent-rgb, 201, 168, 76), 0.18), rgba(var(--tenant-accent-rgb, 201, 168, 76), 0.05) 45%, transparent 78%)",
            "linear-gradient(180deg, var(--tenant-sidebar-top, #4A3F30) 0%, var(--tenant-sidebar-bottom, #3D3226) 100%)",
          ].join(", "),
          boxShadow: "4px 0 18px -10px rgba(0,0,0,0.6)",
        }}
      >
        {/* Brand */}
        <div className={cn("flex shrink-0 items-center px-4 pb-4 pt-6", collapsed && "md:justify-center md:px-3")}>
          {/* Expanded brand (hidden at md when collapsed) */}
          <Link
            to="/user/dashboard"
            onClick={onClose}
            className={cn("flex min-w-0 items-center gap-2.5", collapsed && "md:hidden")}
          >
            {expandedLogo ? (
              <img src={expandedLogo} alt={brandName} className="-ml-1.5 h-10 w-auto max-w-[170px] object-contain object-left" />
            ) : (
              <>
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[15px] font-extrabold leading-none text-white ring-1 ring-white/20"
                  style={{
                    background: "linear-gradient(135deg, var(--tenant-accent, #C9A84C), var(--tenant-accent-light, #D4B85A))",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.25)",
                  }}
                >
                  {brandInitial}
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-[15px] font-bold tracking-tight text-white">{brandName}</span>
                  <span className="truncate text-[9px] font-medium uppercase tracking-[0.18em] text-white/40">My Account</span>
                </span>
              </>
            )}
          </Link>

          {/* Collapsed brand (md only) — square icon mark or initial badge */}
          {collapsed ? (
            <Link to="/user/dashboard" onClick={onClose} title={brandName} className="hidden md:flex">
              {collapsedLogo ? (
                <img src={collapsedLogo} alt={brandName} className="h-9 w-9 object-contain" />
              ) : (
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[15px] font-extrabold leading-none text-white ring-1 ring-white/20"
                  style={{
                    background: "linear-gradient(135deg, var(--tenant-accent, #C9A84C), var(--tenant-accent-light, #D4B85A))",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.25)",
                  }}
                >
                  {brandInitial}
                </span>
              )}
            </Link>
          ) : null}
        </div>

        {/* Nav */}
        <nav className="scrollbar-none flex-1 space-y-4 overflow-y-auto px-3 py-3">
          {NAV.map((group, gi) => (
            <div key={group.label || gi}>
              {group.flat ? null : (
                <>
                  <p className={cn("mb-1 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40", collapsed && "md:hidden")}>
                    {group.label}
                  </p>
                  {collapsed ? <div className="mx-2 my-2 hidden border-t border-white/10 md:block" /> : null}
                </>
              )}
              <ul
                className={cn(
                  "space-y-1",
                  !group.flat && "ml-3 border-l border-white/10 pl-2.5",
                  !group.flat && collapsed && "md:ml-0 md:border-transparent md:pl-0",
                )}
              >
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        end={item.path === "/user/dashboard"}
                        onClick={onClose}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          cn(
                            "group relative flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors duration-200",
                            collapsed && "md:justify-center md:px-0",
                            !isActive && "text-white/70 hover:bg-white/5 hover:text-white",
                          )
                        }
                        style={({ isActive }) => (isActive ? activeItemStyle : undefined)}
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && !group.flat ? (
                              <span
                                className={cn("absolute inset-y-1 -left-[11px] w-[3px] rounded-full", collapsed && "md:hidden")}
                                style={{ backgroundColor: "var(--tenant-accent, #C9A84C)" }}
                                aria-hidden="true"
                              />
                            ) : null}
                            <Icon className="h-[18px] w-[18px] shrink-0" />
                            <span className={cn("min-w-0 flex-1 truncate", collapsed && "md:hidden")}>{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="shrink-0 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Sign Out" : undefined}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-red-500/10 hover:text-red-300",
              collapsed && "md:justify-center md:px-0",
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className={cn("min-w-0 flex-1 truncate text-left", collapsed && "md:hidden")}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      ) : null}
    </>
  );
};

export default UserSidebar;
