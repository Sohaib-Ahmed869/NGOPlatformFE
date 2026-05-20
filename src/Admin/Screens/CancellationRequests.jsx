import React, { useState, useEffect } from "react";
import PageLoader from "../../components/PageLoader";
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Clock,
  User,
  DollarSign,
} from "lucide-react";
import axiosInstance from "../../services/axios";
import toast from "react-hot-toast";
import Modal from "../../components/Modal";

const CancellationRequests = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [denialReason, setDenialReason] = useState("");

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axiosInstance.get(
        "/admin/subscriptions/cancellation-requests/pending"
      );

      if (response.data?.status === "Success") {
        setPendingRequests(response.data.pendingRequests || []);
      } else {
        setError("Failed to fetch cancellation requests");
      }
    } catch (error) {
      console.error("Error fetching cancellation requests:", error);
      setError(
        error?.response?.data?.message ||
          "Failed to fetch cancellation requests"
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPendingRequests();
  };

  const handleApprove = async () => {
    try {
      if (!selectedRequest) return;

      const response = await axiosInstance.post(
        `/admin/subscriptions/${selectedRequest._id}/cancellation/approve`
      );

      if (response.data?.status === "Success") {
        toast.success("Cancellation request approved successfully");
        fetchPendingRequests();
        setShowApproveDialog(false);
      } else {
        toast.error("Failed to approve cancellation request");
      }
    } catch (error) {
      console.error("Error approving cancellation request:", error);
      toast.error(
        error?.response?.data?.message ||
          "Failed to approve cancellation request"
      );
    }
  };

  const handleDeny = async () => {
    try {
      if (!selectedRequest) return;

      const response = await axiosInstance.post(
        `/admin/subscriptions/${selectedRequest._id}/cancellation/deny`,
        { reason: denialReason }
      );

      if (response.data?.status === "Success") {
        toast.success("Cancellation request denied successfully");
        fetchPendingRequests();
        setShowDenyDialog(false);
        setDenialReason("");
      } else {
        toast.error("Failed to deny cancellation request");
      }
    } catch (error) {
      console.error("Error denying cancellation request:", error);
      toast.error(
        error?.response?.data?.message || "Failed to deny cancellation request"
      );
    }
  };

  const filteredRequests = pendingRequests.filter((request) => {
    const searchTermLower = searchTerm.toLowerCase();
    const userName = request.user?.name?.toLowerCase() || "";
    const userEmail = request.user?.email?.toLowerCase() || "";
    const subscriptionId = request._id?.toLowerCase() || "";
    const reason =
      request.cancellationDetails?.reason?.toLowerCase() || "";

    return (
      userName.includes(searchTermLower) ||
      userEmail.includes(searchTermLower) ||
      subscriptionId.includes(searchTermLower) ||
      reason.includes(searchTermLower)
    );
  });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "N/A";
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Subscription Cancellation Requests
        </h1>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-accent bg-background rounded-md hover:bg-accent/10"
          disabled={refreshing}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by donor name, email, ID, or reason..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <PageLoader text="Loading cancellation requests..." />
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="mt-2">{error}</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No pending cancellation requests found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Donor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscription Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cancellation Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {request.user?.name || "Unknown"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.user?.email || "No email"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center">
                      <DollarSign className="w-4 h-4 mr-1 text-gray-500" />
                      {formatCurrency(request.totalAmount)}
                      <span className="mx-1">•</span>
                      <Clock className="w-4 h-4 mr-1 text-gray-500" />
                      {request.recurringDetails?.frequency || "Unknown"}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center mt-1">
                      <Calendar className="w-4 h-4 mr-1" />
                      Started: {formatDate(request.recurringDetails?.startDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {request.cancellationDetails?.reason || "No reason provided"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(request.cancellationDetails?.date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowApproveDialog(true);
                        }}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-accent bg-background rounded-md hover:bg-accent/10"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDenyDialog(true);
                        }}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Deny
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve Dialog */}
      <Modal
        isOpen={showApproveDialog}
        onClose={() => setShowApproveDialog(false)}
        title="Approve Cancellation Request"
      >
        <div className="p-4">
          <div className="mb-4">
            <p className="text-gray-700">
              Are you sure you want to approve this cancellation request? This will
              permanently cancel the subscription and stop future payments.
            </p>
            {selectedRequest && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <div className="flex items-center mb-2">
                  <User className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="font-medium">
                    {selectedRequest.user?.name || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center mb-2">
                  <DollarSign className="w-4 h-4 mr-2 text-gray-500" />
                  <span>
                    {formatCurrency(selectedRequest.totalAmount)} •{" "}
                    {selectedRequest.recurringDetails?.frequency || "Unknown"}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowApproveDialog(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-light"
            >
              Confirm Approval
            </button>
          </div>
        </div>
      </Modal>

      {/* Deny Dialog */}
      <Modal
        isOpen={showDenyDialog}
        onClose={() => setShowDenyDialog(false)}
        title="Deny Cancellation Request"
      >
        <div className="p-4">
          <div className="mb-4">
            <p className="text-gray-700 mb-4">
              Are you sure you want to deny this cancellation request? The
              subscription will remain active and continue to process payments.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Denial (Optional)
              </label>
              <textarea
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                placeholder="Provide a reason for denying this request..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>
            {selectedRequest && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <div className="flex items-center mb-2">
                  <User className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="font-medium">
                    {selectedRequest.user?.name || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center mb-2">
                  <DollarSign className="w-4 h-4 mr-2 text-gray-500" />
                  <span>
                    {formatCurrency(selectedRequest.totalAmount)} •{" "}
                    {selectedRequest.recurringDetails?.frequency || "Unknown"}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDenyDialog(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeny}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Confirm Denial
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CancellationRequests;
