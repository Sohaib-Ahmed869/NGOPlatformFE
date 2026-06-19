import { ShieldAlert, Eye } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getStoragePrefix } from "../../services/axios";
import superadminService from "../../services/superadmin.service";

/**
 * Persistent red bar shown while a platform-support impersonation session is
 * active (user.support_session). "End session" audits the end, clears the tenant
 * session, and returns the operator to the SuperAdmin console on admin.<domain>.
 */
export default function SupportSessionBanner() {
  const { user } = useAuth();
  if (!user?.support_session) return null;

  const endSession = async () => {
    try {
      await superadminService.endSupportSession();
    } catch {
      /* best-effort audit */
    }
    const prefix = getStoragePrefix();
    localStorage.removeItem(prefix + "token");
    localStorage.removeItem(prefix + "user");

    const { protocol, host } = window.location;
    const parts = host.split(".");
    parts[0] = "admin"; // swap the tenant subdomain back to the operator console
    window.location.href = `${protocol}//${parts.join(".")}/organisations/${user.orgId || ""}`;
  };

  const viewOnly = user.support_access === "view_only";
  const surface = user.support_mode === "website" ? "public website" : "admin portal";

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[60] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-sm font-medium text-white shadow-[0_-4px_18px_-8px_rgba(0,0,0,0.5)] ${
        viewOnly ? "bg-amber-600" : "bg-red-600"
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        {viewOnly ? <Eye className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
        Platform support · {user.impersonatedBy} · {user.slug || ""} · {surface}
      </span>
      {viewOnly ? (
        <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">View-only</span>
      ) : (
        <span className="text-xs opacity-90">— every action is audited</span>
      )}
      <button
        type="button"
        onClick={endSession}
        className="rounded-md bg-white/15 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/25"
      >
        End session
      </button>
    </div>
  );
}
