import React, { useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthService from "../services/auth.service";
import { AdminUiProvider, useAdminUi } from "../context/AdminUiContext";
import { AdminRealtimeProvider } from "../context/AdminRealtimeContext";
import { AdminSidebar } from "./components/AdminSidebar";
import { AdminTopbar } from "./components/AdminTopbar";
import ProfileService from "../services/profile.service";
import { cn } from "../utils/cn";
import "./admin-theme.css";

// Flush "unified frame" shell: a full-height dark left rail and a full-width
// dark top bar (same tenant-dark color) read as one connected frame, with the
// content sitting in a light/dark panel that has a soft rounded top-left corner
// where it meets the frame.
const AdminShell = () => {
  const { sidebarCollapsed, theme } = useAdminUi();

  return (
    <div
      data-admin-theme={theme}
      className="min-h-screen"
      // The only place this frame shows is the wedge behind the content panel's
      // rounded top-left corner — which sits at the TOP, flush against the topbar
      // and the top of the sidebar. Both use the lighter "top" shade, so match it
      // here (not the darker "bottom" shade) to avoid a visible seam at the curve.
      style={{ backgroundColor: "var(--tenant-sidebar-top, #4A3F30)" }}
    >
      <AdminSidebar />
      <AdminTopbar />

      <main
        className={cn(
          "min-h-screen pt-16 transition-[padding] duration-300 ease-in-out",
          sidebarCollapsed ? "md:pl-16" : "md:pl-64",
        )}
      >
        <div
          className="admin-content min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-6 md:rounded-tl-[1.25rem]"
          style={{ backgroundColor: "var(--tenant-bg, #FAF7F2)" }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const AdminLayout = () => {
  const { user, setUser } = useAuth();

  // Fallback: if the in-memory user hasn't hydrated yet (e.g. the instant after a
  // support-session handoff stores it), read it from storage so we never fire the
  // one-shot redirect on a transient null and bounce a valid admin out.
  const effectiveUser = user || AuthService.getCurrentUser();

  // Adopt the stored user into context so the rest of the portal sees it.
  useEffect(() => {
    if (!user && effectiveUser) setUser(effectiveUser);
  }, [user, effectiveUser, setUser]);

  // The login / cached user may not carry the profile photo. Hydrate it once
  // from the profile endpoint so the topbar + sidebar avatars can use it.
  useEffect(() => {
    if (!effectiveUser || effectiveUser.profileImage !== undefined) return;
    let cancelled = false;
    ProfileService.getProfile()
      .then((p) => {
        if (!cancelled && p) {
          setUser((prev) => ({ ...(prev || effectiveUser), profileImage: p.profileImage || "" }));
        }
      })
      .catch(() => {
        // Best-effort — fall back to initials if the profile can't load.
        if (!cancelled) setUser((prev) => ({ ...(prev || effectiveUser), profileImage: "" }));
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveUser, setUser]);

  if (!effectiveUser || !effectiveUser.role?.includes("admin")) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AdminUiProvider>
      <AdminRealtimeProvider>
        <AdminShell />
      </AdminRealtimeProvider>
    </AdminUiProvider>
  );
};

export default AdminLayout;
