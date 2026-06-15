// Shared display helpers for the public Events listing + detail pages.

/* Human labels for the event taxonomy (mirrors the admin event constants). */
export const EVENT_TYPE_LABELS = {
  fundraiser: "Fundraiser",
  gala: "Gala / Dinner",
  community: "Community Program",
  awareness: "Awareness",
  volunteer: "Volunteer Drive",
  workshop: "Workshop",
  webinar: "Webinar",
  other: "Other",
};

// Inline SVG placeholder (never 404s) for missing or broken event images.
export const IMG_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect width='600' height='400' fill='%23f1f0ec'/%3E%3Cg transform='translate(270 176)' fill='none' stroke='%23b9b3a7' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='0' y='0' width='60' height='48' rx='6'/%3E%3Ccircle cx='17' cy='17' r='7'/%3E%3Cpath d='M4 44l18-16 12 11 9-8 13 13'/%3E%3C/g%3E%3C/svg%3E";

export const D = (d, opts) => new Date(d).toLocaleDateString("en-AU", opts);

export function fmtDateRange(start, end) {
  if (!start) return "";
  const s = new Date(start);
  const full = { weekday: "short", day: "numeric", month: "short", year: "numeric" };
  if (!end) return D(s, full);
  const e = new Date(end);
  if (s.toDateString() === e.toDateString()) return D(s, full);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) return `${s.getDate()}–${e.getDate()} ${D(e, { month: "short", year: "numeric" })}`;
  return `${D(s, { day: "numeric", month: "short" })} – ${D(e, { day: "numeric", month: "short", year: "numeric" })}`;
}

export const typeLabel = (ev) =>
  ev.eventType === "other" ? ev.eventTypeOther || "Event" : EVENT_TYPE_LABELS[ev.eventType] || "Event";

export const locationOf = (ev) => [ev.location?.venue, ev.location?.city].filter(Boolean).join(", ");
export const fullLocationOf = (ev) => [ev.location?.venue, ev.location?.city, ev.location?.address].filter(Boolean).join(", ");
export const timeOf = (ev) => (ev.startTime && ev.endTime ? `${ev.startTime} – ${ev.endTime}` : ev.startTime || "");
export const priceLabel = (ev) => (ev.isPaid ? `$${ev.price} ${ev.currency || ""}`.trim() : "Free");

// `YYYY-MM` key + label for the month filter.
export const monthKeyOf = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
};

/* ── Audience (per-tenant, configured in Organisation Settings) ──────────── */

// Neutral fallback for events with no audience or one that no longer exists.
export const DEFAULT_AUDIENCE = { key: "", label: "All welcome", color: "#9CA3AF" };

// Convert a #rrggbb hex to an rgba() string (used for the soft event tints).
export const hexToRgba = (hex, alpha = 1) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!m) return `rgba(156, 163, 175, ${alpha})`;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Resolve an event's audience to its {key,label,color}. Returns null when the
// event has no audience (so callers can choose to render nothing).
export const resolveAudience = (event, audiences = []) => {
  if (!event?.audience) return null;
  return audiences.find((a) => a.key === event.audience) || null;
};

/* ── Week-view calendar helpers (Monday-start weeks) ─────────────────────── */

export const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// Monday 00:00 of the week containing `d`.
export const startOfWeek = (d) => {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // 0 = Monday … 6 = Sunday
  x.setDate(x.getDate() - day);
  return x;
};

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const isSameDay = (a, b) =>
  new Date(a).toDateString() === new Date(b).toDateString();

export const weekDays = (weekStart) =>
  Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

// "15 – 21 Jun 2026" / "29 Jun – 5 Jul 2026" for the week header.
export const weekRangeLabel = (weekStart) => {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const sameYear = weekStart.getFullYear() === end.getFullYear();
  if (sameMonth && sameYear) {
    return `${weekStart.getDate()} – ${D(end, { day: "numeric", month: "short", year: "numeric" })}`;
  }
  if (sameYear) {
    return `${D(weekStart, { day: "numeric", month: "short" })} – ${D(end, { day: "numeric", month: "short", year: "numeric" })}`;
  }
  return `${D(weekStart, { day: "numeric", month: "short", year: "numeric" })} – ${D(end, { day: "numeric", month: "short", year: "numeric" })}`;
};

// Does an event (start → endDate, else start) overlap the given calendar day?
export const eventOnDay = (event, day) => {
  const start = startOfDay(event.date);
  const end = startOfDay(event.endDate || event.date);
  const d = startOfDay(day);
  return d >= start && d <= end;
};

// Free-text match across an event's title, description and location.
export const matchesQuery = (event, q) => {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [event.title, event.description, locationOf(event), typeLabel(event)]
    .filter(Boolean)
    .some((s) => s.toLowerCase().includes(needle));
};

// Strip markdown / decoration so the card preview reads cleanly.
export const plainPreview = (desc) =>
  (desc || "")
    .replace(/[#*_`>~]/g, "")
    .replace(/[✅♦📞💳•]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Modal/detail markdown pre-processing (kept from the original page).
export const processDescription = (desc) => (desc ? desc.replace(/(?!^)([✅♦])/g, "\n$1") : desc);
export const processHeadings = (desc) => {
  if (!desc) return desc;
  ["Event Details", "How to Participate:", "Donation Details:", "📞 Contact for Registration:", "💳 Bank Transfer:"].forEach((h) => {
    desc = desc.replace(new RegExp(`^(${h})$`, "gm"), "**$1**");
  });
  return desc;
};
