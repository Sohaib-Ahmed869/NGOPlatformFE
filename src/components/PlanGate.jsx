import React from "react";
import { useTenant } from "../context/TenantContext";

const planHierarchy = { basic: 1, professional: 2, enterprise: 3 };

/**
 * Plan-aware feature guard component.
 *
 * Usage:
 *   <PlanGate feature="volunteerEnabled">
 *     <VolunteersTab />
 *   </PlanGate>
 *
 *   <PlanGate feature="campaigns" current={campaignCount}>
 *     <CreateCampaignButton />
 *   </PlanGate>
 */
export default function PlanGate({ feature, current, children, fallback }) {
  const { plan, limits } = useTenant();

  // If no tenant context (e.g., public mode), don't render
  if (!plan || !limits) {
    return fallback || null;
  }

  const limitValue = limits[feature];

  // Boolean feature check (e.g., volunteerEnabled)
  if (typeof limitValue === "boolean") {
    if (!limitValue) {
      return fallback || <UpgradePrompt feature={feature} plan={plan} />;
    }
    return children;
  }

  // Numeric limit check (e.g., campaigns: 3)
  if (typeof limitValue === "number" && current !== undefined) {
    if (limitValue !== Infinity && current >= limitValue) {
      return (
        fallback || (
          <UpgradePrompt feature={feature} plan={plan} limit={limitValue} />
        )
      );
    }
    return children;
  }

  // No limit defined for this feature, render children
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
