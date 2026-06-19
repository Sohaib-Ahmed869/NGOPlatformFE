import { useEffect } from "react";
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
 * tenant admin. The token never touches the query string or the server.
 */
export default function SupportHandoff() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("token");
    const claims = token ? decodeJwt(token) : null;

    if (!token || !claims || !claims.support_session) {
      navigate("/", { replace: true });
      return;
    }

    const role = claims.role || "admin";
    const user = {
      _id: claims.id,
      name: claims.name,
      email: claims.email,
      role,
      token,
      isAdmin: role.includes("admin"),
      support_session: true,
      support_mode: claims.mode || "admin",
      support_access: claims.access || "full",
      impersonatedBy: claims.impersonatedBy,
      orgId: claims.orgId,
      slug: claims.slug,
      sessionId: claims.sessionId,
    };

    const prefix = getStoragePrefix();
    localStorage.setItem(prefix + "token", token);
    localStorage.setItem(prefix + "user", JSON.stringify(user));
    setUser(user);

    // Strip the token from the URL, then enter the chosen surface: the public
    // website (impersonating the reported user) or the tenant admin portal.
    window.history.replaceState(null, "", "/support-handoff");
    navigate(claims.mode === "website" ? "/" : "/admin/dashboard", { replace: true });
  }, [navigate, setUser]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif" }}>
      <p style={{ color: "#64748b" }}>Starting support session…</p>
    </div>
  );
}
