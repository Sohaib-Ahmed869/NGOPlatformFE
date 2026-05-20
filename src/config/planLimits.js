// Mirror of backend config/planLimits.js — used by TenantContext and PlanGate
const planLimits = {
  basic: { campaigns: 3, volunteers: 0, volunteerEnabled: false },
  professional: { campaigns: 5, volunteers: 10, volunteerEnabled: true },
  enterprise: { campaigns: Infinity, volunteers: Infinity, volunteerEnabled: true },
};

export default planLimits;
