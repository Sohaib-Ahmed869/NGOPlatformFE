import React, { useState, useEffect } from "react";
import axiosInstance from "../../services/axios";
import PageLoader from "../../components/PageLoader";

const NewsletterSubscribersScreen = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSubscribers, setFilteredSubscribers] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    const fetchSubscribers = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get("/newsletters");
        setSubscribers(response.data);
        setFilteredSubscribers(response.data);
        setTotalPages(Math.ceil(response.data.length / 10));
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch subscribers. Please try again later.");
        setLoading(false);
      }
    };

    fetchSubscribers();
  }, []);

  useEffect(() => {
    const results = subscribers.filter((subscriber) =>
      subscriber.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSubscribers(results);
    setTotalPages(Math.ceil(results.length / 10));
    setCurrentPage(1);
  }, [searchTerm, subscribers]);

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getCurrentPageSubscribers = () => {
    const startIndex = (currentPage - 1) * 10;
    const endIndex = startIndex + 10;
    return filteredSubscribers.slice(startIndex, endIndex);
  };

  // Export to CSV function
  const exportToCSV = () => {
    try {
      setExportLoading(true);

      // Define which fields to include in the CSV
      const fields = ["email", "createdAt", "isActive"];

      // Create the CSV header row
      const header = ["Email", "Joined Date", "Status"].join(",");

      // Convert data to CSV rows
      const csvData = filteredSubscribers.map((subscriber) => {
        return fields
          .map((field) => {
            let value = subscriber[field];

            // Handle date formatting
            if (field === "createdAt" && value) {
              value = new Date(value).toISOString().split("T")[0];
            }

            // Handle boolean fields
            if (field === "isActive") {
              value = value === false ? "Unsubscribed" : "Active";
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
        `newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return <PageLoader text="Loading subscribers..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-center text-gray-800 mb-2">
            Error
          </h2>
          <p className="text-center text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 w-full bg-accent text-white py-2 px-4 rounded-md hover:bg-accent-light transition duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Newsletter Subscribers
            </h1>
            <p className="text-gray-600">
              Manage your newsletter subscriber list
            </p>
          </div>
          <button
            onClick={exportToCSV}
            disabled={exportLoading}
            className="mt-4 md:mt-0 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-light transition-all duration-300 shadow-sm flex items-center gap-2"
          >
            {exportLoading ? (
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
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
            ) : (
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
            )}
            Export to CSV
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search subscribers by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-white"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-400 absolute left-3 top-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <h3 className="text-gray-600 font-medium mb-1">
              Total Subscribers
            </h3>
            <p className="text-3xl font-bold text-gray-800">
              {subscribers.length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <h3 className="text-gray-600 font-medium mb-1">
              Active Subscribers
            </h3>
            <p className="text-3xl font-bold text-gray-800">
              {subscribers.filter((s) => s.isActive !== false).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <h3 className="text-gray-600 font-medium mb-1">
              Recent Subscribers
            </h3>
            <p className="text-3xl font-bold text-gray-800">
              {
                subscribers.filter((s) => {
                  const oneMonthAgo = new Date();
                  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                  return new Date(s.createdAt) >= oneMonthAgo;
                }).length
              }
            </p>
          </div>
        </div>

        {filteredSubscribers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-gray-400 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No subscribers found
            </h2>
            <p className="text-gray-600">
              {searchTerm
                ? `No results for "${searchTerm}"`
                : "Add subscribers to get started."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"
                    >
                      Joined
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getCurrentPageSubscribers().map((subscriber, index) => (
                    <tr
                      key={subscriber._id || index}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {subscriber.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {subscriber.createdAt
                            ? formatDate(subscriber.createdAt)
                            : "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            subscriber.isActive === false
                              ? "bg-red-100 text-red-800"
                              : "bg-accent/10 text-primary"
                          }`}
                        >
                          {subscriber.isActive === false
                            ? "Unsubscribed"
                            : "Active"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 mb-8">
            <div className="text-sm text-gray-700">
              Showing{" "}
              {filteredSubscribers.length ? (currentPage - 1) * 10 + 1 : 0} to{" "}
              {Math.min(currentPage * 10, filteredSubscribers.length)} of{" "}
              {filteredSubscribers.length} entries
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
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
                    onClick={() => handlePageChange(pageNumber)}
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
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg ${
                  currentPage === totalPages
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
        )}
      </div>
    </div>
  );
};

export default NewsletterSubscribersScreen;
