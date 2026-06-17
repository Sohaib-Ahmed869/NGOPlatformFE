import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { calculateTotalPayments, money } from "../utils";

// Owns the "how to pay over time" choices: one-time / recurring / installments,
// the admin-cost contribution, and every derived total used across the UI.
export default function usePaymentPlan({ items, total, setSelectedDonationType }) {
  const [paymentType, setPaymentType] = useState("single");
  const [adminCostPercentage, setAdminCostPercentage] = useState(2);
  const [recurringFrequency, setRecurringFrequency] = useState("monthly");
  const [billingDay, setBillingDay] = useState(new Date().getDate());
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [totalRecurringPayments, setTotalRecurringPayments] = useState(0);
  const [installmentMonths, setInstallmentMonths] = useState(3);
  const [hasRamadanRecurringItems, setHasRamadanRecurringItems] = useState(false);

  // A Ramadan last-10-nights item arrives pre-configured as recurring — lock the
  // plan to match it so the donor can't accidentally change the schedule.
  useEffect(() => {
    const ramadanRecurringItems = items.filter(
      (item) => item.source === "ramadan" && item.isRecurring && item.recurringDetails
    );
    setHasRamadanRecurringItems(ramadanRecurringItems.length > 0);
    if (ramadanRecurringItems.length > 0) {
      const ramadanItem = ramadanRecurringItems[0];
      setPaymentType("recurring");
      setRecurringFrequency(ramadanItem.recurringDetails.frequency || "daily");
      if (ramadanItem.recurringDetails.endDate) setRecurringEndDate(ramadanItem.recurringDetails.endDate);
      if (ramadanItem.recurringDetails.totalPayments) {
        setTotalRecurringPayments(ramadanItem.recurringDetails.totalPayments);
      } else {
        const startDate = new Date(ramadanItem.recurringDetails.startDate || new Date());
        const endDate = new Date(ramadanItem.recurringDetails.endDate);
        setTotalRecurringPayments(calculateTotalPayments(startDate, endDate, ramadanItem.recurringDetails.frequency));
      }
      setSelectedDonationType("Sadaqa");
      toast.success("Your Ramadan recurring donation has been configured");
    }
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (recurringEndDate) setTotalRecurringPayments(calculateTotalPayments(new Date(), recurringEndDate, recurringFrequency));
    else setTotalRecurringPayments(0);
  }, [recurringEndDate, recurringFrequency]);

  const adminContribution = (total * adminCostPercentage) / 100;
  const grandTotal = total + adminContribution;
  // The amount charged each period IS the grand total (subtotal + admin), so it
  // always tracks the cart instead of a stale snapshot.
  const recurringAmount = grandTotal;

  const typeAmount = useMemo(
    () => ({
      single: `$${money(grandTotal)} once`,
      recurring: `$${money(grandTotal)} / ${recurringFrequency}`,
      installments: `${installmentMonths} × $${money(grandTotal / installmentMonths)}`,
    }),
    [grandTotal, recurringFrequency, installmentMonths]
  );

  return {
    paymentType, setPaymentType,
    adminCostPercentage, setAdminCostPercentage,
    recurringFrequency, setRecurringFrequency,
    billingDay, setBillingDay,
    recurringAmount,
    recurringEndDate, setRecurringEndDate,
    totalRecurringPayments,
    installmentMonths, setInstallmentMonths,
    hasRamadanRecurringItems,
    adminContribution,
    grandTotal,
    typeAmount,
  };
}
