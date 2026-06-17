import { CalendarDays, Lock, Receipt, Repeat, ShieldCheck } from "lucide-react";
import visa from "../../../../assets/visa.png";
import mastercard from "../../../../assets/mastercard.png";
import paypal from "../../../../assets/paypal.png";
import { cardShell } from "../constants";
import { money } from "../utils";
import { useCheckout } from "../CheckoutContext";

// Line items + running totals, shared between the desktop sidebar card and the
// mobile collapsible summary.
export function SummaryBody() {
  const {
    items, total, adminCostPercentage, adminContribution, grandTotal,
    paymentType, recurringFrequency, totalRecurringPayments, installmentMonths,
  } = useCheckout();

  return (
    <>
      <div className="max-h-60 space-y-3 overflow-y-auto px-5 py-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
            <span className="min-w-0">
              <span className="block truncate text-primary">{item.title}</span>
              <span className="text-xs text-text-muted">Qty {item.quantity}{item.donationType ? ` · ${item.donationType}` : ""}</span>
            </span>
            <span className="shrink-0 font-medium text-primary">${money(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-gray-100 px-5 py-4 text-sm">
        <div className="flex justify-between text-text-muted"><span>Subtotal</span><span className="text-primary">${money(total)}</span></div>
        {adminCostPercentage > 0 && (
          <div className="flex justify-between text-text-muted"><span>Admin contribution ({adminCostPercentage}%)</span><span className="text-primary">${money(adminContribution)}</span></div>
        )}
        {paymentType === "recurring" && (
          <p className="flex items-center gap-1.5 pt-1 text-xs font-medium text-accent"><Repeat className="h-3.5 w-3.5" /> Recurring {recurringFrequency}{totalRecurringPayments > 0 ? ` · ${totalRecurringPayments} payments` : ""}</p>
        )}
        {paymentType === "installments" && (
          <p className="flex items-center gap-1.5 pt-1 text-xs font-medium text-accent"><CalendarDays className="h-3.5 w-3.5" /> {installmentMonths} payments of ${money(grandTotal / installmentMonths)}</p>
        )}
      </div>
      <div className="flex items-center justify-between bg-gray-50 px-5 py-4">
        <span className="text-sm font-semibold uppercase tracking-wide text-primary">Total</span>
        <span className="font-heading text-2xl font-bold text-accent">${money(grandTotal)}</span>
      </div>
    </>
  );
}

export default function OrderSummary() {
  return (
    <div className={`hidden border-t-2 border-t-accent lg:block ${cardShell}`}>
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center bg-gradient-to-br from-accent/20 to-accent/5 text-accent ring-1 ring-accent/15">
          <Receipt className="h-4 w-4" />
        </span>
        <h3 className="font-heading text-base font-bold text-primary">Order summary</h3>
      </div>
      <SummaryBody />
      <div className="space-y-2.5 border-t border-gray-100 px-5 py-4">
        <p className="flex items-center gap-2 text-xs text-text-muted"><Lock className="h-3.5 w-3.5 text-accent" /> Encrypted, secure checkout</p>
        <p className="flex items-center gap-2 text-xs text-text-muted"><ShieldCheck className="h-3.5 w-3.5 text-accent" /> 100% donation policy · we protect your privacy</p>
        <div className="flex items-center justify-center gap-3 pt-1">
          <img src={visa} alt="Visa" className="h-5" />
          <img src={mastercard} alt="Mastercard" className="h-5" />
          <img src={paypal} alt="PayPal" className="h-5" />
        </div>
      </div>
    </div>
  );
}
