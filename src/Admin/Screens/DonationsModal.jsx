import React, { useState } from "react";
import { X, Download, FileText, Printer, Eye, Check, AlertCircle, Calendar, CreditCard, MessageSquarePlus, Image as ImageIcon, Send, Loader2, CheckCircle2, Bell } from "lucide-react";
import { toast } from "react-hot-toast";

const DonationDetailsModal = ({ donation, onClose, onDownloadReceipt, onUpdateStatus, onPrintReceipt, onAddUpdate }) => {
  const [updateType, setUpdateType] = useState("follow-up");
  const [updateComment, setUpdateComment] = useState("");
  const [updateImages, setUpdateImages] = useState([]);
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  if (!donation) return null;

  // "Individual" donations are single / one-time contributions
  const isIndividualDonation =
    donation.paymentType === "single" ||
    donation.paymentType === "one-time" ||
    donation.paymentType === "one_time" ||
    !donation.paymentType;

  const donorUpdates = donation.donorUpdates || [];

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setUpdateImages((prev) => [...prev, ...files].slice(0, 5));
    e.target.value = "";
  };

  const removeImage = (idx) => {
    setUpdateImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitUpdate = async () => {
    if (!updateComment.trim() && updateImages.length === 0) {
      toast.error("Add a comment or at least one image");
      return;
    }
    if (!onAddUpdate) return;
    try {
      setSubmittingUpdate(true);
      await onAddUpdate(donation._id, {
        type: updateType,
        comment: updateComment.trim(),
        images: updateImages,
      });
      setUpdateComment("");
      setUpdateImages([]);
      setUpdateType("follow-up");
    } catch (error) {
      // error toast handled by parent
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format address from object to string
  const formatAddress = (address) => {
    if (!address) return "-";
    
    let addressParts = [];
    if (address.street) addressParts.push(address.street);
    if (address.city) addressParts.push(address.city);
    if (address.state) addressParts.push(address.state);
    if (address.postcode) addressParts.push(address.postcode);
    
    return addressParts.join(", ");
  };

  // Calculate subtotal from items
  const calculateSubtotal = () => {
    if (!donation.items || donation.items.length === 0) return 0;
    return donation.items.reduce((sum, item) => {
      return sum + (item.price || 0) * (item.quantity || 1);
    }, 0);
  };

  // Get admin contribution amount
  const getAdminContribution = () => {
    if (donation.adminCostContribution && donation.adminCostContribution.included) {
      return donation.adminCostContribution.amount;
    }
    return 0;
  };

  // Calculate total amount paid from payment history
  const getTotalPaidAmount = () => {
    if (donation.paymentType === "recurring" && donation.recurringDetails?.paymentHistory) {
      return donation.recurringDetails.paymentHistory
        .filter(payment => payment.status === "succeeded")
        .reduce((sum, payment) => sum + payment.amount, 0);
    }
    return donation.totalAmount || 0;
  };

  // Get payment status badge color
  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "succeeded":
      case "completed":
        return "bg-accent/10 text-primary";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-accent/10 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "ended":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Determine if receipt is downloadable
  const isReceiptAvailable = () => {
    if (donation.paymentType === "installments" && donation.installmentDetails) {
      return donation.installmentDetails.installmentsPaid > 0;
    }
    return (
      donation.paymentStatus === "completed" ||
      donation.paymentStatus === "processing" ||
      donation.paymentStatus === "ended"
    );
  };

  const handleApprove = async () => {
    try {
      await onUpdateStatus(donation._id, { 
        status: "completed",
        paymentStatus: "completed"
      });
      onClose();
    } catch (error) {
      console.error("Error approving donation:", error);
    }
  };

  const handleCancel = async () => {
    try {
      await onUpdateStatus(donation._id, { 
        status: "cancelled",
        paymentStatus: "cancelled"
      });
      onClose();
    } catch (error) {
      console.error("Error cancelling donation:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              Complete Donation Details
            </h2>
            <div className="flex space-x-2">
              {isReceiptAvailable() ? (
                <div className="flex space-x-2">
                  <button
                    onClick={onDownloadReceipt}
                    className="flex items-center text-accent hover:text-blue-800 px-3 py-1 rounded-lg border border-blue-200 hover:bg-background"
                    title="Download tax receipt as PDF"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Receipt
                  </button>
                  <button
                    onClick={onPrintReceipt}
                    className="flex items-center text-accent hover:text-primary px-3 py-1 rounded-lg border border-accent/20 hover:bg-background"
                    title="Print tax receipt"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic px-3 py-1">
                  {donation.paymentStatus === "pending" ? 
                    "Receipt available after payment completion" : 
                    "Receipt unavailable for this donation"}
                </div>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Amount and Status Header */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-3xl font-bold text-gray-800">
                {formatCurrency(donation.totalAmount)}
              </div>
              {donation.paymentType === "recurring" && (
                <div className="text-lg text-gray-600">
                  <span className="text-sm">Total Paid: </span>
                  <span className="font-semibold text-accent">
                    {formatCurrency(getTotalPaidAmount())}
                  </span>
                </div>
              )}
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(donation.paymentStatus)}`}
              >
                {donation.paymentStatus}
              </span>
              <span className="text-gray-500 ml-2">
                {formatDate(donation.createdAt)}
              </span>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              <span className="inline-block mr-8">
                <span className="font-medium">Donation ID:</span> {donation.donationId}
              </span>
              <span className="inline-block">
                <span className="font-medium">Payment Type:</span> {donation.paymentType}
              </span>
              {donation.receiptNumber && (
                <span className="inline-block ml-8">
                  <span className="font-medium">Receipt #:</span> {donation.receiptNumber}
                </span>
              )}
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Donor Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Donor Information
              </h3>
              <div className="space-y-4">
                {donation.donorDetails && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium text-gray-800">
                        {donation.donorDetails.name || "Anonymous"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-gray-800">
                        {donation.donorDetails.email || "-"}
                      </p>
                    </div>
                    {donation.donorDetails.phone && (
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium text-gray-800">
                          {donation.donorDetails.phone}
                        </p>
                      </div>
                    )}
                    {donation.donorDetails.address && (
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium text-gray-800">
                          {formatAddress(donation.donorDetails.address)}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Payment Information
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p className="font-medium text-gray-800 capitalize">
                    {donation.paymentMethod || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Type</p>
                  <p className="font-medium text-gray-800 capitalize">
                    {donation.paymentType}
                  </p>
                </div>
                
                {/* Conditional fields based on payment type */}
                {donation.paymentType === "installments" && donation.installmentDetails && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Installment Count</p>
                      <p className="font-medium text-gray-800">
                        {donation.installmentDetails.installmentsPaid} of {donation.installmentDetails.numberOfInstallments}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Next Installment Date</p>
                      <p className="font-medium text-gray-800">
                        {donation.installmentDetails.nextInstallmentDate 
                          ? formatDate(donation.installmentDetails.nextInstallmentDate) 
                          : "-"}
                      </p>
                    </div>
                  </>
                )}

                {donation.paymentType === "recurring" && donation.recurringDetails && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Recurring Frequency</p>
                      <p className="font-medium text-gray-800 capitalize">
                        {donation.recurringDetails.frequency}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Start Date</p>
                      <p className="font-medium text-gray-800">
                        {formatDate(donation.recurringDetails.startDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">End Date</p>
                      <p className="font-medium text-gray-800">
                        {formatDate(donation.recurringDetails.endDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Payments</p>
                      <p className="font-medium text-gray-800">
                        {donation.recurringDetails.paymentHistory?.length || 0} of {donation.recurringDetails.totalPayments || 0}
                      </p>
                    </div>
                    {donation.recurringDetails.status && (
                      <div>
                        <p className="text-sm text-gray-500">Subscription Status</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(donation.recurringDetails.status)}`}>
                          {donation.recurringDetails.status}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Donation Items */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              Donation Items
            </h3>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      On Behalf Of
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {donation.items && donation.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {item.title}
                        {item.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatCurrency(item.price || 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.quantity || 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.onBehalfOf || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency((item.price || 0) * (item.quantity || 1))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-4 bg-gray-50 rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody>
                  <tr className="border-b">
                    <td className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                      Subtotal
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-gray-800 w-32">
                      {formatCurrency(calculateSubtotal())}
                    </td>
                  </tr>
                  {getAdminContribution() > 0 && (
                    <tr className="border-b">
                      <td className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                        Admin Cost Contribution
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-gray-800">
                        {formatCurrency(getAdminContribution())}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-background">
                    <td className="px-6 py-3 text-right text-sm font-bold text-gray-800">
                      Total Per Payment
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-accent">
                      {formatCurrency(donation.totalAmount || 0)}
                    </td>
                  </tr>
                  {donation.paymentType === "recurring" && (
                    <tr className="bg-background">
                      <td className="px-6 py-3 text-right text-sm font-bold text-gray-800">
                        Total Paid Amount
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-bold text-accent">
                        {formatCurrency(getTotalPaidAmount())}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History for Recurring Donations */}
          {donation.paymentType === "recurring" && donation.recurringDetails?.paymentHistory && donation.recurringDetails.paymentHistory.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Payment History ({donation.recurringDetails.paymentHistory.length} payments)
              </h3>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {donation.recurringDetails.paymentHistory
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .map((payment, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDateTime(payment.date)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                          {payment.invoiceId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tax Receipt Information (if available) */}
          {isReceiptAvailable() && (
            <div className="mt-6 bg-background p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <FileText className="w-5 h-5 text-blue-700 mr-2" />
                <h3 className="text-md font-semibold text-blue-800">
                  Tax Receipt Information
                </h3>
              </div>
              <div className="text-sm text-blue-700 space-y-1">
                <p>
                  <span className="font-medium">Receipt Number:</span> {donation.receiptNumber || "Will be generated upon download"}
                </p>
                {donation.taxReceiptDetails && (
                  <>
                    <p>
                      <span className="font-medium">Date Issued:</span> {donation.taxReceiptDetails.dateIssued ? formatDate(donation.taxReceiptDetails.dateIssued) : "Will be generated upon download"}
                    </p>
                    {donation.taxReceiptDetails.taxDeductibleAmount && (
                      <p>
                        <span className="font-medium">Tax Deductible Amount:</span> {formatCurrency(donation.taxReceiptDetails.taxDeductibleAmount)}
                      </p>
                    )}
                  </>
                )}
                <p className="mt-2 italic">
                  {donation.paymentType === "recurring" 
                    ? "For recurring donations, separate receipts are available for each successful payment."
                    : "This donation may be tax-deductible. The receipt includes all information required for tax purposes."
                  }
                </p>
              </div>
            </div>
          )}

          {/* Cancellation Details (if applicable) */}
          {donation.paymentStatus === "cancelled" && donation.cancellationDetails && (
            <div className="mt-6 bg-red-50 p-4 rounded-lg">
              <h3 className="text-md font-semibold text-red-800 mb-2">
                Cancellation Details
              </h3>
              <p className="text-sm text-red-700">
                <span className="font-medium">Reason:</span> {donation.cancellationDetails.reason}
              </p>
              <p className="text-sm text-red-700">
                <span className="font-medium">Date:</span> {formatDate(donation.cancellationDetails.date)}
              </p>
            </div>
          )}

          {/* Donor Updates — follow-up / close-off (individual donations only) */}
          {isIndividualDonation && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-accent" />
                Donor Updates
              </h3>

              {/* Existing updates timeline */}
              {donorUpdates.length > 0 ? (
                <div className="space-y-3 mb-5">
                  {[...donorUpdates]
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((u, idx) => (
                      <div
                        key={u._id || idx}
                        className={`rounded-lg border p-4 ${
                          u.type === "close-off"
                            ? "border-green-200 bg-green-50"
                            : "border-blue-200 bg-blue-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              u.type === "close-off"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {u.type === "close-off" ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <MessageSquarePlus className="w-3.5 h-3.5" />
                            )}
                            {u.type === "close-off" ? "Close-off" : "Follow-up"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDateTime(u.createdAt)}
                          </span>
                        </div>
                        {u.comment && (
                          <p className="text-sm text-gray-700 whitespace-pre-line">
                            {u.comment}
                          </p>
                        )}
                        {u.images && u.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {u.images.map((img, i) => (
                              <a
                                key={i}
                                href={img}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={img}
                                  alt={`Update ${i + 1}`}
                                  className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                        {u.createdByName && (
                          <p className="text-xs text-gray-400 mt-2">
                            by {u.createdByName}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-5">
                  No updates shared with the donor yet.
                </p>
              )}

              {/* Add update form */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">
                  Send an update to the donor
                </h4>

                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setUpdateType("follow-up")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      updateType === "follow-up"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                    Follow-up
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateType("close-off")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      updateType === "close-off"
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Close-off
                  </button>
                </div>

                {updateType === "close-off" && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
                    A close-off marks this donation as completed and lets the
                    donor know their contribution has been delivered.
                  </p>
                )}

                <textarea
                  value={updateComment}
                  onChange={(e) => setUpdateComment(e.target.value)}
                  rows={3}
                  placeholder={
                    updateType === "close-off"
                      ? "Describe how the donation was used / delivered..."
                      : "Share a progress update with the donor..."
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none"
                />

                {/* Image previews */}
                {updateImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {updateImages.map((file, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Selected ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer">
                    <ImageIcon className="w-4 h-4" />
                    Add Images
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      disabled={updateImages.length >= 5}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleSubmitUpdate}
                    disabled={submittingUpdate}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-light disabled:opacity-50"
                  >
                    {submittingUpdate ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {updateType === "close-off" ? "Send Close-off" : "Send Update"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Up to 5 images. The donor will be notified by email.
                </p>
              </div>
            </div>
          )}

          {/* Bank Transfer Proof Section */}
          {donation.paymentMethod === "bank" && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-md font-semibold text-gray-900 mb-3">Payment Proof</h3>
              
              {donation.receiptUrl ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-blue-700 mr-2" />
                      <span className="text-sm font-medium">Proof of Payment</span>
                    </div>
                    <button
                      onClick={() => window.open(donation.receiptUrl, '_blank')}
                      className="text-accent hover:text-blue-800 text-sm flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Proof
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center text-yellow-800">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <p>No proof of payment has been uploaded yet.</p>
                  </div>
                  <p className="mt-2 text-sm text-yellow-700">
                    The donor has been notified to upload proof of payment.
                  </p>
                </div>
              )}
              
              {/* Always show action buttons for bank transfers in pending status */}
              {donation.paymentStatus === "pending" && (
                <div className="mt-4 flex space-x-4">
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-light flex items-center"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve Donation
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Donation
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationDetailsModal;