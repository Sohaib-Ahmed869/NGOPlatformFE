import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import UserSidebar from "./sidebar";
import UserTopbar from "./UserTopbar";
import { useAuth } from "../context/AuthContext";
import ProfileService from "../services/profile.service";
import { cn } from "../utils/cn";

// Auth + temporary-password gating is handled by <ProtectedRoute> which wraps
// this layout, so the shell just renders instantly — no loading screen.
const UserLayout = () => {
  const { user, setUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // The login / cached user may not carry the profile photo. Hydrate it once
  // from the profile endpoint so the topbar (and any avatar reading
  // user.profileImage) shows the real image instead of falling back to initials.
  useEffect(() => {
    if (!user || user.profileImage !== undefined) return;
    let cancelled = false;
    ProfileService.getProfile()
      .then((p) => {
        if (!cancelled && p) setUser((prev) => ({ ...prev, profileImage: p.profileImage || "" }));
      })
      .catch(() => {
        if (!cancelled) setUser((prev) => ({ ...prev, profileImage: "" }));
      });
    return () => { cancelled = true; };
  }, [user, setUser]);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("userSidebarCollapsed") === "1";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("userSidebarCollapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  return (
    <div data-user-portal className="min-h-screen" style={{ backgroundColor: "var(--tenant-sidebar-top, #4A3F30)" }}>
      <UserSidebar collapsed={collapsed} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <UserTopbar collapsed={collapsed} onToggleCollapse={toggleCollapsed} onMenu={() => setMobileOpen(true)} />

      <main
        className={cn(
          "min-h-screen pt-16 transition-[padding] duration-300 ease-in-out",
          collapsed ? "md:pl-16" : "md:pl-64",
        )}
      >
        <div
          className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-8 md:rounded-tl-[1.25rem]"
          style={{ backgroundColor: "var(--tenant-bg, #FAF7F2)" }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default UserLayout;
