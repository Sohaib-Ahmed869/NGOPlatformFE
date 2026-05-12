// Updated annual statement generator with Payment Type and Donation ID columns
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import logo from "../../assets/images/logo.png";
import taxDeductibleLogo from "../../assets/images/tax-deductible.png";

// Format date helper function
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

// Format currency helper function
const formatCurrency = (amount) => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Generate a unique statement ID
const generateUniqueStatementId = (year, userId) => {
  // Get current timestamp to make it unique
  const timestamp = Date.now().toString().slice(-6);
  // Get user ID if available, or use a random number
  const userIdPart = userId ? userId.slice(-4) : Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  // Combine year, user ID part and timestamp to create a unique ID
  return `AS-${year}-${userIdPart}-${timestamp}`;
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
  const dateColWidth = tableWidth * 0.15; // 15% for date
  const idColWidth = tableWidth * 0.15; // 15% for donation ID
  const descColWidth = tableWidth * 0.30; // 30% for description
  const paymentTypeColWidth = tableWidth * 0.15; // 15% for payment type
  const amountColWidth = tableWidth * 0.25; // 25% for amount
  
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

  // Donation ID column
  doc.text(headerData.donation_id, x + dateColWidth + 3, textY);

  // Description column
  doc.text(headerData.description, x + dateColWidth + idColWidth + 3, textY);

  // Payment Type column
  doc.text(headerData.payment_type, x + dateColWidth + idColWidth + descColWidth + 3, textY);

  // Amount column
  doc.text(
    headerData.amount,
    x + dateColWidth + idColWidth + descColWidth + paymentTypeColWidth + amountColWidth - 3,
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
    x + dateColWidth + idColWidth,
    currentY,
    x + dateColWidth + idColWidth,
    currentY + headerHeight
  );

  doc.line(
    x + dateColWidth + idColWidth + descColWidth,
    currentY,
    x + dateColWidth + idColWidth + descColWidth,
    currentY + headerHeight
  );

  doc.line(
    x + dateColWidth + idColWidth + descColWidth + paymentTypeColWidth,
    currentY,
    x + dateColWidth + idColWidth + descColWidth + paymentTypeColWidth,
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

    // Donation ID column
    doc.text(row.donation_id, x + dateColWidth + 3, currentY + 5);

    // Description column
    doc.text(row.description, x + dateColWidth + idColWidth + 3, currentY + 5, {
      maxWidth: descColWidth - 6,
    });

    // Payment Type column
    doc.text(row.payment_type, x + dateColWidth + idColWidth + descColWidth + 3, currentY + 5);

    // Amount column
    doc.text(
      row.amount,
      x + dateColWidth + idColWidth + descColWidth + paymentTypeColWidth + amountColWidth - 3,
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
      x + dateColWidth + idColWidth,
      currentY,
      x + dateColWidth + idColWidth,
      currentY + calculatedRowHeight
    );

    doc.line(
      x + dateColWidth + idColWidth + descColWidth,
      currentY,
      x + dateColWidth + idColWidth + descColWidth,
      currentY + calculatedRowHeight
    );

    doc.line(
      x + dateColWidth + idColWidth + descColWidth + paymentTypeColWidth,
      currentY,
      x + dateColWidth + idColWidth + descColWidth + paymentTypeColWidth,
      currentY + calculatedRowHeight
    );

    // Update position for next row
    currentY += calculatedRowHeight;
  }

  return currentY;
};

/**
 * Formats the payment type for display
 * @param {string} paymentType - The payment type
 * @returns {string} - Formatted payment type
 */
const formatPaymentType = (paymentType) => {
  if (!paymentType) return "One-time";
  
  // Capitalize first letter
  return paymentType.charAt(0).toUpperCase() + paymentType.slice(1);
};

export const generateAnnualStatement = (donations, year, user, { logoUrl, charityLogoUrl }) => {
  try {
    // Filter donations for the specified financial year (July 1 to June 30)
    const startDate = new Date(`${year-1}-07-01`);
    const endDate = new Date(`${year}-06-30`);
    
    // Include only non-cancelled donations within the financial year
    const financialYearDonations = donations.filter(donation => {
      const donationDate = new Date(donation.createdAt);
      // Only include donations that are not cancelled and within the date range
      return donationDate >= startDate && donationDate <= endDate && donation.paymentStatus !== "cancelled";
    });

    if (financialYearDonations.length === 0) {
      return { success: false, message: "No completed donations found for the selected financial year" };
    }

    // Create table data for all donations
    const tableData = [];
    
    // Sort donations by date
    const sortedDonations = [...financialYearDonations].sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    );
    
    // Process each donation
    sortedDonations.forEach(donation => {
      // Get donation ID
      const donationId = donation.donationId || (donation._id ? donation._id.slice(-8) : "");
      
      if (donation.paymentType === "installments" && donation.installmentDetails?.installmentHistory) {
        // For installments, only include completed payments
        donation.installmentDetails.installmentHistory
          .filter(installment => installment.status === "completed")
          .forEach(installment => {
            // Show only the installment amount without admin cost
            const installmentAmount = parseFloat(installment.amount);
            
            tableData.push({
              donation_date: formatDate(installment.date || donation.createdAt),
              donation_id: donationId,
              description: `Installment ${installment.installmentNumber} of ${donation.installmentDetails.numberOfInstallments}: ${donation.items[0]?.title || "Donation"}`,
              payment_type: "Installment",
              amount: `$${installmentAmount.toFixed(2)}`
            });
          });
      } else if (donation.paymentType === "recurring") {
        // For recurring donations, process payment history
        if (donation.recurringDetails && donation.recurringDetails.paymentHistory && donation.recurringDetails.paymentHistory.length > 0) {
          // Process each successful payment in the payment history
          donation.recurringDetails.paymentHistory
            .filter(payment => payment.status === "succeeded" || payment.status === "completed")
            .forEach((payment, index) => {
              const paymentDate = new Date(payment.date || donation.createdAt);
              
              // Only include payments within the financial year
              if (paymentDate >= startDate && paymentDate <= endDate) {
                const paymentAmount = payment.amount || donation.recurringDetails.amount;
                
                tableData.push({
                  donation_date: formatDate(payment.date || donation.createdAt),
                  donation_id: donationId,
                  description: `Recurring Payment ${index + 1}: ${donation.items[0]?.title || "Recurring Donation"}`,
                  payment_type: "Recurring",
                  amount: `$${formatCurrency(paymentAmount)}`
                });
              }
            });
        } else if (donation.paymentStatus === "active" || donation.paymentStatus === "completed") {
          // If no payment history but donation is active/completed, include the base amount
          const amount = donation.recurringDetails?.amount || donation.totalAmount;
          
          tableData.push({
            donation_date: formatDate(donation.createdAt),
            donation_id: donationId,
            description: `${donation.items[0]?.title || "Recurring Donation"}`,
            payment_type: "Recurring",
            amount: `$${formatCurrency(amount)}`
          });
        }
      } else {
        // For one-time donations
        if (donation.items && donation.items.length > 0) {
          donation.items.forEach(item => {
            let description = item.title;
            if (item.onBehalfOf) {
              description += ` (on behalf of ${item.onBehalfOf})`;
            }
            
            // Calculate total amount including admin cost
            const adminCost = donation.adminCostContribution?.included ? donation.adminCostContribution.amount : 0;
            const itemTotal = (item.price * (item.quantity || 1)) + adminCost;
            
            tableData.push({
              donation_date: formatDate(donation.createdAt),
              donation_id: donationId,
              description: description,
              payment_type: "One-time",
              amount: `$${formatCurrency(itemTotal)}`
            });
          });
        }
      }
    });

    // Calculate total amount donated in the financial year
    const totalDonated = financialYearDonations.reduce(
      (sum, donation) => {
        if (donation.paymentType === "installments" && donation.installmentDetails?.installmentHistory) {
          // For installments, only add completed installment amounts
          const completedInstallments = donation.installmentDetails.installmentHistory
            .filter(installment => installment.status === "completed");
          return sum + completedInstallments.reduce((total, installment) => total + installment.amount, 0);
        } else if (donation.paymentType === "recurring") {
          // For recurring donations, calculate based on payment history
          if (donation.recurringDetails && donation.recurringDetails.paymentHistory && donation.recurringDetails.paymentHistory.length > 0) {
            const successfulPayments = donation.recurringDetails.paymentHistory
              .filter(payment => {
                const paymentDate = new Date(payment.date || donation.createdAt);
                return (payment.status === "succeeded" || payment.status === "completed") && 
                       paymentDate >= startDate && paymentDate <= endDate;
              });
            return sum + successfulPayments.reduce((total, payment) => 
              total + (payment.amount || donation.recurringDetails.amount), 0);
          } else if (donation.paymentStatus === "active" || donation.paymentStatus === "completed") {
            // If no payment history but donation is active/completed, include the amount
            return sum + (donation.recurringDetails?.amount || donation.totalAmount);
          }
          return sum;
        } else {
          // For one-time donations
          return sum + donation.totalAmount;
        }
      },
      0
    );
    
    // Generate a unique statement ID
    const statementId = generateUniqueStatementId(year, user.id);

    // Create new PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    
    // Set document properties
    doc.setProperties({
      title: `Annual Donation Statement FY ${year-1}-${year}`,
      subject: "Donation Statement",
      author: "HopeGive Foundation",
      keywords: "donation, tax, statement, receipt",
      creator: "Charity Donation Platform"
    });

    // Define margins and positioning
    const marginLeft = 20;
    const marginRight = doc.internal.pageSize.width - 20; 
    const marginTop = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

     // Add logos
     try {
       // Main logo (top left)
       doc.addImage(logo, "PNG", marginLeft, marginTop, 25, 20);
 
       // Tax deductible logo (top right)
       doc.addImage(taxDeductibleLogo, "PNG", marginRight - 40, marginTop, 40, 20);
     } catch (imageError) {
       console.warn("Could not load images:", imageError);
       // Continue without images
     }
 

    // Initial Y position for text content
    let yPos = marginTop + 28;

    // Add header - organization name
    doc.setFontSize(16);
    doc.setFont("helvetica");
    doc.text("HopeGive Foundation", marginLeft, yPos);
    
    // Reduce spacing between lines
    yPos += 7;

    // Annual statement title
    doc.setFontSize(12);
    doc.text("Annual Donation Statement", marginLeft, yPos);
    
    // Reduce spacing between lines
    yPos += 5;

    // Financial year
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Financial Year: July 1, ${year-1} - June 30, ${year}`, marginLeft, yPos);

    // Right-aligned section with ABN and receipt details
    doc.setFontSize(10);
    doc.text("ABN: 97 642 657 010", marginRight, marginTop + 28, { align: "right" });
    
    // Date issued
    doc.text(`Date Issued: ${formatDate(new Date())}`, marginRight, marginTop + 35, { align: "right" });

    // Statement ID
    doc.text(`Reference: ${statementId}`, marginRight, marginTop + 42, { align: "right" });

    // Add donor details
    yPos += 8;
    doc.setFontSize(10);
    doc.text(`Name: ${user.name || "N/A"}`, marginLeft, yPos);
    
    yPos += 4;
    doc.text(`Email: ${user.email || "N/A"}`, marginLeft, yPos);

    // Table header definition
    const headerData = {
      donation_date: "Donation Date",
      donation_id: "Donation ID",
      description: "Description",
      payment_type: "Payment Type",
      amount: "Amount",
    };

    // Start table after donor details with some spacing
    yPos += 10;

    // Draw table with separate header handling for better control
    let lastY = createTableWithSeparateHeader(
      doc,
      headerData,
      tableData,
      marginLeft,
      yPos
    );

    // Add total amount - right aligned
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Amount: $${formatCurrency(totalDonated)}`, marginRight, lastY + 10, { align: "right" });
    
    // Add tax information at the bottom
    lastY += 20;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 128, 0); // Green text
    doc.text("Tax Information", pageWidth / 2, lastY, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0); // Reset text color
    doc.text("All donations are tax-deductible to the extent allowed by law.", pageWidth / 2, lastY + 6, { align: "center" });
    doc.text("This statement is for tax purposes only. Please retain for your records.", pageWidth / 2, lastY + 12, { align: "center" });
    
    // Add footer text with website, email, and phone info
    const footerText = 
      "www.hopegive.org | info@hopegive.org | 1-800-HOPEGIVE";
    doc.setFontSize(8);
    doc.text(footerText, pageWidth / 2, pageHeight - 15, { align: "center" });
    
    // Add page numbers
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 8);
    }
    
    // Save the PDF
    const fileName = `donation_statement_fy_${year-1}_${year}.pdf`;
    doc.save(fileName);
    
    return { success: true, message: "Annual donation statement generated successfully" };
  } catch (error) {
    console.error("Error generating annual statement:", error);
    return { success: false, message: "Failed to generate annual statement. Please try again." };
  }
};

// Function to get available financial years from donation history
export const getAvailableFinancialYears = (donations) => {
  if (!donations || donations.length === 0) return [];
  
  const years = new Set();
  donations.forEach(donation => {
    const donationDate = new Date(donation.createdAt);
    // Financial year ends on June 30, so if the date is after June 30, 
    // it belongs to the next financial year
    const financialYear = donationDate.getMonth() > 5 
      ? donationDate.getFullYear() + 1 
      : donationDate.getFullYear();
    
    years.add(financialYear);
  });
  
  return Array.from(years).sort((a, b) => b - a); // Sort in descending order
};