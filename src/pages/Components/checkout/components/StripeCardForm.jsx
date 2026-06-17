import { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Check, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { labelCls } from "../constants";

export default function StripeCardForm({ onPaymentMethodCreated, isSubmitting }) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState("");
  const [cardComplete, setCardComplete] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const processCard = async () => {
    if (!stripe || !elements) return false;
    setIsVerifying(true);
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setIsVerifying(false);
      return false;
    }
    const { error, paymentMethod } = await stripe.createPaymentMethod({ type: "card", card: cardElement });
    if (error) {
      setCardError(error.message);
      setIsVerifying(false);
      return false;
    }
    setCardError("");
    setIsVerifying(false);
    setIsVerified(true);
    onPaymentMethodCreated(paymentMethod);
    toast.success("Card details verified");
    return true;
  };

  return (
    <div className="mt-5">
      <label className={labelCls}>Card details</label>
      <div className="border border-gray-200 bg-white px-3.5 py-3.5 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
        <CardElement
          options={{
            style: {
              base: { fontSize: "15px", color: "#2C2418", "::placeholder": { color: "#9ca3af" } },
              invalid: { color: "#dc2626" },
            },
          }}
          onChange={(e) => {
            setCardComplete(e.complete);
            setCardError(e.error ? e.error.message : "");
          }}
        />
      </div>
      {cardError && <p className="mt-2 text-sm text-red-500">{cardError}</p>}
      {cardComplete && !isSubmitting && (
        <button
          type="button"
          onClick={processCard}
          disabled={isVerifying || isVerified}
          className="mt-3 inline-flex items-center gap-2 rounded-token-btn bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-60"
        >
          {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : isVerified ? <Check className="h-4 w-4" /> : null}
          {isVerifying ? "Verifying…" : isVerified ? "Card verified" : "Verify card"}
        </button>
      )}
    </div>
  );
}
