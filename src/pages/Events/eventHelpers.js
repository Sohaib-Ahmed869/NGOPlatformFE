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
