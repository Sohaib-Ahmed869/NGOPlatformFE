import { Gift, Minus, Plus, Trash2 } from "lucide-react";
import CustomSelect from "../../../../components/CustomSelect";
import { labelCls, inputCls, selectTrigger } from "../constants";
import { money } from "../utils";
import { useCheckout } from "../CheckoutContext";
import SectionHead from "../components/SectionHead";
import PaymentPlanSelector from "../components/PaymentPlanSelector";

export default function DonationStep() {
  const {
    items, removeItem, handleQuantityChange,
    onBehalfOf, handleOnBehalfOfChange,
    onChangeDonationType, donationTypeOptions, loadingDonationTypes,
  } = useCheckout();

  return (
    <>
      <SectionHead icon={Gift} title="Your donations" desc="Review your gifts, choose a category and how often to give." />

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="border-token border-gray-200 bg-white rounded-token p-4 transition-shadow hover:shadow-[0_8px_24px_-14px_rgba(15,23,42,0.18)] sm:p-5">
            <div className="flex items-start gap-3">
              {item.image ? <img src={item.image} alt={item.title} className="h-12 w-12 shrink-0 object-cover ring-1 ring-gray-200" loading="lazy" /> : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-primary">{item.title}</h3>
                    {item.quantity > 1 && <p className="mt-0.5 text-xs text-text-muted">${money(item.price)} each</p>}
                  </div>
                  <span className="shrink-0 font-heading text-lg font-bold text-primary">${money(item.price * item.quantity)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Donation type</label>
                <CustomSelect
                  className="w-full"
                  triggerClassName={selectTrigger}
                  placeholder="Select type"
                  disabled={loadingDonationTypes || donationTypeOptions.length === 0}
                  value={item.donationType || donationTypeOptions[0]?.value || ""}
                  onChange={(v) => onChangeDonationType(item, v)}
                  options={donationTypeOptions}
                />
              </div>
              <div>
                <label className={labelCls}>On behalf of (optional)</label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Person, community or masjid"
                  value={onBehalfOf[item.id] || ""}
                  onChange={(e) => handleOnBehalfOfChange(item.id, e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              <div className="inline-flex items-center border border-gray-200">
                <button onClick={() => handleQuantityChange(item.id, -1)} className="grid h-9 w-9 place-items-center text-text-muted transition-colors hover:bg-accent/10 hover:text-accent" aria-label="Decrease"><Minus className="h-3.5 w-3.5" /></button>
                <span className="w-9 text-center text-sm font-semibold text-primary">{item.quantity}</span>
                <button onClick={() => handleQuantityChange(item.id, 1)} className="grid h-9 w-9 place-items-center text-text-muted transition-colors hover:bg-accent/10 hover:text-accent" aria-label="Increase"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <button onClick={() => removeItem(item.id)} className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-danger">
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <PaymentPlanSelector />
    </>
  );
}
