import { Outlet } from "react-router-dom";
import { AdminUiProvider, useAdminUi } from "../context/AdminUiContext";
import { SARealtimeProvider } from "./context/SARealtimeContext";
import { SAThemeProvider } from "./saTheme";
import SASidebar from "./components/SASidebar";
import SATopbar from "./components/SATopbar";
import { cn } from "../utils/cn";
// Reuse the admin portal's dark-mode token engine (remaps gray utilities to a
// themed dark palette when data-admin-theme="dark"). Nothing outside the shell
// is affected.
import "../Admin/admin-theme.css";

function SAShell() {
  const { sidebarCollapsed, theme } = useAdminUi();
  // The colour theme (Settings → Appearance) is applied to <html> by
  // SAThemeProvider — like the tenant — so dark-mode background overrides work.

  return (
    <div
      data-admin-theme={theme}
      className="min-h-screen"
      style={{ backgroundColor: "var(--tenant-sidebar-top)" }}
    >
      <SASidebar />
      <SATopbar />

      <main
        className={cn(
          "min-h-screen pt-16 transition-[padding] duration-300 ease-in-out",
          sidebarCollapsed ? "md:pl-16" : "md:pl-64",
        )}
      >
        <div
          className="admin-content min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-6 md:rounded-tl-[1.25rem]"
          style={{ backgroundColor: "var(--tenant-bg)" }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function SuperAdminLayout() {
  // Auth/role is already enforced by <ProtectedSuperAdminRoute> in App.jsx.
  return (
    <AdminUiProvider>
      <SAThemeProvider>
        <SARealtimeProvider>
          <SAShell />
        </SARealtimeProvider>
      </SAThemeProvider>
    </AdminUiProvider>
  );
}
