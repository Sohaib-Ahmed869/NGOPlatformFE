import { loadStripe } from "@stripe/stripe-js";

// Stripe.js is loaded LAZILY, on first use, and cached per key — calling
// loadStripe() at module scope would inject js.stripe.com on every route that
// imports this (or a caller of this), including pages with no checkout at
// all. A stable promise per key means multiple <Elements> mounts (Registration,
// the SuperAdmin Convert modal) never re-inject the script or race each other.
const _stripePromises = {};
export function getStripePromise(key) {
  if (!key) return null;
  if (!_stripePromises[key]) _stripePromises[key] = loadStripe(key);
  return _stripePromises[key];
}
