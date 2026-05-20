import React, { useState, useEffect } from "react";
import PageLoader from "../../components/PageLoader";
import {
  Calendar,
  CreditCard,
  AlertCircle,
  PauseCircle,
  Edit2,
  PlayCircle,
  XCircle,
  Loader,
  X,
  RefreshCw,
  DollarSign,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-hot-toast";
import SubscriptionService from "../../services/subscription.service";
import DonationService from "../../services/donation.service.jsx"; // Corrected import path

// Modal component
const Modal = ({ isOpen, onClose, title, description, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

const ActiveSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [installments, setInstallments] = useState([]); // Added installments state
  const [loading, setLoading] = useState(true);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [pauseDuration, setPauseDuration] = useState(30);
  const [pauseReason, setPauseReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [additionalPayments, setAdditionalPayments] = useState(0);
  const [currentEndDate, setCurrentEndDate] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    let activeSubs = [];
    let activeInst = [];
    try {
      // Fetch all user donations and filter for both recurring subscriptions and installments
      const donationsResponse = await DonationService.getUserDonations();
      console.log("Raw donationsResponse:", donationsResponse);

      if (donationsResponse && donationsResponse.status === 'Success' && Array.isArray(donationsResponse.orders)) {
        // Filter for recurring subscriptions
        const recurringDonations = donationsResponse.orders.filter(
          (order) =>
            order.paymentType === "recurring" &&
            order.paymentStatus !== "cancelled" &&
            order.paymentStatus !== "failed" &&
            order.paymentStatus !== "canceled" &&
            order.paymentStatus !== "ended" &&
            // Only show subscriptions that are still active (not ended)
            (!order.recurringDetails?.endDate || new Date(order.recurringDetails.endDate) > new Date())
        );
        
        console.log("Recurring donations found:", recurringDonations.length);
        
        // Format the recurring donations to match the subscription format expected by the UI
        activeSubs = recurringDonations.map(order => ({
          id: order._id,
          cause: order.items[0]?.title,
          amount: order.recurringDetails?.amount || order.totalAmount,
          frequency: order.recurringDetails?.frequency || 'monthly',
          status: order.paymentStatus,
          nextPayment: order.recurringDetails?.nextPaymentDate,
          paymentMethod: order.paymentMethod || 'Card',
          stripeSubscriptionId: order.transactionDetails?.stripeSubscriptionId,
          endDate: order.recurringDetails?.endDate,
          paymentType: "recurring"
        }));
        
        console.log("Formatted active subscriptions:", activeSubs);
        setSubscriptions(activeSubs);

        // Filter for installment plans
        const installmentDonations = donationsResponse.orders.filter(
          (order) =>
            order.paymentType === "installments" &&
            order.paymentStatus !== "cancelled" &&
            order.paymentStatus !== "failed" &&
            order.paymentStatus !== "canceled" &&
            order.paymentStatus !== "ended" &&
            // Only include installments that still have payments remaining
            order.installmentDetails?.installmentsPaid < order.installmentDetails?.numberOfInstallments
        );
        
        console.log("Installment donations found:", installmentDonations.length);
        
        // Format the installment donations
        activeInst = installmentDonations.map(order => ({
          id: order._id,
          cause: order.items[0]?.title,
          amount: order.installmentDetails?.installmentAmount || order.totalAmount / order.installmentDetails?.numberOfInstallments,
          status: order.paymentStatus,
          nextPayment: order.installmentDetails?.nextPaymentDate,
          paymentMethod: order.paymentMethod || 'Card',
          stripeSubscriptionId: order.transactionDetails?.stripeSubscriptionId,
          remainingInstallments: order.installmentDetails?.numberOfInstallments - order.installmentDetails?.installmentsPaid,
          totalInstallments: order.installmentDetails?.numberOfInstallments,
          paymentType: "installments"
        }));
        
        console.log("Formatted active installments:", activeInst);
        setInstallments(activeInst);
      } else {
        console.warn("DonationService.getUserDonations did not return the expected data structure.", donationsResponse);
      }

    } catch (error) {
      console.error("Fetch error:", error);
      toast.error(
        error?.response?.data?.message || "Failed to fetch active plans"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshSubscriptions = async () => {
    setRefreshing(true);
    try {
      await fetchSubscriptions();
      toast.success("Subscriptions refreshed");
    } catch (error) {
      toast.error("Failed to refresh subscriptions");
    } finally {
      setRefreshing(false);
    }
  };

  const handlePause = async () => {
    try {
      await SubscriptionService.pauseSubscription(
        selectedSubscription.id,
        pauseDuration,
        pauseReason
      );
      toast.success("Subscription paused successfully");
      fetchSubscriptions();
      setShowPauseDialog(false);
    } catch (error) {
      console.error("Pause error:", error);
      toast.error(
        error?.response?.data?.message || "Failed to pause subscription"
      );
    }
  };

  const handleResume = async (subscriptionId) => {
    try {
      await SubscriptionService.resumeSubscription(subscriptionId);
      toast.success("Subscription resumed successfully");
      fetchSubscriptions();
    } catch (error) {
      console.error("Resume error:", error);
      toast.error(
        error?.response?.data?.message || "Failed to resume subscription"
      );
    }
  };

  const handleCancel = async () => {
    try {
      await SubscriptionService.cancelSubscription(
        selectedSubscription.id,
        cancelReason
      );
      toast.success("Cancellation request submitted successfully. Your request is pending admin approval.");
      fetchSubscriptions();
      setShowCancelDialog(false);
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error(
        error?.response?.data?.message || "Failed to submit cancellation request"
      );
    }
  };

  const handleUpdateEndDate = async () => {
    try {
      if (!newEndDate) {
        toast.error("Please select a valid end date");
        return;
      }

      const selectedDate = new Date(newEndDate);
      const today = new Date();

      if (selectedDate <= today) {
        toast.error("End date must be in the future");
        return;
      }

      await SubscriptionService.updateSubscriptionEndDate(
        selectedSubscription.id,
        newEndDate
      );

      toast.success("Subscription end date updated successfully");
      fetchSubscriptions();
      setShowEditDialog(false);
    } catch (error) {
      console.error("Update end date error:", error);
      toast.error(
        error?.response?.data?.message ||
          "Failed to update subscription end date"
      );
    }
  };
  const handleRetryPayment = async () => {
    try {
      if (!selectedSubscription || !selectedSubscription.stripeSubscriptionId) {
        toast.error("Cannot retry payment for this subscription");
        return;
      }

      await SubscriptionService.retryPayment(selectedSubscription.id);
      toast.success("Payment retry initiated");
      fetchSubscriptions();
      setShowPaymentDialog(false);
    } catch (error) {
      console.error("Retry payment error:", error);
      toast.error(error?.response?.data?.message || "Failed to retry payment");
    }
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-accent/10 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "past_due":
        return "bg-red-100 text-red-800";
      case "pending_cancellation":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const displayStatus = (status) => {
    // Format status for display
    if (status.toLowerCase() === "pending_cancellation") {
      return "Cancellation Pending";
    }
    // Capitalize first letter for other statuses
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const totalMonthly = subscriptions
    .filter((sub) => sub.status.toLowerCase() === "active")
    .reduce((acc, sub) => acc + sub.amount, 0);

  // Add these helper functions
  const formatDateForInput = (date) => {
    return date.toISOString().split("T")[0];
  };

  const calculateDefaultEndDate = (subscription) => {
    // Calculate a default end date if none exists (e.g., 12 months from now)
    const date = new Date();
    date.setMonth(date.getMonth() + 12);
    return date;
  };

  const calculateAdditionalPayments = (subscription, newDate) => {
    const currentDate = new Date(
      subscription.endDate
    );
    const frequency = subscription.frequency.toLowerCase();

    let monthsDiff = 0;

    switch (frequency) {
      case "monthly":
        monthsDiff =
          (newDate.getFullYear() - currentDate.getFullYear()) * 12 +
          newDate.getMonth() -
          currentDate.getMonth();
        break;
      case "yearly":
        monthsDiff = (newDate.getFullYear() - currentDate.getFullYear()) * 12;
        break;
      case "weekly":
        monthsDiff = Math.floor(
          (newDate - currentDate) / (7 * 24 * 60 * 60 * 1000) / 4.33
        );
        break;
      default:
        monthsDiff =
          (newDate.getFullYear() - currentDate.getFullYear()) * 12 +
          newDate.getMonth() -
          currentDate.getMonth();
    }

    setAdditionalPayments(Math.max(0, monthsDiff));
  };

  if (loading) {
    return (
      <PageLoader />
    );
  }

  return (
    <div className="space-y-6 lg:p-6">
      {/* Header with Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-accent/10">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Active Subscriptions
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your recurring and installment donations
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-4">
            <button
              onClick={refreshSubscriptions}
              className="flex items-center px-3 py-2 text-sm bg-background text-accent rounded-lg hover:bg-accent/10 transition-colors"
              disabled={refreshing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Active Subscriptions Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-primary mb-4">Active recurring Subscriptions</h2>
        {subscriptions.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl shadow-sm border border-accent/10">
            <div className="flex justify-center">
              <AlertCircle className="w-12 h-12 text-accent" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No Active recurring Subscriptions
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              You don't have any active recurring donations at the moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="bg-white rounded-xl shadow-sm border border-accent/10 hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {subscription.cause}
                      </h3>
                      <p className="text-2xl font-bold text-accent mt-2">
                        ${subscription.amount.toFixed(2)}
                        <span className="text-sm text-gray-500 font-normal">
                          /{subscription.frequency.toLowerCase()}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(
                        subscription.status
                      )}`}
                    >
                      {displayStatus(subscription.status)}
                    </span>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      Next payment:{" "}
                      {new Date(subscription.nextPayment).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CreditCard className="w-4 h-4 mr-2" />
                      {subscription.paymentMethod}
                      {subscription.stripeSubscriptionId && (
                        <span className="ml-2 text-xs text-accent bg-background px-2 py-0.5 rounded-full">
                          Stripe
                        </span>
                      )}
                    </div>
                    {subscription.status.toLowerCase() === "past_due" && (
                      <div className="flex items-center text-sm text-red-600">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Payment failed - action needed
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedSubscription(subscription);
                        setShowEditDialog(true);
                        setNewEndDate(
                          formatDateForInput(
                            new Date(
                              subscription.endDate
                            )
                          )
                        );
                        setCurrentEndDate(
                          subscription.endDate
                        );
                        calculateAdditionalPayments(
                          subscription,
                          new Date(
                            subscription.endDate
                          )
                        );
                      }}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-accent bg-white border border-accent/20 rounded-lg hover:bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </button>

                    {subscription.status.toLowerCase() === "past_due" && (
                      <button
                        onClick={() => {
                          setSelectedSubscription(subscription);
                          setShowPaymentDialog(true);
                        }}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Retry Payment
                      </button>
                    )}

                    {subscription.status.toLowerCase() === "pending_cancellation" ? (
                      <div className="mt-2 p-3 bg-orange-50 text-orange-800 rounded-lg text-sm">
                        <p className="flex items-start">
                          <AlertCircle className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" />
                          <span>
                            Your cancellation request is pending approval. You will be notified once it's processed.
                          </span>
                        </p>
                      </div>
                    ) : subscription.status.toLowerCase() === "active" ? (
                      <></>
                    ) : (
                      subscription.status.toLowerCase() === "paused" && (
                        <button
                          onClick={() => handleResume(subscription.id)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-accent bg-white border border-green-200 rounded-lg hover:bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          <PlayCircle className="w-4 h-4 mr-1" />
                          Resume
                        </button>
                      )
                    )}

                    {subscription.status.toLowerCase() !== "pending_cancellation" && (
                      <button
                        onClick={() => {
                          setSelectedSubscription(subscription);
                          setShowCancelDialog(true);
                        }}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Installments Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-primary mb-4">Active Installments</h2>
        {installments.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl shadow-sm border border-accent/10">
            <div className="flex justify-center">
              <AlertCircle className="w-12 h-12 text-accent" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No Active Installments
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              You don't have any active installment plans at the moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {installments.map((installment) => (
              <div
                key={installment.id}
                className="bg-white rounded-xl shadow-sm border border-accent/10 hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {installment.cause}
                      </h3>
                      <p className="text-2xl font-bold text-accent mt-2">
                        ${installment.amount ? installment.amount.toFixed(2) : '0.00'}
                        <span className="text-sm text-gray-500 font-normal">
                          /monthly
                        </span>
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(
                        installment.status
                      )}`}
                    >
                      {displayStatus(installment.status)}
                    </span>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      Next payment:{" "}
                      {installment.nextPayment ? new Date(installment.nextPayment).toLocaleDateString() : 'Not scheduled'}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CreditCard className="w-4 h-4 mr-2" />
                      {installment.paymentMethod || 'Card'}
                    </div>
                    {installment.remainingInstallments && (
                      <div className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {installment.remainingInstallments} of {installment.totalInstallments} installments remaining
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {installment.status && installment.status.toLowerCase() === "past_due" && (
                      <button
                        onClick={() => {
                          setSelectedSubscription(installment);
                          setShowPaymentDialog(true);
                        }}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Retry Payment
                      </button>
                    )}

                    {installment.status && installment.status.toLowerCase() !== "pending_cancellation" && (
                      <button
                        onClick={() => {
                          setSelectedSubscription(installment);
                          setShowCancelDialog(true);
                        }}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pause Modal */}
      <Modal
        isOpen={showPauseDialog}
        onClose={() => setShowPauseDialog(false)}
        title="Pause Subscription"
        description="For how long would you like to pause your subscription?"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pause Duration (days)
            </label>
            <input
              type="number"
              value={pauseDuration}
              onChange={(e) => setPauseDuration(parseInt(e.target.value))}
              min="1"
              max="365"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reason (optional)
            </label>
            <input
              type="text"
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="Why are you pausing?"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setShowPauseDialog(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Cancel
            </button>
            <button
              onClick={handlePause}
              className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-light focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Confirm Pause
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        title="Cancel Subscription"
        description="Are you sure you want to cancel this subscription?"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Reason (optional)
          </label>
          <input
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Why are you cancelling?"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />

          <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
            <p className="flex items-start">
              <AlertCircle className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" />
              <span>
                This will permanently cancel your subscription and stop future
                payments. This action cannot be undone.
              </span>
            </p>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setShowCancelDialog(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Keep Subscription
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Confirm Cancellation
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Amount Modal */}
      <Modal
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        title="Update Subscription End Date"
        description="Select a new end date for your subscription"
      >
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Current End Date
            </label>
            <div className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-200">
              {new Date(currentEndDate).toLocaleDateString()}
            </div>
          </div>

          <label className="block text-sm font-medium text-gray-700">
            New End Date
          </label>
          <input
            type="date"
            value={newEndDate}
            onChange={(e) => {
              setNewEndDate(e.target.value);
              calculateAdditionalPayments(
                selectedSubscription,
                new Date(e.target.value)
              );
            }}
            min={formatDateForInput(new Date())}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />

          {additionalPayments > 0 && (
            <div className="mt-4 p-3 bg-background text-primary rounded-lg text-sm">
              <p className="flex items-start">
                <Calendar className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" />
                <span>
                  This will add approximately{" "}
                  <strong>{additionalPayments}</strong> additional{" "}
                  {selectedSubscription?.frequency.toLowerCase()} payments at $
                  {selectedSubscription?.amount.toFixed(2)} each.
                </span>
              </p>
            </div>
          )}

          <p className="mt-2 text-sm text-gray-500">
            Your subscription will continue until this date with the same
            payment amount and frequency.
          </p>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setShowEditDialog(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateEndDate}
              className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-light focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Update End Date
            </button>
          </div>
        </div>
      </Modal>

      {/* Retry Payment Modal */}
      <Modal
        isOpen={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        title="Retry Failed Payment"
        description="Your recent payment has failed. You can retry the payment now."
      >
        <div>
          <div className="bg-red-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-red-800">
              Your payment method may have expired or been declined. You can
              retry the payment with your current card on file.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Amount to be charged:</span>
              <span className="font-bold">
                ${selectedSubscription?.amount.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Payment method:</span>
              <span>Card ending in ****</span>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setShowPaymentDialog(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleRetryPayment}
              className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-light focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Retry Payment
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ActiveSubscriptions;
// Route: /user/subscriptions/active/recurring
