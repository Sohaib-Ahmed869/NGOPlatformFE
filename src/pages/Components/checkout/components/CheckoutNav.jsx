import { ChevronLeft, ChevronRight, Loader2, Lock } from "lucide-react";
import { accentBtn } from "../constants";
import { money } from "../utils";
import { useCheckout } from "../CheckoutContext";

// The Back / Continue / Pay controls. Rendered inline under the step card on
// desktop and pinned to the bottom of the viewport on mobile.
export default function CheckoutNav({ variant }) {
  const {
    activeStep, handleBackButton, goNext, handleSubmitOrder,
    loading, recurringDisablesPay, selectedPaymentMethod, grandTotal,
  } = useCheckout();

  const isLast = activeStep === 3;
  const primaryLabel = loading
    ? "Processing…"
    : selectedPaymentMethod === "bank"
      ? "Confirm donation"
      : `Pay $${money(grandTotal)}`;

  return (
    <div
      className={
        variant === "mobile"
          ? "fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden"
          : "mt-6 hidden items-center justify-between gap-3 lg:flex"
      }
    >
      <button
        onClick={handleBackButton}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-token-btn border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-accent/40 hover:bg-gray-50 disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      {!isLast ? (
        <button
          onClick={goNext}
          disabled={loading}
          className={`${accentBtn} flex-1 px-6 py-2.5 text-sm lg:flex-none`}
        >
          Continue <ChevronRight className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={handleSubmitOrder}
          disabled={loading || recurringDisablesPay}
          className={`${accentBtn} flex-1 px-6 py-2.5 text-sm lg:flex-none`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {primaryLabel}
        </button>
      )}
    </div>
  );
}
