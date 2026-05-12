// Utility function to calculate the end date for installment payments
export const calculateEndDate = (donation) => {
  // If it's not an installment payment, return null
  if (donation.paymentType !== "installments" || !donation.installmentDetails) {
    return null;
  }

  // Get the required details
  const { numberOfInstallments, installmentsPaid, nextInstallmentDate } =
    donation.installmentDetails;

  // If there's no next installment date or all installments have been paid, return null
  if (!nextInstallmentDate || installmentsPaid >= numberOfInstallments) {
    return null;
  }

  // Calculate how many more installments are remaining
  const remainingInstallments = numberOfInstallments - installmentsPaid;

  // If no remaining installments, return null
  if (remainingInstallments <= 0) {
    return null;
  }

  // Get payment frequency by analyzing the date patterns in installment history
  // Default to monthly if we can't determine it
  let frequencyInDays = 30; // Default to monthly

  // Try to determine frequency from installment history if available
  if (
    donation.installmentDetails.installmentHistory &&
    donation.installmentDetails.installmentHistory.length >= 2
  ) {
    const history = donation.installmentDetails.installmentHistory;
    // Sort history by date
    const sortedHistory = [...history].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Calculate average days between payments
    let totalDays = 0;
    let intervals = 0;

    for (let i = 1; i < sortedHistory.length; i++) {
      const prevDate = new Date(sortedHistory[i - 1].date);
      const currentDate = new Date(sortedHistory[i].date);
      const diffTime = Math.abs(currentDate - prevDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      totalDays += diffDays;
      intervals++;
    }

    if (intervals > 0) {
      frequencyInDays = Math.round(totalDays / intervals);
    }
  }

  // Calculate the end date by adding the remaining installments * frequency to the next installment date
  const nextDate = new Date(nextInstallmentDate);
  const endDate = new Date(nextDate);
  endDate.setDate(
    nextDate.getDate() + (remainingInstallments - 1) * frequencyInDays
  );

  return endDate;
};

// Format the date for display
export const formatEndDate = (donation) => {
  const endDate = calculateEndDate(donation);

  if (!endDate) {
    return "-";
  }

  return endDate.toLocaleDateString();
};
