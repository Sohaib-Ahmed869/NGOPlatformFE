// Pure helpers + data shaping for the admin Installments screens (list + detail).
// No JSX here so the module stays Fast-Refresh-friendly; presentational
// primitives live alongside in installmentShared.jsx.

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

// Status palette mirrors the donor "My Subscriptions" screen so the same plan
// reads identically wherever it shows up (admin list ↔ detail ↔ donor portal).
const STATUS_STYLE = {
  active: "bg-emerald-50 text-emerald-700",
  completed: "bg-blue-50 text-blue-700",
  pending: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-red-50 text-red-700",
  ended: "bg-gray-100 text-gray-600",
  // Per-installment (schedule) statuses
  paid: "bg-emerald-50 text-emerald-700",
  succeeded: "bg-emerald-50 text-emerald-700",
  upcoming: "bg-gray-100 text-gray-500",
};
export const statusStyle = (s) => STATUS_STYLE[(s || "").toLowerCase()] || "bg-gray-100 text-gray-600";
export const statusLabel = (s) =>
  (s || "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ") || "Pending";

const PAID_STATUSES = ["completed", "paid", "succeeded"];

// Map a single raw donation document → the shape the screens render.
export const mapInstallmentDoc = (d) => {
  const det = d.installmentDetails || {};
  const total = det.numberOfInstallments || 0;
  const paid = det.installmentsPaid || 0;
  // Derive a "completed" status when every installment is paid (mirrors the
  // donor portal) so fully-paid plans don't masquerade as still "active".
  const complete = total > 0 && paid >= total && !ENDED.includes(d.paymentStatus);
  const installmentAmount = det.installmentAmount || (total ? d.totalAmount / total : d.totalAmount);
  const history = Array.isArray(det.installmentHistory) ? det.installmentHistory : [];
  const collectedFromHistory = history
    .filter((h) => PAID_STATUSES.includes((h.status || "").toLowerCase()))
    .reduce((s, h) => s + (h.amount || 0), 0);
  return {
    id: d._id,
    donationId: d.donationId,
    donor: d.donorDetails?.name || "Anonymous",
    email: d.donorDetails?.email || "—",
    amount: d.totalAmount,
    installmentAmount,
    // Amount actually collected so far: backend tally if present, else the sum
    // of completed history, else a paid × per-installment estimate.
    collected:
      typeof d.actualAmount === "number"
        ? d.actualAmount
        : history.length
          ? collectedFromHistory
          : paid * installmentAmount,
    cause:
      d.items && d.items.length > 0
        ? d.items.length === 1
          ? d.items[0].title
          : `${d.items.length} items`
        : "—",
    date: d.createdAt,
    startDate: det.startDate || d.createdAt,
    nextPayment: det.nextInstallmentDate || null,
    intervalDays: det.paymentIntervalDays || 0,
    paymentMethod: d.paymentMethod || "Card",
    status: complete ? "completed" : d.paymentStatus,
    paid,
    total,
    history,
    receiptUrl: d.stripeReceiptUrl || d.receiptUrl || null,
  };
};

export const mapInstallments = (response) =>
  (response?.donations || []).filter((d) => d.paymentType === "installments").map(mapInstallmentDoc);

const DAY_MS = 24 * 60 * 60 * 1000;

// Step a date forward by `steps` intervals. For monthly/quarterly/yearly-ish
// intervals we add whole calendar months so the day-of-month is preserved
// (15 Jun → 15 Jul, not 14 Jul); otherwise we add raw days.
export const addInterval = (date, steps, intervalDays) => {
  const d = new Date(date);
  if (steps === 0) return d;
  if (intervalDays >= 27 && intervalDays <= 31) d.setMonth(d.getMonth() + steps);
  else if (intervalDays >= 88 && intervalDays <= 93) d.setMonth(d.getMonth() + steps * 3);
  else if (intervalDays >= 360 && intervalDays <= 370) d.setFullYear(d.getFullYear() + steps);
  else return new Date(d.getTime() + steps * intervalDays * DAY_MS);
  return d;
};

// Build the full plan timeline: each processed installment (from history) plus
// the still-upcoming ones with PROJECTED dates, so the whole schedule is
// visible. Upcoming dates step forward from the next due date by the plan
// interval (explicit `paymentIntervalDays`, else inferred from history gaps,
// else monthly). A stale `nextInstallmentDate` (one not after the last charge)
// is ignored — we project from the last charge + one interval instead.
export const buildSchedule = (item) => {
  const history = item.history || [];
  const byNum = {};
  history.forEach((h, i) => {
    byNum[h.installmentNumber || i + 1] = h;
  });
  const count = Math.max(item.total || 0, history.length);

  const datedTimes = history
    .map((h) => h.date)
    .filter(Boolean)
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b);
  const nextTime = item.nextPayment ? new Date(item.nextPayment).getTime() : null;
  const lastDatedTime = datedTimes.length ? datedTimes[datedTimes.length - 1] : null;

  // Interval between installments (days).
  let intervalDays = item.intervalDays || 0;
  if (!intervalDays && datedTimes.length >= 2) {
    let sum = 0;
    for (let i = 1; i < datedTimes.length; i++) sum += datedTimes[i] - datedTimes[i - 1];
    intervalDays = Math.round(sum / (datedTimes.length - 1) / DAY_MS);
  }
  // Only infer from next-vs-last when next is genuinely AFTER the last charge.
  if (!intervalDays && nextTime && lastDatedTime && nextTime > lastDatedTime) {
    intervalDays = Math.round((nextTime - lastDatedTime) / DAY_MS);
  }
  if (!intervalDays || intervalDays < 1) intervalDays = 30; // sensible monthly default

  // Date of the first upcoming installment (number history.length + 1):
  //  • the plan's nextInstallmentDate, but only if it's after the last charge;
  //  • else one interval past the last charge;
  //  • else the plan start date (nothing charged yet).
  const baseNum = history.length + 1;
  let baseDate = null;
  if (nextTime && (lastDatedTime == null || nextTime > lastDatedTime)) baseDate = new Date(nextTime);
  else if (lastDatedTime != null) baseDate = addInterval(new Date(lastDatedTime), 1, intervalDays);
  else if (item.startDate) baseDate = new Date(item.startDate);

  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const h = byNum[n];
    if (h && (h.date || h.status)) {
      const isPaid = PAID_STATUSES.includes((h.status || "").toLowerCase());
      return {
        n,
        date: h.date || null,
        projected: false,
        amount: h.amount ?? item.installmentAmount,
        status: h.status || "paid",
        // Per-charge receipt if present; else fall back to the plan's order-level
        // receipt for the very first installment (the initial charge).
        receiptUrl: h.receiptUrl || (n === 1 && isPaid ? item.receiptUrl : null) || null,
        failureReason: h.failureReason || null,
      };
    }
    return {
      n,
      date: baseDate ? addInterval(baseDate, n - baseNum, intervalDays) : null,
      projected: true,
      amount: item.installmentAmount,
      status: "upcoming",
      receiptUrl: null,
      failureReason: null,
    };
  });
};
