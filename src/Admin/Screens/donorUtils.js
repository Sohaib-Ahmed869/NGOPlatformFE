// Pure helpers + data shaping for the admin Donors screens (list + detail).
// No JSX so the module stays Fast-Refresh-friendly; presentational primitives
// live alongside in donorShared.jsx.

export const HEADER_GRADIENT =
  "linear-gradient(120deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))";

export const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
export const moneyShort = (n) => {
  const v = Number(n || 0);
  if (v >= 1000) return `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(v)}`;
};
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
export const fmtShort = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—");

export const initials = (name) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

// Per donation-type chip styling (donor's predominant type).
export const TYPE_LABEL = { "one-time": "One-time", recurring: "Recurring", installments: "Installments" };
export const TYPE_CHIP = {
  "one-time": "bg-emerald-50 text-emerald-600",
  recurring: "bg-violet-50 text-violet-600",
  installments: "bg-amber-50 text-amber-600",
};

// Map a donors-list API payload → the shape the list UI expects.
export const mapDonors = (data) =>
  (data?.data?.donors || []).map((donor) => ({
    ...donor,
    id: donor._id,
    totalDonated: donor.totalPaid,
    lastDonationDate: donor.lastDonationDate || donor.lastDonation,
  }));

// Map the donor dashboard-stats payload → the KPI shape.
export const mapStats = (data) => ({
  totalDonors: data?.data?.stats?.totalDonors || 0,
  totalAmount: data?.data?.stats?.totalDonations || 0,
  averageDonation: data?.data?.stats?.averageDonation || 0,
  recurringDonations: data?.data?.stats?.recurringDonations || 0,
});
