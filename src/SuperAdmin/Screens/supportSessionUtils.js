/**
 * Shared vocabulary for the two support-session screens (the list and one
 * session's detail).
 *
 * The important idea in here is `effectiveStatus`. A session's stored status is
 * only ever moved by something *happening* — the operator ending it, another
 * operator revoking it, or the server's sweep retiring it. None of those fire
 * while the row simply sits on screen past its expiry, so a stored "active" is
 * a claim about the past, not the present. Every surface that shows a status,
 * a colour, or a Revoke button asks this function instead, so nothing on the
 * kill-switch screen ever offers to kill a session that already lapsed.
 */

/** Status vocabulary — one entry per lifecycle state on the model. */
export const STATUS = {
  active: {
    label: "Active",
    color: "#10b981",
    dot: "#10b981",
    pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  },
  ended: {
    label: "Ended",
    color: "#6b7280",
    dot: "#9ca3af",
    pill: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  },
  revoked: {
    label: "Revoked",
    color: "#ef4444",
    dot: "#ef4444",
    pill: "bg-red-50 text-red-700 ring-1 ring-red-200",
  },
  expired: {
    label: "Expired",
    color: "#f59e0b",
    dot: "#f59e0b",
    pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  },
};
const UNKNOWN_STATUS = { label: "Unknown", color: "#6b7280", dot: "#9ca3af", pill: "bg-gray-100 text-gray-500 ring-1 ring-gray-200" };
export const statusMeta = (s) => STATUS[s] || UNKNOWN_STATUS;

export const STATUS_VALUES = ["all", ...Object.keys(STATUS)];
export const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...Object.entries(STATUS).map(([value, m]) => ({ value, label: m.label })),
];

/**
 * What this session IS, right now — not what the last write to it said.
 * `now` is server-anchored time (see `useServerClock`).
 */
export function effectiveStatus(session, now = Date.now()) {
  if (!session) return "ended";
  if (session.status !== "active") return session.status;
  const expiry = session.expiresAt ? new Date(session.expiresAt).getTime() : 0;
  return expiry && expiry <= now ? "expired" : "active";
}

export const isLive = (session, now) => effectiveStatus(session, now) === "active";

/* ── time ────────────────────────────────────────────────────────────────── */

export const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");
export const fmtShort = (d) =>
  d ? new Date(d).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
export const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—";

export function timeAgo(d, now = Date.now()) {
  if (!d) return "—";
  const s = Math.floor((now - new Date(d).getTime()) / 1000);
  if (s < 0) return "just now";
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** "42m 08s" / "1h 12m" — the countdown on a live session. Null once it lapses. */
export function countdown(until, now = Date.now()) {
  if (!until) return null;
  const ms = new Date(until).getTime() - now;
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/** How long the session ran (or has been running). */
export function duration(from, to, now = Date.now()) {
  if (!from) return "—";
  const ms = (to ? new Date(to).getTime() : now) - new Date(from).getTime();
  if (ms < 0) return "—";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m`;
  return `${total}s`;
}

/* ── surface ─────────────────────────────────────────────────────────────── */

export const SURFACE = {
  website: { label: "Public website", key: "website" },
  admin: { label: "Admin portal", key: "admin" },
};
export const surfaceLabel = (mode) => (mode === "website" ? SURFACE.website.label : SURFACE.admin.label);

/* ── display ─────────────────────────────────────────────────────────────── */

export const tenantName = (s) => s?.organisationId?.name || s?.orgSlug || "—";
/** Tinted gradient for the tenant initial badge, built from the status colour. */
export const avatarGradient = (c) => `linear-gradient(135deg, ${c}, ${c}b3)`;
export const accessLabel = (a) => (a === "view_only" ? "View-only" : "Full access");
