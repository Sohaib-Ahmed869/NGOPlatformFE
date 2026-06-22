import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getStoragePrefix } from "../services/axios";

// Decode a JWT payload (base64url) without verifying — we only read the public
// claims the backend put there to build the local session object.
function decodeJwt(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(part))));
  } catch {
    return null;
  }
}

/**
 * Receives a platform-support impersonation token via the URL hash (after the
 * operator clicks "Open as support" on the SuperAdmin console, which redirects
 * here on the tenant subdomain). Stores it as the tenant session and enters the
 * chosen surface. The token never touches the query string or the server.
 */
export default function SupportHandoff() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  // Run the handoff EXACTLY once. React 18 StrictMode (dev) invokes effects
  // twice (setup → cleanup → setup); without this guard the second invocation
  // re-reads a URL whose token has already been consumed, falls into the
  // "no token" branch and bounces to "/" — which is why "Open as support" was
  // landing on the tenant public homepage instead of the chosen surface.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("token");
    const claims = token ? decodeJwt(token) : null;

    if (!token || !claims || !claims.support_session) {
      navigate("/", { replace: true });
      return;
    }

    const mode = claims.mode || "admin";
    const access = claims.access || "full";

    // Routing rule: the chosen SURFACE decides where we land — an "admin" session
    // always enters the tenant admin portal (/admin/dashboard) as the org admin,
    // and a "website" session browses the public site as the impersonated user.
    // Access level (full vs view-only) is orthogonal and enforced server-side:
    // a view-only admin can still load the portal (reads pass), and any write is
    // blocked with a 403 "view-only" toast (see middleware/supportSession.js) —
    // so view-only admins no longer get bounced to the public homepage.
    const goAdmin = mode === "admin";

    // For the admin portal the identity must satisfy the admin gate
    // (role.includes("admin")); website sessions keep the impersonated role.
    let role = claims.role || "admin";
    if (goAdmin && !role.includes("admin")) role = "admin";

    const user = {
      _id: claims.id,
      name: claims.name,
      email: claims.email,
      role,
      token,
      isAdmin: role.includes("admin"),
      support_session: true,
      support_mode: mode,
      support_access: access,
      impersonatedBy: claims.impersonatedBy,
      orgId: claims.orgId,
      organisationId: claims.orgId,
      slug: claims.slug,
      sessionId: claims.sessionId,
    };

    const prefix = getStoragePrefix();
    localStorage.setItem(prefix + "token", token);
    localStorage.setItem(prefix + "user", JSON.stringify(user));
    setUser(user);

    // Enter the chosen surface. navigate() routes to a clean path, dropping the
    // token-bearing hash from the URL — so no separate history cleanup is needed.
    navigate(goAdmin ? "/admin/dashboard" : "/", { replace: true });
  }, [navigate, setUser]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif" }}>
      <p style={{ color: "#64748b" }}>Starting support session…</p>
    </div>
  );
}
