import { MessageCircle, HandHeart, KeyRound, Wrench, ThumbsUp, HelpCircle } from "lucide-react";

/**
 * Single source of truth for support-ticket categories.
 *
 * - PUBLIC_SUPPORT_CATEGORIES: the donor/visitor-facing options shown on the
 *   public support form (a friendly subset, with icons).
 * - SUPPORT_CATEGORY_LABELS: friendly labels for EVERY backend enum value, so
 *   the operator/admin views read clearly and match what the submitter picked.
 * - ADMIN_SUPPORT_CATEGORIES: {value,label} options for the admin dropdowns.
 *
 * Values must stay in sync with the SupportTicket.category enum on the backend.
 */

// Donor/visitor-facing categories (public support form).
export const PUBLIC_SUPPORT_CATEGORIES = [
  { value: "general", label: "General enquiry", icon: MessageCircle },
  { value: "billing", label: "Donations & receipts", icon: HandHeart },
  { value: "account", label: "Account & login", icon: KeyRound },
  { value: "technical", label: "Website issue", icon: Wrench },
  { value: "feedback", label: "Feedback", icon: ThumbsUp },
  { value: "other", label: "Other", icon: HelpCircle },
];

// Friendly label for every category enum value (shared form labels + the
// operator-only ones used when staff classify a ticket).
export const SUPPORT_CATEGORY_LABELS = {
  general: "General enquiry",
  billing: "Donations & receipts",
  account: "Account & login",
  technical: "Website issue",
  feedback: "Feedback",
  other: "Other",
  bug_report: "Bug report",
  feature_request: "Feature request",
  access: "Access",
  data: "Data",
};

// Resolve a category value to its friendly label (humanises unknown values).
export const supportCategoryLabel = (value) =>
  SUPPORT_CATEGORY_LABELS[value] || (value ? String(value).replace(/_/g, " ") : "—");

// Options for the admin category dropdowns — full enum, friendly labels.
export const ADMIN_SUPPORT_CATEGORIES = Object.keys(SUPPORT_CATEGORY_LABELS).map((value) => ({
  value,
  label: SUPPORT_CATEGORY_LABELS[value],
}));
