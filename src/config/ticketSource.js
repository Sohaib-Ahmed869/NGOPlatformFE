import { Building2, UserRound, Globe } from "lucide-react";

/**
 * Single source of truth for "who a support ticket is from", as seen by the
 * platform operator. Mirrors the SupportTicket `reporter.kind` enum on the
 * backend:
 *   admin    → the tenant itself (the NGO's own staff/admin)
 *   customer → a donor / end-user (customer) of that tenant
 *   public   → an anonymous public-form submission (no account)
 *
 * Used by the SuperAdmin Tickets list, TicketDetail and Kanban so the source
 * badge, colours and labels stay consistent everywhere.
 */
export const TICKET_SOURCES = {
  admin: {
    value: "admin",
    label: "Tenant",
    full: "Tenant team",
    description: "Opened by the organisation's own staff",
    icon: Building2,
    badge: "bg-indigo-50 text-indigo-700",
    dot: "#6366f1",
  },
  customer: {
    value: "customer",
    label: "Tenant customer",
    full: "Tenant customer",
    description: "Opened by a donor / end-user of the tenant",
    icon: UserRound,
    badge: "bg-teal-50 text-teal-700",
    dot: "#14b8a6",
  },
  public: {
    value: "public",
    label: "Public",
    full: "Public visitor",
    description: "Submitted via the public form (no account)",
    icon: Globe,
    badge: "bg-amber-50 text-amber-700",
    dot: "#f59e0b",
  },
};

/**
 * Resolve a ticket's reporter to one of the three source buckets.
 *
 * Falls back for tickets created before `reporter.kind` shipped — run
 * `npm run backfill:tickets` to persist an accurate value. Without it we can
 * only tell a logged-out submit ("public") from a known one; a known reporter's
 * admin-vs-customer split isn't recoverable on the client, so we assume
 * "customer" until the backfill resolves it from the linked user's role.
 */
export function ticketSourceKey(reporter) {
  const k = reporter?.kind;
  if (k && TICKET_SOURCES[k]) return k;
  return reporter?.isExternal ? "public" : "customer";
}

export function ticketSourceMeta(reporter) {
  return TICKET_SOURCES[ticketSourceKey(reporter)];
}

// Options for the operator "source" filter dropdown ("all" first).
export const TICKET_SOURCE_FILTER_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "admin", label: "Tenant" },
  { value: "customer", label: "Tenant customer" },
  { value: "public", label: "Public" },
];
