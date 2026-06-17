import { useEffect } from "react";
import DesignTab from "./DesignTab";
import { useAdminUi } from "../../context/AdminUiContext";

/**
 * Standalone admin Design page (/admin/design). Reuses the exact same DesignTab
 * used as a tab on the Branding screen, so the two stay in sync — fonts, shape,
 * layout, templates, live portal preview, and draft/publish.
 *
 * Collapses the sidebar on entry to give the live preview the full width, and
 * restores the operator's previous sidebar preference when they leave.
 */
export default function Design() {
  const { sidebarCollapsed, setSidebarCollapsed } = useAdminUi();

  useEffect(() => {
    const prev = sidebarCollapsed;
    setSidebarCollapsed(true);
    return () => setSidebarCollapsed(prev);
    // Run once on mount; capture the preference at entry and restore on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full">
      <DesignTab />
    </div>
  );
}
