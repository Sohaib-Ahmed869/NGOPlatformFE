// Pure helpers + data shaping for the admin Donations screens (list + detail).
// No JSX so the module stays Fast-Refresh-friendly; presentational primitives
// live alongside in donationShared.jsx.

export const HEADER_GRADIENT =
  "linear-gradient(120deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))";

export const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

export const initials = (name) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

export const formatAddress = (address) => {
  if (!address) return "—";
  const parts = [address.street, address.city, address.state, address.postcode].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
};

export const SUCCESSFUL = ["completed", "active", "ended"];

const STATUS_STYLE = {
  completed: "bg-emerald-50 text-emerald-700",
  succeeded: "bg-emerald-50 text-emerald-700",
  active: "bg-emerald-50 text-emerald-700",
  ended: "bg-gray-100 text-gray-600",
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  pending_cancellation: "bg-orange-50 text-orange-700",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-red-50 text-red-700",
};
export const statusStyle = (s) => STATUS_STYLE[(s || "").toLowerCase()] || "bg-gray-100 text-gray-600";
export const statusLabel = (s) =>
  (s || "").toLowerCase() === "pending_cancellation"
    ? "Cancellation pending"
    : (s || "")
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ") || "Pending";

// Donation category (drives the type chip / filter / donut).
export const categoryOf = (donation) =>
  donation.installmentDetails
    ? "installments"
    : donation.paymentType === "recurring"
      ? "recurring"
      : "one-time";

export const TYPE_LABEL = { "one-time": "One-time", recurring: "Recurring", installments: "Installments" };
export const TYPE_COLOR = { "one-time": "#10B981", recurring: "#818CF8", installments: "#FB923C" };
export const TYPE_CHIP = {
  "one-time": "bg-emerald-50 text-emerald-600",
  recurring: "bg-violet-50 text-violet-600",
  installments: "bg-amber-50 text-amber-600",
};

// Map a raw donation record → the shape the list renders. Keeps the raw fields
// the receipt / status handlers rely on (paymentType, donorDetails…).
export const mapDonationRow = (d) => ({
  id: d._id,
  _id: d._id,
  donationId: d.donationId,
  donor: d.donorDetails?.name || "Anonymous",
  email: d.donorDetails?.email || "—",
  amount: d.totalAmount,
  cause: d.items && d.items.length > 0 ? (d.items.length === 1 ? d.items[0].title : `${d.items.length} items`) : "—",
  category: categoryOf(d),
  type: d.paymentType,
  paymentType: d.paymentType,
  paymentMethod: d.paymentMethod || "—",
  date: d.createdAt,
  status: d.paymentStatus,
  paymentStatus: d.paymentStatus,
  recurringDetails: d.recurringDetails,
  installmentDetails: d.installmentDetails,
  adminCostContribution: d.adminCostContribution,
  items: d.items || [],
  donorDetails: d.donorDetails,
  totalAmount: d.totalAmount,
  createdAt: d.createdAt,
  cancelReason: d.cancellationDetails?.reason || d.cancellationReason || null,
  receiptUrl: d.receiptUrl || null,
});

export const computeStats = (rows) => {
  const successful = rows.filter((r) => SUCCESSFUL.includes((r.status || "").toLowerCase()));
  const totalAmount = successful.reduce((s, r) => s + (r.amount || 0), 0);
  return {
    totalAmount,
    total: rows.length,
    avg: successful.length ? totalAmount / successful.length : 0,
    recurring: rows.filter((r) => r.category === "recurring").length,
  };
};
