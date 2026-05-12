import React, { useState, useEffect } from "react";
import {
  Calendar,
  CreditCard,
  AlertCircle,
  PlayCircle,
  History,
  Ban,
  Loader,
  RefreshCw,
  XCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import SubscriptionService from "../../services/subscription.service";
import DonationService from "../../services/donation.service";

const PreviousSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const refreshSubscriptions = () => {
    setRefreshing(true);
    fetchSubscriptions();
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      
      // Fetch all user donations
      const donationsResponse = await DonationService.getUserDonations();
      console.log("Raw donationsResponse:", donationsResponse);

      if (donationsResponse && donationsResponse.status === 'Success' && Array.isArray(donationsResponse.orders)) {
        // Filter for previous recurring subscriptions
        const previousSubs = donationsResponse.orders.filter(
          (order) => 
            order.paymentType === "recurring" &&
            (order.paymentStatus === "cancelled" || 
             order.paymentStatus === "paused" || 
             order.paymentStatus === "failed" || 
             order.paymentStatus === "ended")
        );
        
        console.log("Previous subscriptions found:", previousSubs.length);
        
        // Format the recurring donations
        const formattedSubs = previousSubs.map(order => ({
          id: order._id,
          cause: order.items[0]?.title,
          amount: order.recurringDetails?.amount || order.totalAmount,
          frequency: order.recurringDetails?.frequency || 'monthly',
          status: order.paymentStatus,
          nextPayment: order.recurringDetails?.nextPaymentDate,
          paymentMethod: order.paymentMethod || 'Card',
          stripeSubscriptionId: order.transactionDetails?.stripeSubscriptionId,
          endDate: order.recurringDetails?.endDate,
          paymentType: "recurring",
          cancellationDate: order.cancellationDate,
          cancellationReason: order.cancellationReason,
          pauseEndDate: order.pauseEndDate
        }));
        
        setSubscriptions(formattedSubs);
        
        // Filter for previous installments
        const previousInstallments = donationsResponse.orders.filter(
          (order) =>
            order.paymentType === "installments" &&
            (order.paymentStatus === "cancelled" || 
             order.paymentStatus === "failed" || 
             order.paymentStatus === "ended" ||
             (order.installmentDetails?.installmentsPaid >= order.installmentDetails?.numberOfInstallments))
        );
        
        console.log("Previous installments found:", previousInstallments.length);
        
        // Format the installment donations
        const formattedInstallments = previousInstallments.map(order => ({
          id: order._id,
          cause: order.items[0]?.title,
          amount: order.installmentDetails?.installmentAmount || order.totalAmount / order.installmentDetails?.numberOfInstallments,
          status: order.paymentStatus,
          nextPayment: order.installmentDetails?.nextPaymentDate,
          paymentMethod: order.paymentMethod || 'Card',
          stripeSubscriptionId: order.transactionDetails?.stripeSubscriptionId,
          remainingInstallments: order.installmentDetails?.numberOfInstallments - (order.installmentDetails?.installmentsPaid || 0),
          totalInstallments: order.installmentDetails?.numberOfInstallments,
          paymentType: "installments",
          cancellationDate: order.cancellationDate,
          cancellationReason: order.cancellationReason,
          installmentsPaid: order.installmentDetails?.installmentsPaid || 0
        }));
        
        setInstallments(formattedInstallments);
      } else {
        console.warn("DonationService.getUserDonations did not return the expected data structure.", donationsResponse);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error(
        error?.response?.data?.message || "Failed to fetch previous plans"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleResume = async (subscriptionId) => {
    try {
      await SubscriptionService.resumeSubscription(subscriptionId);
      toast.success("Subscription resumed successfully");
      fetchSubscriptions();
    } catch (error) {
      toast.error("Failed to resume subscription");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'completed':
      case 'ended':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  // Get status display text
  const getStatusDisplay = (status) => {
    if (!status) return 'Unknown';
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="space-y-6 lg:p-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#C9A84C]/10">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Previous Subscriptions & Installments
            </h1>
            <p className="text-gray-600 mt-1">
              View your paused, cancelled, ended and failed donations
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-4">
            <button
              onClick={refreshSubscriptions}
              className="flex items-center px-3 py-2 text-sm bg-[#FAF7F2] text-[#C9A84C] rounded-lg hover:bg-[#C9A84C]/10 transition-colors"
              disabled={refreshing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Previous Subscriptions Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-[#2C2418] mb-4">Previous Recurring Subscriptions</h2>
        {subscriptions.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl shadow-sm border border-[#C9A84C]/10">
            <div className="flex justify-center">
              <History className="w-12 h-12 text-[#C9A84C]" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No Previous Recurring Subscriptions
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              You don't have any paused or cancelled recurring donations.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              className="bg-white rounded-xl shadow-sm border border-[#C9A84C]/10 hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {subscription.cause}
                    </h3>
                    <p className="text-2xl font-bold text-[#C9A84C] mt-2">
                      {formatCurrency(subscription.amount)}
                      <span className="text-sm text-gray-500 font-normal ml-1">
                        /{subscription.frequency.toLowerCase()}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(subscription.status)}`}
                  >
                    {getStatusDisplay(subscription.status)}
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  {subscription.status === "paused" && subscription.pauseEndDate && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span>
                        Paused until: <span className="font-medium">{formatDate(subscription.pauseEndDate)}</span>
                      </span>
                    </div>
                  )}
                  
                  {(subscription.status === "cancelled" || subscription.status === "ended") && subscription.cancellationDate && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Ban className="w-4 h-4 mr-2 text-gray-400" />
                      <span>
                        {subscription.status === "cancelled" ? 'Cancelled' : 'Ended'} on:{" "}
                        <span className="font-medium">{formatDate(subscription.cancellationDate)}</span>
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
                    <span>Payment method: <span className="font-medium">{subscription.paymentMethod}</span></span>
                  </div>
                  
                  {subscription.endDate && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span>End date: <span className="font-medium">{formatDate(subscription.endDate)}</span></span>
                    </div>
                  )}
                </div>

                {subscription.status === "paused" && (
                  <div className="mt-6 flex space-x-3">
                    <button
                      onClick={() => handleResume(subscription.id)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-[#C9A84C] bg-white border border-green-200 rounded-lg hover:bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                    >
                      <PlayCircle className="w-4 h-4 mr-1.5" />
                      Resume
                    </button>
                  </div>
                )}

                {subscription.cancellationReason && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Cancellation reason:</span>{" "}
                      {subscription.cancellationReason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Previous Installments Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-[#2C2418] mb-4">Previous Installments</h2>
        {installments.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl shadow-sm border border-[#C9A84C]/10">
            <div className="flex justify-center">
              <History className="w-12 h-12 text-[#C9A84C]" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No Previous Installments
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              You don't have any completed or cancelled installment plans.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {installments.map((installment) => (
              <div
                key={installment.id}
                className="bg-white rounded-xl shadow-sm border border-[#C9A84C]/10 hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {installment.cause}
                      </h3>
                      <p className="text-2xl font-bold text-[#C9A84C] mt-2">
                        {formatCurrency(installment.amount)}
                        <span className="text-sm text-gray-500 font-normal ml-1">
                          /installment
                        </span>
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(installment.status)}`}
                    >
                      {getStatusDisplay(installment.status)}
                    </span>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
                      <span>Payment method: <span className="font-medium">{installment.paymentMethod}</span></span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 mr-2 text-gray-400" />
                      <span>
                        {installment.installmentsPaid} of {installment.totalInstallments} installments completed
                      </span>
                    </div>
                    
                    {(installment.status === 'cancelled' || installment.status === 'ended') && installment.cancellationDate && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Ban className="w-4 h-4 mr-2 text-gray-400" />
                        <span>
                          {installment.status === 'cancelled' ? 'Cancelled' : 'Ended'} on:{" "}
                          <span className="font-medium">{formatDate(installment.cancellationDate)}</span>
                        </span>
                      </div>
                    )}
                    
                    {installment.cancellationReason && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Cancellation reason:</span>{" "}
                          {installment.cancellationReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default PreviousSubscriptions;
