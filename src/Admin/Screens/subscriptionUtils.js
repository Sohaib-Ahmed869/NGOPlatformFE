// Pure helpers + data shaping for the admin Subscriptions screens (list +
// detail). No JSX so the module stays Fast-Refresh-friendly; presentational
// primitives live alongside in subscriptionShared.jsx.

export const HEADER_GRADIENT =
  "linear-gradient(120deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))";

export const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

export const initials = (name) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

export const ENDED = ["cancelled", "canceled", "failed", "ended"];

// Monthly-equivalent factor per frequency, for an "estimated MRR" figure.
const FREQ_MONTHLY = {
  daily: 365 / 12,
  weekly: 52 / 12,
  fortnightly: 26 / 12,
  biweekly: 26 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
  annually: 1 / 12,
};
export const monthlyEquivalent = (amount, frequency) =>
  (amount || 0) * (FREQ_MONTHLY[(frequency || "monthly").toLowerCase()] || 1);

// Status palette mirrors the donor "My Subscriptions" screen so a plan reads
// identically wherever it shows up (admin list ↔ detail ↔ donor portal).
const STATUS_STYLE = {
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
  past_due: "bg-red-50 text-red-700",
  pending_cancellation: "bg-orange-50 text-orange-700",
  completed: "bg-blue-50 text-blue-700",
  cancelled: "bg-red-50 text-red-700",
  failed: "bg-red-50 text-red-700",
  ended: "bg-gray-100 text-gray-600",
  // Per-charge (history) statuses
  succeeded: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  upcoming: "bg-gray-100 text-gray-500",
};
export const statusStyle = (s) => STATUS_STYLE[(s || "").toLowerCase()] || "bg-gray-100 text-gray-600";
export const statusLabel = (s) =>
  (s || "").toLowerCase() === "pending_cancellation"
    ? "Cancellation pending"
    : (s || "")
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ") || "Active";

// Per-frequency chip colour, so each plan's cadence is scannable at a glance.
const FREQUENCY_STYLE = {
  daily: "bg-emerald-50 text-emerald-600",
  weekly: "bg-violet-50 text-violet-600",
  fortnightly: "bg-sky-50 text-sky-600",
  biweekly: "bg-sky-50 text-sky-600",
  monthly: "bg-pink-50 text-pink-600",
  quarterly: "bg-indigo-50 text-indigo-600",
  yearly: "bg-amber-50 text-amber-600",
  annually: "bg-amber-50 text-amber-600",
};
export const frequencyStyle = (f) => FREQUENCY_STYLE[(f || "monthly").toLowerCase()] || "bg-gray-100 text-gray-600";
export const frequencyLabel = (f) => {
  const s = (f || "monthly").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const SUCCEEDED = ["succeeded", "completed", "paid"];

// Map a list-projection row (admin /subscriptions aggregate) → card shape.
export const mapSubscriptionListItem = (s) => ({
  id: s.id || s._id,
  donationId: s.donationId,
  donor: s.donorName || "Anonymous",
  email: s.donorEmail || "—",
  amount: s.amount || s.totalAmount || 0,
  frequency: s.frequency || "monthly",
  status: s.status || s.paymentStatus,
  startDate: s.startDate,
  nextBilling: s.nextBilling || null,
  paymentMethod: s.paymentMethod || "Card",
});

// Map a full subscription order (admin detail endpoint) → detail shape.
export const mapSubscriptionDoc = (o) => {
  const r = o.recurringDetails || {};
  const history = Array.isArray(r.paymentHistory) ? r.paymentHistory : [];
  const collected = history
    .filter((h) => SUCCEEDED.includes((h.status || "").toLowerCase()))
    .reduce((sum, h) => sum + (h.amount || 0), 0);
  const succeededCount = history.filter((h) => SUCCEEDED.includes((h.status || "").toLowerCase())).length;
  return {
    id: o._id,
    donationId: o.donationId,
    donor: o.donorDetails?.name || o.user?.name || "Anonymous",
    email: o.donorDetails?.email || o.user?.email || "—",
    phone: o.donorDetails?.phone || o.user?.phone || null,
    amount: r.amount || o.totalAmount || 0,
    frequency: r.frequency || "monthly",
    status: o.paymentStatus,
    startDate: r.startDate || o.createdAt,
    endDate: r.endDate || null,
    nextPayment: r.nextPaymentDate || null,
    totalPayments: r.totalPayments || succeededCount,
    collected: collected || (r.totalPayments || succeededCount) * (r.amount || 0),
    paymentMethod: o.paymentMethod || "Card",
    cause: o.items && o.items.length > 0 ? (o.items.length === 1 ? o.items[0].title : `${o.items.length} items`) : "—",
    cancellationReason: o.cancellationDetails?.reason || o.cancellationReason || null,
    cancellationDate: o.cancellationDetails?.date || o.cancellationDate || null,
    history,
    receiptUrl: o.stripeReceiptUrl || o.receiptUrl || null,
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;
const FREQ_DAYS = {
  daily: 1,
  weekly: 7,
  fortnightly: 14,
  biweekly: 14,
  monthly: 30,
  quarterly: 91,
  yearly: 365,
  annually: 365,
};

// Step a date forward by one interval, preserving day-of-month for monthly+
// cadences (15 Jun → 15 Jul, not 14 Jul).
const addOneInterval = (date, intervalDays) => {
  const d = new Date(date);
  if (intervalDays >= 27 && intervalDays <= 31) d.setMonth(d.getMonth() + 1);
  else if (intervalDays >= 88 && intervalDays <= 93) d.setMonth(d.getMonth() + 3);
  else if (intervalDays >= 360 && intervalDays <= 370) d.setFullYear(d.getFullYear() + 1);
  else return new Date(d.getTime() + intervalDays * DAY_MS);
  return d;
};

// Build the payment timeline: every past charge from history, plus a single
// projected "upcoming" row for the next scheduled payment when still active.
export const buildPaymentHistory = (item) => {
  const history = item.history || [];
  const rows = history
    .slice()
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
    .map((h, i) => {
      const isPaid = SUCCEEDED.includes((h.status || "").toLowerCase());
      return {
        n: i + 1,
        date: h.date || null,
        projected: false,
        amount: h.amount ?? item.amount,
        status: h.status || "succeeded",
        // Per-charge receipt if present, else fall back to the plan's
        // order-level receipt for the very first (initial) charge.
        receiptUrl: h.receiptUrl || (i === 0 && isPaid ? item.receiptUrl : null) || null,
        failureReason: h.failureReason || null,
      };
    });

  const active = !ENDED.includes((item.status || "").toLowerCase());
  if (active) {
    const dated = rows.map((r) => (r.date ? new Date(r.date).getTime() : 0)).filter(Boolean);
    const lastChargeTime = dated.length ? Math.max(...dated) : null;
    const intervalDays = FREQ_DAYS[(item.frequency || "monthly").toLowerCase()] || 30;
    let nextDate = item.nextPayment ? new Date(item.nextPayment) : null;
    // Ignore a stale next-payment date (not after the last charge) — project the
    // next charge from the last one + one interval instead.
    if (!nextDate || (lastChargeTime && nextDate.getTime() <= lastChargeTime)) {
      if (lastChargeTime) nextDate = addOneInterval(new Date(lastChargeTime), intervalDays);
      else if (item.startDate) nextDate = new Date(item.startDate);
      else nextDate = null;
    }
    if (nextDate) {
      rows.push({
        n: rows.length + 1,
        date: nextDate,
        projected: true,
        amount: item.amount,
        status: "upcoming",
        receiptUrl: null,
        failureReason: null,
      });
    }
  }
  return rows;
};
