import { useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { useTenant } from "../context/TenantContext";

// Cache one Stripe.js instance per publishable key.
const promiseCache = {};

/**
 * Returns a loadStripe() promise for whichever Stripe account will actually
 * confirm THIS tenant's donations, used by the checkout <Elements> wrappers.
 *
 * The account is chosen on the server (services/tenantStripe.js) and delivered
 * as `organisation.payment.{publishableKey, source}` — the browser doesn't pick.
 * That matters because the server may process a donation through the tenant's
 * own account OR, when the operator allows it, through the platform account;
 * mounting Elements with a key from the other one fails at confirmation with an
 * error that points nowhere near the real cause. Letting one side decide and
 * the other follow makes that mismatch impossible.
 *
 * The env key is consulted only when the server said "platform" but had no
 * stored publishable key to give — i.e. the platform itself is running on
 * STRIPE_SECRET_KEY, so VITE_STRIPE_PUBLISHABLE_KEY is its matching half.
 */
export default function useTenantStripe() {
  const { organisation } = useTenant();
  const payment = organisation?.payment;

  const key = useMemo(() => {
    if (!payment) return "";
    // Pre-`source` payload (an older cached organisation): keep the previous
    // behaviour rather than dropping the checkout on a stale cache entry.
    if (payment.source === undefined) {
      return payment.publishableKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
    }
    if (payment.source === "none") return ""; // no account is permitted to charge
    if (payment.publishableKey) return payment.publishableKey;
    if (payment.source === "platform") return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
    return "";
  }, [payment]);

  return useMemo(() => {
    if (!key) return null;
    if (!promiseCache[key]) promiseCache[key] = loadStripe(key);
    return promiseCache[key];
  }, [key]);
}

/**
 * Which account is processing donations here — "tenant", "platform" or "none".
 * Checkout screens use it to explain WHY card payments are unavailable instead
 * of rendering an empty payment box.
 */
export function useDonationAccount() {
  const { organisation } = useTenant();
  return organisation?.payment?.source || null;
}
