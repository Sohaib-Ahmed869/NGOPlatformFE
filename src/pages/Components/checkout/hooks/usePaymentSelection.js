import { useEffect, useState } from "react";
import PaymentMethodService from "../../../../services/paymentMethod.service";

const isCardMethod = (m) => m === "visa" || m === "mastercard";

// Owns the payment method choice (card vs bank), the verified Stripe payment
// method to charge, and the donor's reusable saved cards.
export default function usePaymentSelection({ user }) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [stripePaymentMethod, setStripePaymentMethod] = useState(null);
  const [savedCards, setSavedCards] = useState([]);
  const [selectedSavedCardId, setSelectedSavedCardId] = useState("new"); // "new" or a card _id
  const [savedCustomerId, setSavedCustomerId] = useState(null);

  useEffect(() => {
    if (!user) {
      setSavedCards([]);
      setSelectedSavedCardId("new");
      setStripePaymentMethod(null);
      setSavedCustomerId(null);
      return;
    }
    let active = true;
    (async () => {
      try {
        const cards = await PaymentMethodService.getAllPaymentMethods();
        const usable = (cards || []).filter((c) => c.stripePaymentMethodId);
        if (!active) return;
        setSavedCards(usable);
        // Pre-select the default (or first) saved card so the card step is ready.
        const preferred = usable.find((c) => c.isDefault) || usable[0];
        if (preferred) {
          setSelectedSavedCardId(preferred._id);
          setStripePaymentMethod({ id: preferred.stripePaymentMethodId });
          setSavedCustomerId(preferred.stripeCustomerId || null);
        }
      } catch {
        /* not critical — donor can still pay with a new card */
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const handlePaymentMethodCreated = (paymentMethod) => setStripePaymentMethod(paymentMethod);

  const pickSavedCard = (card) => {
    setSelectedSavedCardId(card._id);
    setStripePaymentMethod({ id: card.stripePaymentMethodId });
    setSavedCustomerId(card.stripeCustomerId || null);
  };
  const pickNewCard = () => {
    setSelectedSavedCardId("new");
    setStripePaymentMethod(null);
    setSavedCustomerId(null);
  };

  // Saved cards are offered for any card payment by a signed-in donor — one-off,
  // recurring or installments. The saved card's payment method is already
  // attached to the donor's Stripe customer, which the backend reuses for
  // subscriptions/installments just like a freshly entered card.
  const showSavedCards =
    !!user && savedCards.length > 0 && isCardMethod(selectedPaymentMethod);
  const usingNewCard = !showSavedCards || selectedSavedCardId === "new";
  const recurringDisablesPay = isCardMethod(selectedPaymentMethod) && !stripePaymentMethod;

  return {
    selectedPaymentMethod, setSelectedPaymentMethod,
    stripePaymentMethod,
    savedCards,
    selectedSavedCardId,
    savedCustomerId,
    handlePaymentMethodCreated,
    pickSavedCard,
    pickNewCard,
    showSavedCards,
    usingNewCard,
    recurringDisablesPay,
  };
}
