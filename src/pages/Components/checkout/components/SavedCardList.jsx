import { Check, CreditCard, Plus } from "lucide-react";
import { labelCls } from "../constants";
import { cardBrandLabel } from "../utils";

// Pick-a-saved-card list (one-off card payments for signed-in donors) plus a
// "use a new card" option that hands back to Stripe Elements.
export default function SavedCardList({ savedCards, selectedSavedCardId, onPickSaved, onPickNew }) {
  return (
    <>
      <label className={labelCls}>Pay with a saved card</label>
      {savedCards.map((c) => {
        const active = selectedSavedCardId === c._id;
        return (
          <button
            key={c._id}
            type="button"
            onClick={() => onPickSaved(c)}
            className={`flex w-full items-center gap-3 rounded-token-btn border p-3.5 text-left transition-colors ${active ? "border-accent bg-accent/[0.07]" : "border-gray-200 hover:border-accent/60 hover:bg-gray-50"}`}
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center ${active ? "bg-accent text-white" : "bg-accent/10 text-accent"}`}>
              <CreditCard className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-primary">
                {cardBrandLabel(c.brand)}{c.cardNumber ? ` •••• ${c.cardNumber}` : ""}
              </span>
              <span className="block text-xs text-text-muted">
                {c.expiryMonth && c.expiryYear ? `Expires ${String(c.expiryMonth).padStart(2, "0")}/${c.expiryYear}` : "Saved card"}
                {c.isDefault ? " · Default" : ""}
              </span>
            </span>
            {active && <Check className="h-4 w-4 shrink-0 text-accent" />}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onPickNew}
        className={`flex w-full items-center gap-3 rounded-token-btn border p-3.5 text-left transition-colors ${selectedSavedCardId === "new" ? "border-accent bg-accent/[0.07]" : "border-gray-200 hover:border-accent/60 hover:bg-gray-50"}`}
      >
        <span className={`grid h-9 w-9 shrink-0 place-items-center ${selectedSavedCardId === "new" ? "bg-accent text-white" : "bg-accent/10 text-accent"}`}>
          <Plus className="h-[18px] w-[18px]" />
        </span>
        <span className="text-sm font-semibold text-primary">Use a new card</span>
      </button>
    </>
  );
}
