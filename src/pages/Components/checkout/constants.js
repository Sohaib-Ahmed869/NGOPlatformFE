import {
  Coins,
  Repeat,
  CalendarDays,
  CreditCard,
  Landmark,
} from "lucide-react";

/* ── shared styling tokens (squared, warm brand palette) ── */
export const labelCls =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted";
export const inputCls =
  "w-full border-token border-gray-200 bg-white rounded-token-input px-3.5 py-2.5 text-sm text-primary outline-none transition-all placeholder:text-text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/15";
// Shared trigger chrome so CustomSelect matches the square inputs above.
export const selectTrigger = "border-token border-gray-200 bg-white rounded-token-input px-3.5 py-2.5 text-sm";

// Contact-form "Hope" field style: clean label + underline-only input (no box,
// accent on focus). Used by the donor-details step.
export const fieldLabel = "mb-1.5 block text-sm font-medium text-gray-700";
const UNDERLINE_BASE =
  "w-full border-b bg-transparent py-2.5 text-sm text-primary outline-none transition-colors placeholder:text-gray-400";
export const underlineInput = (hasError) =>
  `${UNDERLINE_BASE} ${hasError ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-accent"}`;

// Warm card shell with a soft layered shadow (replaces the cold gray boxes).
export const cardShell =
  "border-token border-gray-200 bg-white rounded-token shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-16px_rgba(15,23,42,0.12)]";
// Base chrome for selectable tiles; pair with tileState(active) for the look.
export const tileBase =
  "group relative overflow-hidden border rounded-token-btn text-left transition-all duration-200";

// Tenant-adaptive primary button: gradient fill + a glow derived from the
// accent var (so a blue tenant glows blue, a gold tenant glows gold). The glow
// itself lives in index.css (.checkout-btn-glow). Callers add padding/sizing.
export const accentBtn =
  "checkout-btn-glow rounded-token-btn inline-flex items-center justify-center gap-2 bg-gradient-to-br from-accent to-accent-light font-semibold text-white transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:translate-y-0 disabled:opacity-50";

// Small accent-coloured glow for active icon chips / stepper bullets.
export const accentGlow = "checkout-glow-sm";

export const CARD_BRAND_LABEL = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

export const STEPS = [
  { n: 1, label: "Donation" },
  { n: 2, label: "Your details" },
  { n: 3, label: "Payment" },
];

export const PAYMENT_TYPES = [
  { id: "single", label: "One-time", desc: "A single gift today", icon: Coins },
  { id: "recurring", label: "Recurring", desc: "Give on a schedule", icon: Repeat },
  { id: "installments", label: "Installments", desc: "Split the total", icon: CalendarDays },
];

export const PAYMENT_METHODS = [
  { id: "visa", label: "Credit / Debit Card", desc: "Visa, Mastercard & more", icon: CreditCard },
  { id: "bank", label: "Bank Transfer", desc: "Pay by direct transfer", icon: Landmark },
];

const AU_STATES = [
  ["NSW", "New South Wales (NSW)"], ["VIC", "Victoria (VIC)"], ["QLD", "Queensland (QLD)"],
  ["WA", "Western Australia (WA)"], ["SA", "South Australia (SA)"], ["TAS", "Tasmania (TAS)"],
  ["ACT", "Australian Capital Territory (ACT)"], ["NT", "Northern Territory (NT)"],
];
export const STATE_OPTIONS = AU_STATES.map(([value, label]) => ({ value, label }));

export const FREQ_OPTIONS = [
  { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" }, { value: "yearly", label: "Yearly" },
];

export const BILLING_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  value: i + 1,
  label: String(i + 1),
}));
