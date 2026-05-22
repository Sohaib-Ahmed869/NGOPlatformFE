// TAX RECEIPT GENERATOR
import { jsPDF } from "jspdf";
import { toast } from "react-hot-toast";
import taxDeductibleLogo from "../../assets/images/tax-deductible.png";
import footer3 from "../../assets/footer3.png";

/**
 * Generates and downloads a PDF receipt for a donation
 * @param {Object} donation - The full donation object with all details
 * @param {Object} options - Optional settings for the receipt
 * @param {String} options.logoUrl - URL to the organization logo
 * @param {String} options.charityLogoUrl - URL to the charity logo (tax-deductible.png)
 * @param {Boolean} options.paidOnly - Only include paid items (for installments/recurring)
 * @param {Number} options.installmentNumber - Specific installment number to generate receipt for (optional)
 * @returns {Promise<boolean>} - True if download was successful
 */
const downloadReceipt = async (donation, options = {}, orgInfo = {}) => {
  try {
    // Show loading toast
    const loadingToast = toast.loading("Generating receipt... Please wait.");

    // Create a new PDF document - using A4 format
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Define margins and positioning
    const marginLeft = 20;
    const marginRight = doc.internal.pageSize.width - 20; 
    const marginTop = 20;

    // Generate filename - add installment info if applicable
    let fileName = `receipt-${donation.donationId || "donation"}`;
    if (donation.paymentType === "installments" && options.installmentNumber) {
      fileName += `-I${options.installmentNumber}`;
    } else if (donation.paymentType === "recurring" && options.paidOnly) {
      fileName += `-paid-payments`;
    }
    fileName += ".pdf";

    // Company name (in place of the logo) - top left
    const companyName = orgInfo.name || "Charity Organisation";
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, marginLeft, marginTop + 8);
    doc.setFont("helvetica", "normal");

    // Tax deductible logo (top right)
    try {
      doc.addImage(taxDeductibleLogo, "PNG", marginRight - 40, marginTop, 40, 20);
    } catch (imageError) {
      console.warn("Could not load images:", imageError);
      // Continue without images
    }

    // Determine if we're showing a specific installment
    const isInstallment = donation.paymentType === "installments";
    const isRecurring = donation.paymentType === "recurring";
    const installmentNumber = options.installmentNumber;

    // Set positions for header section - REDUCE the spacing from 30 to 28
    let yPos = marginTop + 35;

    // Receipt title
    doc.setFontSize(12);
    let receiptTitle = "Donation Receipt";
    if (isInstallment && installmentNumber) {
      receiptTitle = `Installment ${installmentNumber} Receipt`;
    } else if (isInstallment && options.paidOnly) {
      receiptTitle = "Installment Payments Receipt";
    } else if (isRecurring && options.paidOnly) {
      receiptTitle = "Recurring Payments Receipt";
    } else if (isRecurring) {
      receiptTitle = "Recurring Donation Receipt";
    }
    doc.text(receiptTitle, marginLeft, yPos);
    
    // REDUCE spacing between lines - from 7 to 5
    yPos += 5;

    // Financial year
    const financialYear = getCurrentFinancialYear(donation.createdAt);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Financial Year ${financialYear}`, marginLeft, yPos);

    // Right-aligned section with ABN and receipt details - ADJUST to match the left side spacing
    doc.setFontSize(10);
    doc.text("ABN: 97 642 657 010", marginRight, marginTop + 28, { align: "right" });
    
    // REDUCE spacing - from 40 to 35
    doc.text(`Date of Issue: ${formatDate(new Date())}`, marginRight, marginTop + 35, { align: "right" });

    // REDUCE spacing - from 50 to 42
    // Reference - add installment number for installment payments
    let reference = donation.donationId;
    if (isInstallment && installmentNumber) {
      reference += `-I${installmentNumber}`;
    } else if (isRecurring && options.paidOnly) {
      reference += `-paid`;
    }
    doc.text(`Reference: ${reference}`, marginRight, marginTop + 42, { align: "right" });

    // Add donor details - REDUCE spacing from 10 to 8
    yPos += 8;
    doc.setFontSize(10);
    doc.text(`Name: ${donation.donorDetails.name}`, marginLeft, yPos);
    
    if (donation.donorDetails.address) {
      // REDUCE spacing between lines - from 5 to 4
      yPos += 4;
      const address = formatAddress(donation.donorDetails.address);
      doc.text(`Address: ${address}`, marginLeft, yPos);
    }

    // REDUCE spacing between lines - from 5 to 4
    yPos += 4;
    doc.text(`Email: ${donation.donorDetails.email}`, marginLeft, yPos);

    if (donation.donorDetails.phone) {
      // REDUCE spacing between lines - from 5 to 4
      yPos += 4;
      doc.text(`Phone: ${donation.donorDetails.phone}`, marginLeft, yPos);
    }

    // Create table data based on payment type and options
    const tableData = getTableData(
      donation,
      installmentNumber,
      options.paidOnly
    );

    // Table header definition
    const headerData = {
      donation_date: "Payment Date",
      description: "Description",
      amount: "Amount",
    };

    // Start table after donor details with some spacing - keep 10
    yPos += 10;

    // Draw table with separate header handling for better control
    let lastY = createTableWithSeparateHeader(
      doc,
      headerData,
      tableData,
      marginLeft,
      yPos
    );

    // Calculate total amount
    let totalAmount = 0;
    tableData.forEach((row) => {
      totalAmount += parseFloat(row.amount.replace("$", ""));
    });

    // Add total amount - right aligned
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, marginRight, lastY + 10, { align: "right" });

    // Add payment details
    lastY += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `Payment Method: ${formatPaymentMethod(donation.paymentMethod)}`,
      marginRight, lastY, { align: "right" }
    );
    lastY += 6;
    doc.text(
      `Payment Type: ${formatPaymentType(donation.paymentType)}`,
      marginRight, lastY, { align: "right" }
    );
    lastY += 6;

    // For installments, display appropriate status
    if (isInstallment && installmentNumber) {
      // Find status of this specific installment
      const installmentStatus = getInstallmentStatus(
        donation,
        installmentNumber
      );
      doc.text(
        `Payment Status: ${formatPaymentStatus(installmentStatus)}`,
        marginRight, lastY, { align: "right" }
      );
    } else {
      doc.text(
        `Payment Status: ${formatPaymentStatus(donation.paymentStatus)}`,
       marginRight, lastY, { align: "right" }
      );
    }

    // Add installment details for installment plans
    if (isInstallment) {
      lastY += 10;
      const totalInstallments =
        donation.installmentDetails?.numberOfInstallments || 0;
      const installmentAmount =
        donation.installmentDetails?.installmentAmount || 0;
      const installmentsPaid =
        donation.installmentDetails?.installmentsPaid || 0;

      doc.text(`Total Installments: ${totalInstallments}`, marginLeft, lastY);
      lastY += 6;
      doc.text(
        `Installment Amount: $${installmentAmount.toFixed(2)}`,
        marginLeft,
        lastY
      );
      lastY += 6;
      doc.text(
        `Installments Paid: ${installmentsPaid} of ${totalInstallments}`,
        marginLeft,
        lastY
      );

      // Add note for installment-specific receipts
      if (installmentNumber) {
        lastY += 8;
        doc.setFontSize(9);
        doc.setTextColor(85, 85, 85);
        doc.text(
          `Note: This receipt is for installment ${installmentNumber} of ${totalInstallments} only.`,
          marginLeft,
          lastY
        );
      } else if (options.paidOnly) {
        lastY += 8;
        doc.setFontSize(9);
        doc.setTextColor(85, 85, 85);
        doc.text(
          "Note: This receipt includes only paid installments.",
          marginLeft,
          lastY
        );
      }
      doc.setTextColor(0, 0, 0);
    }

    // Add recurring details for recurring donations
    if (isRecurring) {
      lastY += 10;
      const frequency = donation.recurringDetails?.frequency || "monthly";
      const successfulPayments = donation.recurringDetails?.paymentHistory?.filter(
        p => p.status === "succeeded" || p.status === "completed"
      ).length || 0;

      doc.text(`Frequency: ${frequency.charAt(0).toUpperCase() + frequency.slice(1)}`, marginLeft, lastY);
      lastY += 6;
      doc.text(`Total Payments Made: ${successfulPayments}`, marginLeft, lastY);

      // Add note for recurring payment receipts
      if (options.paidOnly && successfulPayments > 0) {
        lastY += 8;
        doc.setFontSize(9);
        doc.setTextColor(85, 85, 85);
        doc.text(
          `Note: This receipt includes ${successfulPayments} successful recurring payment(s).`,
          marginLeft,
          lastY
        );
        doc.setTextColor(0, 0, 0);
      } else if (!options.paidOnly) {
        lastY += 8;
        doc.setFontSize(9);
        doc.setTextColor(85, 85, 85);
        doc.text(
          "Note: This receipt shows the original donation setup. For payment history, generate a 'paid payments' receipt.",
          marginLeft,
          lastY
        );
        doc.setTextColor(0, 0, 0);
      }
    }

    // Add tax deductibility information
    lastY += 15;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 128, 0); // Green text
    doc.text("Tax Information", doc.internal.pageSize.width / 2, lastY, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0); // Reset text color
    doc.text("All donations are tax-deductible to the extent allowed by law.", doc.internal.pageSize.width / 2, lastY + 6, { align: "center" });
    doc.text("This receipt is for tax purposes only. Please retain for your records.", doc.internal.pageSize.width / 2, lastY + 12, { align: "center" });

    // Add footer
    const footerText = [orgInfo.website, orgInfo.email, orgInfo.phone].filter(Boolean).join(" | ") || "";
    doc.setFontSize(8);
    doc.text(footerText, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 15, {
      align: "center",
    });

    // Save the PDF
    doc.save(fileName);

    // Dismiss loading toast and show success
    toast.dismiss(loadingToast);
    toast.success("Receipt downloaded successfully!");

    return true;
  } catch (error) {
    console.error("Error generating receipt:", error);
    toast.error("Failed to generate receipt. Please try again later.");
    return false;
  }
};

/**
 * Gets table data based on payment type and options
 * @param {Object} donation - The donation object
 * @param {Number} installmentNumber - Specific installment number to show
 * @param {Boolean} paidOnly - Only include paid items
 * @returns {Array} - Array of table row objects
 */
const getTableData = (donation, installmentNumber, paidOnly) => {
  const tableData = [];
  const donationDate = formatDate(donation.createdAt);

  // For installment plans
  if (donation.paymentType === "installments") {
    // If looking for a specific installment
    if (installmentNumber && donation.installmentDetails?.installmentHistory) {
      const installment = donation.installmentDetails.installmentHistory.find(
        (item) => item.installmentNumber === installmentNumber
      );

      if (installment) {
        tableData.push({
          donation_date: formatDate(installment.date || donation.createdAt),
          description: `Installment ${installmentNumber} of ${donation.installmentDetails.numberOfInstallments}`,
          amount: `$${parseFloat(installment.amount).toFixed(2)}`,
        });
      }
    }
    // Show all paid installments
    else if (paidOnly && donation.installmentDetails?.installmentHistory) {
      donation.installmentDetails.installmentHistory
        .filter((item) => item.status === "completed")
        .forEach((item) => {
          tableData.push({
            donation_date: formatDate(item.date || donation.createdAt),
            description: `Installment ${item.installmentNumber} of ${donation.installmentDetails.numberOfInstallments}`,
            amount: `$${parseFloat(item.amount).toFixed(2)}`,
          });
        });
    }
    // Fallback to items if no installment history
    else if (donation.items && donation.items.length > 0) {
      donation.items.forEach((item) => {
        tableData.push({
          donation_date: donationDate,
          description: `${item.title}${
            item.onBehalfOf ? ` (on behalf of ${item.onBehalfOf})` : ""
          }`,
          amount: `$${(item.price * (item.quantity || 1)).toFixed(2)}`,
        });
      });
    }
  }
  // For recurring donations
  else if (donation.paymentType === "recurring") {
    // If showing paid only and we have payment history
    if (paidOnly && donation.recurringDetails?.paymentHistory && donation.recurringDetails.paymentHistory.length > 0) {
      // Show each successful payment as a separate line
      donation.recurringDetails.paymentHistory
        .filter(payment => payment.status === "succeeded" || payment.status === "completed")
        .forEach((payment, index) => {
          const paymentAmount = payment.amount || donation.recurringDetails.amount;
          const baseDescription = donation.items[0]?.title || "Recurring Donation";
          
          tableData.push({
            donation_date: formatDate(payment.date),
            description: `Payment ${index + 1}: ${baseDescription}`,
            amount: `${parseFloat(paymentAmount).toFixed(2)}`,
          });
        });
    }
    // Show original donation items (for initial receipt or when no payment history)
    else {
      if (donation.items && donation.items.length > 0) {
        donation.items.forEach((item) => {
          tableData.push({
            donation_date: donationDate,
            description: `${item.title}${
              item.onBehalfOf ? ` (on behalf of ${item.onBehalfOf})` : ""
            }`,
            amount: `${(item.price * (item.quantity || 1)).toFixed(2)}`,
          });
        });
      }
    }
  }
  // For regular one-time donations
  else {
    if (donation.items && donation.items.length > 0) {
      donation.items.forEach((item) => {
        tableData.push({
          donation_date: donationDate,
          description: `${item.title}${
            item.onBehalfOf ? ` (on behalf of ${item.onBehalfOf})` : ""
          }`,
          amount: `$${(item.price * (item.quantity || 1)).toFixed(2)}`,
        });
      });
    }
  }

  // Add admin cost contribution if included
  // For recurring with payment history, don't add admin cost separately as it should be included in payment amounts
  if (
    donation.adminCostContribution &&
    donation.adminCostContribution.included &&
    !(donation.paymentType === "recurring" && paidOnly && donation.recurringDetails?.paymentHistory?.length > 0)
  ) {
    tableData.push({
      donation_date: donationDate,
      description: "Admin Cost Contribution",
      amount: `$${donation.adminCostContribution.amount.toFixed(2)}`,
    });
  }

  return tableData;
};

/**
 * Get status of a specific installment
 * @param {Object} donation - The donation object
 * @param {Number} installmentNumber - The installment number to check
 * @returns {String} - Status of the installment
 */
const getInstallmentStatus = (donation, installmentNumber) => {
  if (donation.installmentDetails?.installmentHistory) {
    const installment = donation.installmentDetails.installmentHistory.find(
      (item) => item.installmentNumber === installmentNumber
    );

    if (installment) {
      return installment.status || "unknown";
    }
  }

  return "unknown";
};

/**
 * Creates a table in the PDF with separate header and data sections
 * @param {jsPDF} doc - The PDF document
 * @param {Object} headerData - Header row data
 * @param {Array} bodyData - Data rows
 * @param {number} x - X position
 * @param {number} y - Y position
 * @returns {number} - The new Y position after drawing the table
 */
const createTableWithSeparateHeader = (doc, headerData, bodyData, x, y) => {
  // Define table width based on page width
  const pageWidth = doc.internal.pageSize.width;
  const tableWidth = pageWidth - 40; // 20mm margins on each side
  
  // Set column widths as percentage of total width
  const dateColWidth = tableWidth * 0.22; // 22% for date
  const descColWidth = tableWidth * 0.55; // 55% for description
  const amountColWidth = tableWidth * 0.23; // 23% for amount
  
  // Initial y position
  let currentY = y;

  // Fixed header height
  const headerHeight = 8;
  const rowHeight = 8;

  // Draw header background
  doc.setFillColor(240, 240, 240);
  doc.rect(x, currentY, tableWidth, headerHeight, "F");

  // Draw header text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  // Center text vertically in header cells
  const textY = currentY + headerHeight / 2 + 2;

  // Date column
  doc.text(headerData.donation_date, x + 3, textY);

  // Description column
  doc.text(headerData.description, x + dateColWidth + 3, textY);

  // Amount column
  doc.text(
    headerData.amount,
    x + dateColWidth + descColWidth + amountColWidth - 3,
    textY,
    { align: "right" }
  );

  // Reset font
  doc.setFont("helvetica", "normal");

  // Draw table border
  doc.setDrawColor(0);
  doc.setLineWidth(0.1);
  doc.rect(x, currentY, tableWidth, headerHeight);

  // Draw vertical lines for header columns
  doc.line(
    x + dateColWidth,
    currentY,
    x + dateColWidth,
    currentY + headerHeight
  );

  doc.line(
    x + dateColWidth + descColWidth,
    currentY,
    x + dateColWidth + descColWidth,
    currentY + headerHeight
  );

  // Move position down after header
  currentY += headerHeight;

  // Process data rows
  for (const row of bodyData) {
    // Draw cell content
    doc.setFontSize(9);

    // Calculate text height for proper row sizing
    const descriptionLines = doc.splitTextToSize(row.description, descColWidth - 6);
    const calculatedRowHeight = Math.max(rowHeight, descriptionLines.length * 5);
    
    // Date column
    doc.text(row.donation_date, x + 3, currentY + 5);

    // Description column
    doc.text(row.description, x + dateColWidth + 3, currentY + 5, {
      maxWidth: descColWidth - 6,
    });

    // Amount column
    doc.text(
      row.amount,
      x + dateColWidth + descColWidth + amountColWidth - 3,
      currentY + 5,
      { align: "right" }
    );

    // Draw full cell borders
    doc.rect(x, currentY, tableWidth, calculatedRowHeight);

    // Draw vertical dividers
    doc.line(
      x + dateColWidth,
      currentY,
      x + dateColWidth,
      currentY + calculatedRowHeight
    );

    doc.line(
      x + dateColWidth + descColWidth,
      currentY,
      x + dateColWidth + descColWidth,
      currentY + calculatedRowHeight
    );

    // Update position for next row
    currentY += calculatedRowHeight;
  }

  return currentY;
};

/**
 * Formats an address object into a string
 * @param {Object} address - The address object
 * @returns {string} - Formatted address
 */
const formatAddress = (address) => {
  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.postcode) parts.push(address.postcode);
  if (address.country) parts.push(address.country);

  return parts.join(", ");
};

/**
 * Formats a date into YYYY-MM-DD format
 * @param {Date|string} date - The date to format
 * @returns {string} - Formatted date
 */
const formatDate = (date) => {
  if (!date) return "";

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

/**
 * Gets the financial year string based on a date
 * @param {Date|string} date - The date to check
 * @returns {string} - Financial year string (e.g., "2024/2025")
 */
const getCurrentFinancialYear = (date) => {
  let d;
  try {
    d = date ? new Date(date) : new Date();
    if (isNaN(d.getTime())) d = new Date();
  } catch (error) {
    console.error("Error parsing date for financial year:", error);
    d = new Date();
  }

  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 0-indexed

  // In Australia, financial year runs from July 1 to June 30
  if (month >= 7) {
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
};

/**
 * Formats payment method for display
 * @param {string|object} method - Payment method code or object
 * @returns {string} - Formatted payment method
 */
const formatPaymentMethod = (method) => {
  // Handle object format
  if (typeof method === 'object' && method.type) {
    return formatPaymentMethod(method.type);
  }
  
  const methods = {
    card: "Credit/Debit Card",
    visa: "Credit/Debit Card",
    mastercard: "Credit/Debit Card",
    bank: "Bank Transfer",
    paypal: "PayPal",
  };

  return methods[method] || method || "Unknown";
};

/**
 * Formats payment type for display
 * @param {string} type - Payment type code
 * @returns {string} - Formatted payment type
 */
const formatPaymentType = (type) => {
  const types = {
    single: "One-Time Donation",
    recurring: "Recurring Donation",
    installments: "Installment Plan",
  };

  return types[type] || type || "Unknown";
};

/**
 * Formats payment status for display
 * @param {string} status - Payment status code
 * @returns {string} - Formatted payment status
 */
const formatPaymentStatus = (status) => {
  const statuses = {
    completed: "Paid",
    processing: "Processing",
    pending: "Pending",
    failed: "Failed",
    active: "Active",
    cancelled: "Cancelled",
    ended: "Ended",
    succeeded: "Paid",
  };

  return statuses[status] || status || "Unknown";
};

/**
 * Helper function to download a receipt showing only paid recurring payments
 * @param {Object} donation - The donation object
 * @returns {Promise<boolean>} - True if download was successful
 */
const downloadPaidPaymentsReceipt = async (donation, orgInfo = {}) => {
  return await downloadReceipt(donation, { paidOnly: true }, orgInfo);
};

/**
 * Helper function to download a standard donation receipt (original setup)
 * @param {Object} donation - The donation object
 * @param {Object} orgInfo - Organisation info { name, email, phone, website }
 * @returns {Promise<boolean>} - True if download was successful
 */
const downloadStandardReceipt = async (donation, orgInfo = {}) => {
  return await downloadReceipt(donation, { paidOnly: false }, orgInfo);
};

export { downloadReceipt, downloadPaidPaymentsReceipt, downloadStandardReceipt };