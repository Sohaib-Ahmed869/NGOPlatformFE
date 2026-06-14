import { useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { useTenant } from "../context/TenantContext";

// Cache one Stripe.js instance per publishable key.
const promiseCache = {};

/**
 * Returns a loadStripe() promise for the current tenant's publishable key,
 * falling back to the platform key (VITE_STRIPE_PUBLISHABLE_KEY) when the
 * tenant hasn't configured their own. Used by the checkout <Elements> wrappers.
 */
export default function useTenantStripe() {
  const { organisation } = useTenant();
  const key =
    organisation?.payment?.publishableKey ||
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    "";

  return useMemo(() => {
    if (!key) return null;
    if (!promiseCache[key]) promiseCache[key] = loadStripe(key);
    return promiseCache[key];
  }, [key]);
}
