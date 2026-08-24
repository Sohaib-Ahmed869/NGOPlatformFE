/**
 * Frontend mirror of NGOPlatformBE/config/platformRoles.js. Five roles, stable
 * and small enough that duplicating the table beats a shared package in a repo
 * with no FE/BE code sharing today. The backend is the real enforcement
 * boundary (403s on capability-gated routes) — this only drives nav-hiding.
 */

export const ROLE_CAPABILITIES = {
  owner: ["tenants", "billing", "support", "ops"],
  admin: ["tenants", "billing", "support", "ops"],
  support: ["support"],
  billing: ["billing"],
  tenant_manager: ["tenants"],
};

export const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  support: "Support Agent",
  billing: "Billing Operator",
  tenant_manager: "Tenant Manager",
};

export const ROLE_DESCRIPTIONS = {
  owner: "Full platform access. The only role that can create, edit or remove other Owners.",
  admin: "Full platform access, same reach as Owner except managing Owner accounts.",
  support: "Support Tickets, Contact Queries, and support sessions — including impersonation.",
  billing: "Plans, Features, Coupons, Billing and Invoices.",
  tenant_manager: "Organisations, Branding Requests and Leads.",
};

export const ALL_ROLES = Object.keys(ROLE_CAPABILITIES);

export function hasCapability(platformRole, capability) {
  return (ROLE_CAPABILITIES[platformRole] || []).includes(capability);
}
