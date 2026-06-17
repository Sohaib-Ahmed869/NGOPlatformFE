import { useState } from "react";
import { ChevronDown, Receipt } from "lucide-react";
import { money } from "../utils";
import { useCheckout } from "../CheckoutContext";
import { SummaryBody } from "./OrderSummary";

// Collapsible order summary shown above the step card on mobile (the desktop
// sidebar is hidden below lg).
export default function MobileSummaryBar() {
  const { grandTotal, items } = useCheckout();
  const [open, setOpen] = useState(false);
  const itemCount = items.reduce((n, item) => n + (item.quantity || 1), 0);

  return (
    <div className="mb-4 border-token border-gray-200 border-t-2 border-t-accent bg-white rounded-token shadow-[0_8px_24px_-16px_rgba(15,23,42,0.18)] lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center bg-gradient-to-br from-accent/20 to-accent/5 text-accent ring-1 ring-accent/15"><Receipt className="h-[18px] w-[18px]" /></span>
          <span>
            <span className="block text-sm font-semibold text-primary">Order summary</span>
            <span className="block text-xs text-text-muted">{itemCount} item{itemCount === 1 ? "" : "s"} · {open ? "Hide" : "View"} details</span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="font-heading text-lg font-bold text-primary">${money(grandTotal)}</span>
          <ChevronDown className={`h-4 w-4 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="border-t border-gray-100">
          <SummaryBody />
        </div>
      )}
    </div>
  );
}
