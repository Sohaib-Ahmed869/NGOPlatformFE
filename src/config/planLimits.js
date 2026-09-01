// Mirror of backend config/planLimits.js — used by TenantContext and PlanGate
const planLimits = {
  essentials: { campaigns: 3, volunteers: 0, volunteerEnabled: false },
  professional: { campaigns: 5, volunteers: 10, volunteerEnabled: true },
  enterprise: { campaigns: Infinity, volunteers: Infinity, volunteerEnabled: true },
};

// Pre-rename code for the entry tier, aliased BY REFERENCE (never a second
// literal, which would drift). Matches the backend alias in
// NGOPlatformBE/config/planLimits.js.
planLimits.basic = planLimits.essentials;

export default planLimits;
