import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Loader from "../../components/Loader";
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
  ChevronLeft,
  ChevronRight,
  Inbox,
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

  // Pagination
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <motion.div
      className="lg:p-6 mt-20 lg:mt-0 space-y-6 bg-background/30 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">
            Cancellation Requests
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Review and manage subscription cancellation requests
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-accent bg-white border border-gray-200 rounded-xl hover:bg-background/50 transition-colors"
          disabled={refreshing}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by donor name, email, ID, or reason..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="text-xs text-text-muted whitespace-nowrap">
            {filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-8">
            <Loader label="Loading cancellation requests..." />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">Something went wrong</p>
            <p className="text-xs text-text-muted mt-1">{error}</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Inbox className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No pending requests</p>
            <p className="text-xs text-text-muted mt-1">
              There are no cancellation requests to review right now.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                      Donor
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                      Subscription Details
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                      Cancellation Reason
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                      Request Date
                    </th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequests.map((request) => (
                    <tr
                      key={request._id}
                      className="border-b border-gray-50 last:border-0 hover:bg-background/50 transition-colors"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {request.user?.name || "Unknown"}
                        </div>
                        <div className="text-xs text-text-muted">
                          {request.user?.email || "No email"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <DollarSign className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          {formatCurrency(request.totalAmount)}
                          <span className="mx-1.5 text-gray-300">|</span>
                          <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          {request.recurringDetails?.frequency || "Unknown"}
                        </div>
                        <div className="text-xs text-text-muted flex items-center mt-0.5">
                          <Calendar className="w-3.5 h-3.5 mr-1" />
                          Started: {formatDate(request.recurringDetails?.startDate)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm text-gray-700 max-w-[200px] truncate">
                          {request.cancellationDetails?.reason || "No reason provided"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {formatDate(request.cancellationDetails?.date)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowApproveDialog(true);
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDenyDialog(true);
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Deny
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <span className="text-xs text-text-muted">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      onClick={() => setCurrentPage(pg)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${
                        pg === currentPage
                          ? "bg-accent text-white"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {pg}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
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
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-xl hover:bg-accent-light transition-colors"
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
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"
                rows={3}
              />
            </div>
            {selectedRequest && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
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
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeny}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
            >
              Confirm Denial
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default CancellationRequests;
