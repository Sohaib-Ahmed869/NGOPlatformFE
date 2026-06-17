import { Elements } from "@stripe/react-stripe-js";
import { Lock } from "lucide-react";
import { PAYMENT_METHODS, tileBase, accentGlow } from "../constants";
import { tileState, TILE_GLOW } from "../utils";
import visa from "../../../../assets/visa.png";
import mastercard from "../../../../assets/mastercard.png";
import { useCheckout } from "../CheckoutContext";
import SectionHead from "../components/SectionHead";
import StripeCardForm from "../components/StripeCardForm";
import SavedCardList from "../components/SavedCardList";

export default function PaymentStep() {
  const {
    selectedPaymentMethod, setSelectedPaymentMethod, stripePromise, organisation,
    showSavedCards, usingNewCard, savedCards, selectedSavedCardId,
    pickSavedCard, pickNewCard, handlePaymentMethodCreated, submittingCardForm,
  } = useCheckout();

  const isCard = selectedPaymentMethod === "visa" || selectedPaymentMethod === "mastercard";

  return (
    <>
      <SectionHead icon={Lock} title="Payment" desc="Choose how you'd like to pay. All transactions are encrypted." />

      <div className="grid gap-3 sm:grid-cols-2">
        {PAYMENT_METHODS.map((m) => {
          const active = selectedPaymentMethod === m.id || (m.id === "visa" && selectedPaymentMethod === "mastercard");
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedPaymentMethod(m.id)}
              className={`${tileBase} flex items-center p-4 ${tileState(active)}`}
            >
              <span aria-hidden className={TILE_GLOW} />
              <span className="relative flex w-full items-center gap-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center transition-colors ${active ? `bg-accent text-white ${accentGlow}` : "bg-accent/10 text-accent"}`}><m.icon className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-primary">{m.label}</span>
                  <span className="block text-xs text-text-muted">{m.desc}</span>
                </span>
                {m.id === "visa" && (
                  <span className="ml-auto hidden items-center gap-1.5 sm:flex">
                    <img src={visa} alt="Visa" className="h-5" />
                    <img src={mastercard} alt="Mastercard" className="h-5" />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {isCard && stripePromise && (
        <div className="mt-5 space-y-3">
          {/* Saved cards (one-off payments, signed-in donors) */}
          {showSavedCards && (
            <SavedCardList
              savedCards={savedCards}
              selectedSavedCardId={selectedSavedCardId}
              onPickSaved={pickSavedCard}
              onPickNew={pickNewCard}
            />
          )}

          {/* New-card entry (Stripe Elements) */}
          {usingNewCard && (
            <Elements stripe={stripePromise}>
              <StripeCardForm onPaymentMethodCreated={handlePaymentMethodCreated} isSubmitting={submittingCardForm} />
            </Elements>
          )}
        </div>
      )}

      {selectedPaymentMethod === "bank" && (
        <div className="mt-5 space-y-2 border-token border-gray-100 bg-gray-50 rounded-token p-5 text-sm text-primary">
          <p className="font-semibold">Bank transfer details</p>
          <p>Bank: {organisation?.bankDetails?.bankName || "Contact us for details"}</p>
          <p>BSB: {organisation?.bankDetails?.bsb || "N/A"}</p>
          <p>Account number: {organisation?.bankDetails?.accountNumber || "N/A"}</p>
          <p className="text-text-muted">For a tax receipt, email proof of payment to {organisation?.contactEmail || "the organisation"}.</p>
          <div className="mt-3 bg-primary p-4 text-sm text-background">
            Your donation is processed once we receive clear funds. A tax receipt is emailed once payment is confirmed by our team.
          </div>
        </div>
      )}
    </>
  );
}
