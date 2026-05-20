import React, { useState, useEffect } from "react";
import axiosInstance from "../../services/axios";

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

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-6">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">
            Contact Requests Dashboard
          </h1>
          <div className="flex space-x-3">
            <button
              className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-light transition-all duration-300 shadow-sm flex items-center gap-2"
              onClick={exportToCSV}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Export to CSV
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-all duration-300 shadow-sm flex items-center gap-2"
              onClick={fetchContactRequests}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              Refresh Data
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-200">
            <div className="text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div className="text-gray-600 font-medium mt-3">Total Requests</div>
            <div className="text-3xl font-bold text-gray-800 mt-1">
              {totalRequests}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              All contact submissions
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="w-full md:w-1/3">
            <div className="flex">
              <input
                type="text"
                placeholder="Search by name, email, or city"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                value={searchTerm}
                onChange={handleSearch}
              />
              <button className="p-2 bg-gray-100 text-gray-600 rounded-r-lg border border-gray-300 border-l-0 hover:bg-gray-200 transition-colors duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Contact Requests Table */}
        <div className="bg-white overflow-x-auto rounded-lg shadow-sm mb-6 border border-gray-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-gray-600 font-semibold p-3 text-left border-b border-gray-200">
                  Name
                </th>
                <th className="text-gray-600 font-semibold p-3 text-left border-b border-gray-200">
                  Email
                </th>
                <th className="text-gray-600 font-semibold p-3 text-left border-b border-gray-200">
                  Phone
                </th>
                <th className="text-gray-600 font-semibold p-3 text-left border-b border-gray-200">
                  City
                </th>
                <th className="text-gray-600 font-semibold p-3 text-left border-b border-gray-200">
                  Purpose
                </th>
                <th className="text-gray-600 font-semibold p-3 text-left border-b border-gray-200">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8">
                    <div className="flex justify-center items-center">
                      <svg
                        className="animate-spin h-5 w-5 mr-3 text-gray-500"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span className="text-gray-600">
                        Loading contact requests...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : currentRequests.length > 0 ? (
                currentRequests.map((request) => (
                  <tr
                    key={request._id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="font-medium p-3 border-b border-gray-200">
                      {request.fullName}
                    </td>
                    <td className="text-accent p-3 border-b border-gray-200">
                      {request.email}
                    </td>
                    <td className="p-3 border-b border-gray-200">
                      {request.phoneNumber}
                    </td>
                    <td className="p-3 border-b border-gray-200">
                      {request.hostCity}
                    </td>
                    <td className="max-w-xs truncate p-3 border-b border-gray-200">
                      {request.purpose}
                    </td>

                    <td className="p-3 border-b border-gray-200">
                      <div className="flex space-x-2">
                        <button
                          className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all duration-200 group relative"
                          onClick={() => handleViewRequest(request)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          <span className="absolute invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 left-1/2 -translate-x-1/2 -top-8 whitespace-nowrap">
                            View Details
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 mx-auto mb-2 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="text-lg">No contact requests found</p>
                    <p className="text-sm text-gray-400">
                      Try adjusting your search or filters
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Updated to match DonationsPage style */}
        <div className="flex justify-between items-center mt-6 mb-8">
          <div className="text-sm text-gray-700">
            Showing{" "}
            {totalRequests ? (currentPage - 1) * requestsPerPage + 1 : 0} to{" "}
            {Math.min(currentPage * requestsPerPage, totalRequests)} of{" "}
            {totalRequests} entries
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg ${
                currentPage === 1
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-accent hover:bg-background"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
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
                  className={`px-3 py-1 rounded-lg ${
                    currentPage === pageNumber
                      ? "bg-accent text-white"
                      : "text-gray-600 hover:bg-background"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-2 rounded-lg ${
                currentPage === totalPages || totalPages === 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-accent hover:bg-background"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
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
      </div>
    </div>
  );
};

export default ContactRequestsAdmin;
