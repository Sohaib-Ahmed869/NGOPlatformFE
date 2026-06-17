import { CARD_BRAND_LABEL, accentGlow } from "./constants";

export const money = (n) => Number(n || 0).toFixed(2);

// Selected / idle treatment for a selectable tile: gold glow when active, a
// gentle lift + warm shadow on hover otherwise.
export const tileState = (active) =>
  active
    ? `border-accent bg-accent/[0.07] ${accentGlow}`
    : "border-gray-200 hover:border-accent/60 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(15,23,42,0.22)]";

// Soft accent gradient that fades in on hover — drop inside a `group` tile.
export const TILE_GLOW =
  "pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100";

export const cardBrandLabel = (b) => CARD_BRAND_LABEL[(b || "").toLowerCase()] || "Card";

const STEP_BY = {
  daily: (d) => d.setDate(d.getDate() + 1),
  weekly: (d) => d.setDate(d.getDate() + 7),
  monthly: (d) => d.setMonth(d.getMonth() + 1),
  yearly: (d) => d.setFullYear(d.getFullYear() + 1),
};
// Parse "YYYY-MM-DD" as a LOCAL date (a bare new Date("YYYY-MM-DD") is UTC,
// which shifts the day by one in negative-offset time zones).
const toLocalDate = (v) => {
  if (v instanceof Date) return new Date(v);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(v);
};
const dayKey = (d) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

// Number of full charges on/before the end date, stepping the billing cadence
// from the start. Matches the backend's cancel-on-boundary logic, so the
// preview equals what Stripe actually bills — no off-by-one, no partial charge.
export const calculateTotalPayments = (startDate, endDate, frequency) => {
  const step = STEP_BY[frequency];
  const start = toLocalDate(startDate);
  const end = toLocalDate(endDate);
  if (!step || isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const endKey = dayKey(end);
  const cursor = new Date(start);
  let count = 0;
  let guard = 0;
  while (dayKey(cursor) <= endKey && guard++ < 100000) {
    count += 1;
    step(cursor);
  }
  return count;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared donor-field validation used by the details step and profile save.
export const validateDonor = (formData) => {
  const errors = {};
  if (!formData.name) errors.name = "Name is required";
  if (!formData.phone) errors.phone = "Phone is required";
  if (!formData.email) errors.email = "Email is required";
  else if (!EMAIL_RE.test(formData.email)) errors.email = "Please enter a valid email";
  return errors;
};

// Assembles the createOrder payload from the current checkout selections.
export const buildOrderData = ({
  items,
  total,
  paymentType,
  adminCostPercentage,
  formData,
  onBehalfOf,
  selectedDonationType,
  selectedPaymentMethod,
  recurringFrequency,
  recurringAmount,
  recurringEndDate,
  totalRecurringPayments,
  billingDay,
  hasRamadanRecurringItems,
  installmentMonths,
  stripePaymentMethod,
  savedCustomerId,
  selectedSavedCardId,
}) => {
  const adminContribution = (total * adminCostPercentage) / 100;
  const grandTotal = total + adminContribution;
  const isCard = selectedPaymentMethod === "visa" || selectedPaymentMethod === "mastercard";

  const processedItems = items.map((item) => ({
    title: item.title,
    price: item.price,
    quantity: item.quantity || 1,
    onBehalfOf: onBehalfOf[item.id] || null,
    donationType: item.donationType || "Sadaqah",
    ...(item.programId && { programId: item.programId }),
    ...(item.source && { source: item.source }),
    ...(item.isRecurring && { isRecurring: true }),
    ...(item.recurringDetails && { recurringDetails: item.recurringDetails }),
  }));

  return {
    items: processedItems,
    paymentType,
    adminCostContribution: adminContribution,
    donorDetails: {
      name: formData.name, phone: formData.phone, email: formData.email,
      streetAddress: formData.streetAddress, townCity: formData.townCity, state: formData.state, postcode: formData.postcode,
      agreeToMessages: formData.agreeToMessages, rememberDetails: formData.rememberDetails,
    },
    donationType: selectedDonationType,
    paymentMethod: selectedPaymentMethod,
    totalAmount: grandTotal,
    ...(paymentType === "recurring" && {
      recurringDetails: {
        frequency: recurringFrequency, amount: recurringAmount, endDate: recurringEndDate,
        totalPayments: totalRecurringPayments, billingDay,
        ...(hasRamadanRecurringItems && { source: "ramadan" }),
      },
    }),
    ...(paymentType === "installments" && {
      installmentDetails: {
        numberOfInstallments: installmentMonths,
        installmentAmount: grandTotal / installmentMonths,
      },
    }),
    ...(isCard && {
      stripePaymentMethodId: stripePaymentMethod.id,
      // Present only for a SAVED card (its PM is attached to this customer);
      // the backend then charges with { customer, payment_method }.
      ...(paymentType === "single" && savedCustomerId && selectedSavedCardId !== "new"
        ? { stripeCustomerId: savedCustomerId }
        : {}),
    }),
  };
};
