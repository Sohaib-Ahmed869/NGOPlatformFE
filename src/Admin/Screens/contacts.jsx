import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Download, RefreshCw, ClipboardList, Eye, Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import axiosInstance from "../../services/axios";
import KpiCard from "../../components/KpiCard";
import Loader from "../../components/Loader";

const ContactRequestsAdmin = () => {
  const [contactRequests, setContactRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [requestsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewRequest, setViewRequest] = useState(null);

  useEffect(() => {
    fetchContactRequests();
  }, []);

  const fetchContactRequests = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/contact");
      setContactRequests(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching contact requests:", error);
      setLoading(false);
    }
  };

  // Filter by search term and status
  const filteredRequests = contactRequests.filter((request) => {
    const matchesSearch =
      request.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.hostCity?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ? true : request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate pagination
  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = filteredRequests.slice(
    indexOfFirstRequest,
    indexOfLastRequest
  );
  const totalPages = Math.ceil(filteredRequests.length / requestsPerPage);
  const totalRequests = filteredRequests.length;

  const handleStatusChange = async (requestId, newStatus) => {
    try {
      // Here you would make an API call to update the status
      // await axiosInstance.put(`/api/contact/${requestId}/status`, { status: newStatus });

      // For now, just update the local state
      const updatedRequests = contactRequests.map((req) =>
        req._id === requestId ? { ...req, status: newStatus } : req
      );
      setContactRequests(updatedRequests);

      // Also update the viewRequest if it's open
      if (viewRequest && viewRequest._id === requestId) {
        setViewRequest({ ...viewRequest, status: newStatus });
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleViewRequest = (request) => {
    setViewRequest(request);
  };

  const closeViewModal = () => {
    setViewRequest(null);
  };

  // Export to CSV function
  const exportToCSV = () => {
    // Define which fields to include in the CSV
    const fields = [
      "fullName",
      "email",
      "phoneNumber",
      "hostCity",
      "purpose",
      "numberOfGuests",
      "minimumDonation",
      "wouldLikeToHostShahidAfridi",
      "description",
    ];

    // Create the CSV header row
    const header = [
      "Full Name",
      "Email",
      "Phone Number",
      "Host City",
      "Purpose",
      "Number of Guests",
      "Minimum Donation",
      "Host Guest Speaker",
      "Description",
    ].join(",");

    // Convert data to CSV rows
    const csvData = filteredRequests.map((request) => {
      return fields
        .map((field) => {
          let value = request[field];
          // Special handling for boolean fields
          if (field === "wouldLikeToHostShahidAfridi") {
            value = value ? "Yes" : "No";
          }
          // Format values with commas or quotes
          if (value === null || value === undefined) {
            return '""';
          }
          return typeof value === "string"
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(",");
    });

    // Combine header and rows
    const csv = [header, ...csvData].join("\n");

    // Create a blob and download link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `contact_requests_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <Loader label="Loading contact requests..." />;

  return (
    <motion.div
      className="lg:p-6 mt-20 lg:mt-0 space-y-6 bg-background/30 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">
            Contact Requests
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Manage and review incoming contact submissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-light transition-all duration-300 shadow-sm flex items-center gap-2 text-sm font-medium"
            onClick={exportToCSV}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center gap-2 text-sm font-medium"
            onClick={fetchContactRequests}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Total Requests"
          value={totalRequests}
          icon={ClipboardList}
          color="#059669"
          animate={false}
        />
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or city..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left px-4 py-3">
                  Name
                </th>
                <th className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left px-4 py-3">
                  Email
                </th>
                <th className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left px-4 py-3">
                  Phone
                </th>
                <th className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left px-4 py-3">
                  City
                </th>
                <th className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left px-4 py-3">
                  Purpose
                </th>
                <th className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentRequests.length > 0 ? (
                currentRequests.map((request) => (
                  <tr
                    key={request._id}
                    className="border-b border-gray-50 last:border-0 hover:bg-background/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {request.fullName}
                    </td>
                    <td className="px-4 py-3 text-sm text-accent">
                      {request.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {request.phoneNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {request.hostCity}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {request.purpose}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="p-2 rounded-xl bg-gray-50 hover:bg-accent/10 text-gray-500 hover:text-accent transition-all duration-200"
                        onClick={() => handleViewRequest(request)}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-16">
                    <Inbox className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-500">
                      No contact requests found
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your search or filters
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-gray-500">
              Showing{" "}
              {totalRequests ? (currentPage - 1) * requestsPerPage + 1 : 0} to{" "}
              {Math.min(currentPage * requestsPerPage, totalRequests)} of{" "}
              {totalRequests} entries
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-1.5 rounded-lg ${
                  currentPage === 1
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - (4 - i);
                } else {
                  pageNumber = currentPage - 2 + i;
                }

                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-colors ${
                      currentPage === pageNumber
                        ? "bg-accent text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`p-1.5 rounded-lg ${
                  currentPage === totalPages || totalPages === 0
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Request Modal */}
      {viewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div
            className="fixed inset-0 bg-black opacity-40 transition-opacity"
            onClick={closeViewModal}
          ></div>

          <div className="relative bg-white w-full max-w-3xl mx-auto rounded-lg shadow-2xl overflow-hidden transform transition-all">
            {/* Header */}
            <div className="bg-gray-100 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-800">
                Contact Request Details
              </h3>
              <button
                onClick={closeViewModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={viewRequest.fullName || ""}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="text"
                    value={viewRequest.email || ""}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={viewRequest.phoneNumber || ""}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Host City
                  </label>
                  <input
                    type="text"
                    value={viewRequest.hostCity || ""}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purpose
                  </label>
                  <input
                    type="text"
                    value={viewRequest.purpose || ""}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Guests
                  </label>
                  <input
                    type="text"
                    value={viewRequest.numberOfGuests || ""}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Donation
                  </label>
                  <input
                    type="text"
                    value={
                      viewRequest.minimumDonation
                        ? `$${viewRequest.minimumDonation}`
                        : ""
                    }
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Host Guest Speaker
                  </label>
                  <input
                    type="text"
                    value={
                      viewRequest.wouldLikeToHostShahidAfridi !== undefined
                        ? viewRequest.wouldLikeToHostShahidAfridi
                          ? "Yes"
                          : "No"
                        : ""
                    }
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    readOnly
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent h-24 resize-none"
                    value={viewRequest.description || ""}
                    readOnly
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 flex justify-end border-t border-gray-200">
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors duration-200"
                  onClick={closeViewModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ContactRequestsAdmin;
