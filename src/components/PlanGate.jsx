import React from "react";
import { useTenant } from "../context/TenantContext";

// Legacy feature names → canonical config/featureCatalog keys.
const FEATURE_ALIASES = { volunteerEnabled: "volunteers" };

/**
 * Plan-aware feature guard component, driven by the server-resolved plan
 * entitlements (feature flags + metered limits, override already merged).
 *
 * Capability flag (boolean):
 *   <PlanGate feature="events"><EventsTab /></PlanGate>
 *
 * Metered limit (numeric — pass the current usage):
 *   <PlanGate feature="campaigns" current={campaignCount}>
 *     <CreateCampaignButton />
 *   </PlanGate>
 */
export default function PlanGate({ feature, current, children, fallback }) {
  const { plan, limits, hasFeature } = useTenant();
  const key = FEATURE_ALIASES[feature] || feature;

  // No tenant context (e.g. public marketing site) → render nothing by default.
  if (!plan) return fallback ?? null;

  // Numeric limit check (caller passed the current usage).
  if (current !== undefined) {
    const limitValue = limits ? limits[key] : undefined;
    const unlimited = limitValue === null || limitValue === undefined || limitValue === Infinity;
    if (!unlimited && current >= Number(limitValue)) {
      return fallback ?? <UpgradePrompt feature={key} plan={plan} limit={limitValue} />;
    }
    return children;
  }

  // Boolean capability check.
  if (!hasFeature(key)) {
    return fallback ?? <UpgradePrompt feature={key} plan={plan} />;
  }
  return children;
}

function UpgradePrompt({ feature, plan, limit }) {
  const nextPlan =
    plan === "basic"
      ? "Professional"
      : plan === "professional"
      ? "Enterprise"
      : null;

  return (
    <div className="bg-warm-cream border border-accent/20 rounded-xl p-6 text-center">
      <h3 className="text-lg font-heading font-semibold text-primary mb-2">
        Feature Not Available
      </h3>
      <p className="text-text-muted text-sm mb-4">
        {limit
          ? `You've reached the limit of ${limit} ${feature} on your current plan.`
          : `This feature is not available on your current plan.`}
        {nextPlan && ` Upgrade to ${nextPlan} to unlock it.`}
      </p>
      <a
        href="/plans"
        className="inline-block px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-light transition-colors"
      >
        View Plans
      </a>
    </div>
  );
}
