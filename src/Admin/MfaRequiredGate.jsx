import { useCallback } from "react";
import { ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthService from "../services/auth.service";
import MfaEnrollPanel from "../SuperAdmin/components/MfaEnrollPanel";
import { AdminUiProvider, useAdminUi } from "../context/AdminUiContext";

/**
 * The wall a tenant admin hits when the platform team has made two-factor
 * mandatory for their account and they have not set it up yet.
 *
 * This exists because the toggle in SuperAdmin → Team → Tenant admins has to
 * mean something. `loginAdmin` returns `mfaSetupRequired` when the account's
 * policy says "required" and no authenticator is enrolled; the SuperAdmin
 * console has always honoured that flag (ProtectedSuperAdminRoute), but the
 * tenant admin portal ignored it — so "require two-factor" would have been a
 * preference stored in a database and read by nobody. The same class of bug as
 * a Suspend button that lets a live session keep working.
 *
 * It renders INSTEAD of the portal shell rather than as a route, for two
 * reasons: there is no URL that skips it, and the sidebar has nothing worth
 * showing to someone who cannot use any of it yet.
 *
 * `MfaEnrollPanel` is the SuperAdmin component, reused verbatim. Its API calls
 * (`/users/mfa/setup`, `/users/mfa/enable`) are role-agnostic and already work
 * for any signed-in account, so a second copy would only be a second thing to
 * keep in step.
 */
/**
 * Wrapped in AdminUiProvider and stamped with `data-admin-theme` for the same
 * reason AdminShell is: `bg-accent` and the rest of the token classes only
 * resolve inside the admin theme. Rendered outside it, the enrolment panel came
 * out in the console's default blue on a charity's own portal.
 */
export default function MfaRequiredGate() {
  return (
    <AdminUiProvider>
      <GateBody />
    </AdminUiProvider>
  );
}

function GateBody() {
  const { user, setUser } = useAuth();
  const { theme } = useAdminUi();

  // Clear the flag locally the moment enrolment succeeds. The stored user is
  // the source of truth until the next sign-in, so it has to be updated in both
  // places or a refresh would put the wall straight back up.
  const onEnabled = useCallback(() => {
    const patch = { mfaSetupRequired: false, twoFactorEnabled: true };
    // Both stores, or a refresh puts the wall straight back up: localStorage is
    // the source of truth across page loads, context is the one for this one.
    const stored = AuthService.updateStoredUser(patch);
    setUser(stored || { ...(user || {}), ...patch });
  }, [user, setUser]);

  return (
    <div
      data-admin-theme={theme}
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ backgroundColor: "var(--tenant-bg, #FAF7F2)" }}
    >
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <span
            className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full"
            style={{ backgroundColor: "var(--tenant-primary, #2C2418)", color: "#fff" }}
          >
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Two-factor is required for your account
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-white/60">
            Set up an authenticator app to finish signing in. You only do this once — after that
            you&rsquo;ll enter a six-digit code alongside your password.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          {/* No intro of its own — the header above already says all of it,
              and its default blurb is written for platform operators. */}
          <MfaEnrollPanel onEnabled={onEnabled} showIntro={false} />
        </div>

        {/* A way out that is not "clear your site data". Someone who cannot
            complete this needs to be able to leave and call their admin. */}
        <button
          type="button"
          onClick={() => {
            AuthService.logout();
            // Hard navigation, not a route change: every module-level service
            // cache in this app survives a client-side logout, and the next
            // person to sign in on this page load must not inherit them.
            window.location.assign("/admin/login");
          }}
          className="mx-auto mt-5 flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-white/80"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out instead
        </button>
      </div>
    </div>
  );
}
