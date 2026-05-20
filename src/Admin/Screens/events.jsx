import React, { useState, useEffect } from "react";
import PageLoader from "../../components/PageLoader";
import {
  Calendar,
  Plus,
  Search,
  Edit2,
  Trash2,
  Image as ImageIcon,
  MapPin,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import axiosInstance from "../../services/axios";

const EventForm = ({ event = {}, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    title: event?.title || "",
    description: event?.description || "",
    date: event?.date ? new Date(event.date).toISOString().split("T")[0] : "",
    startTime: event?.startTime || "",
    endTime: event?.endTime || "",
    timezone: event?.timezone || "UTC",
    location: {
      city: event?.location?.city || "",
      venue: event?.location?.venue || "",
      address: event?.location?.address || "",
    },
    imageUrl: event?.imageUrl || "",
    registrationLink: event?.registrationLink || "",
    status: event?.status || "upcoming",
    _id: event?._id || null,
  });

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(event?.imageUrl || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Create a FormData object for the submission
    const submitData = new FormData();

    // Add all the basic fields
    submitData.append("title", formData.title);
    submitData.append("description", formData.description);
    submitData.append("date", formData.date);
    submitData.append("startTime", formData.startTime);
    submitData.append("endTime", formData.endTime);
    submitData.append("timezone", formData.timezone);
    submitData.append("registrationLink", formData.registrationLink);
    submitData.append("status", formData.status);

    // Add the location as JSON
    submitData.append("location[city]", formData.location.city);
    submitData.append("location[venue]", formData.location.venue);
    submitData.append("location[address]", formData.location.address);

    // Add the image if a new one was selected
    if (image) {
      submitData.append("image", image);
    } else if (formData.imageUrl && !event?._id) {
      // If it's a new event and we have an imageUrl but no file, we should report that
      alert("Please upload an image for the event");
      setIsSubmitting(false);
      return;
    }

    // If it's an edit, add the ID
    if (event?._id) {
      submitData.append("_id", event._id);
    }

    onSubmit(submitData);
  };

  useEffect(() => {
    // Reset form when event changes
    if (event) {
      console.log("Event data loaded for editing:", event);
      setFormData({
        title: event?.title || "",
        description: event?.description || "",
        date: event?.date
          ? new Date(event.date).toISOString().split("T")[0]
          : "",
        startTime: event?.startTime || "",
        endTime: event?.endTime || "",
        timezone: event?.timezone || "UTC",
        location: {
          city: event?.location?.city || "",
          venue: event?.location?.venue || "",
          address: event?.location?.address || "",
        },
        imageUrl: event?.imageUrl || "",
        registrationLink: event?.registrationLink || "",
        status: event?.status || "upcoming",
        _id: event?._id || null,
      });
      setImage(null);
      setImagePreview(event?.imageUrl || null);
    }
  }, [event]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            {event?._id ? "Edit Event" : "Create Event"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Image
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="mx-auto h-48 w-96 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setImage(null);
                          // Only clear imageUrl if it's a new form or we're explicitly replacing the image
                          if (!event?._id) {
                            setFormData((prev) => ({ ...prev, imageUrl: "" }));
                          }
                        }}
                        className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-accent hover:text-accent">
                          <span>Upload a file</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Event Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-accent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-accent"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Event Date
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-accent"
              />
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Time
                </label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startTime: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  End Time
                </label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endTime: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-accent"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  required
                  value={formData.location.city}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: { ...prev.location, city: e.target.value },
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Venue
                </label>
                <input
                  type="text"
                  required
                  value={formData.location.venue}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: { ...prev.location, venue: e.target.value },
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  type="text"
                  required
                  value={formData.location.address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: { ...prev.location, address: e.target.value },
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-accent"
                />
              </div>
            </div>

            {/* Registration Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Registration Link
              </label>
              <input
                type="url"
                value={formData.registrationLink}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    registrationLink: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-accent"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, status: e.target.value }))
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-accent"
              >
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-light disabled:opacity-70"
            >
              {isSubmitting
                ? event?._id
                  ? "Saving..."
                  : "Creating..."
                : event?._id
                ? "Save Changes"
                : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EventCard = ({ event, onEdit, onDelete }) => {
  // Format the date for display
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Handle edit click
  const handleEditClick = () => {
    console.log("Edit button clicked for event:", event);
    onEdit(event);
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="relative h-48">
        <img
          src={event.imageUrl || "/placeholder-image.jpg"}
          alt={event.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            console.error("Failed to load image:", e.target.src);
            e.target.onerror = null;
            e.target.src = "/placeholder-image.jpg"; // Fallback image
          }}
        />
        <div className="absolute top-0 right-0 m-2">
          <button
            onClick={handleEditClick}
            className="p-1 bg-white rounded-full shadow-lg hover:bg-gray-100"
          >
            <Edit2 className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-medium text-gray-900">{event.title}</h3>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              event.status === "upcoming"
                ? "bg-accent/10 text-primary"
                : event.status === "ongoing"
                ? "bg-accent/10 text-blue-800"
                : event.status === "cancelled"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </span>
        </div>

        <p className="mt-2 text-sm text-gray-500 line-clamp-2">
          {event.description}
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="w-4 h-4 mr-2" />
            {event.location?.city}, {event.location?.venue}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-2" />
            {formatDate(event.date)} {event.startTime} - {event.endTime}
          </div>
        </div>

        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={() => onDelete(event._id)}
            className="p-2 text-gray-600 hover:text-red-600 transition-colors"
            aria-label="Delete event"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [searchTerm, page]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get(
        `/admin/events?page=${page}&search=${searchTerm}`
      );
      const data = response.data;
    // Sort events based on the event date in ascending order
      const sortedEvents = data.events.sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      setEvents(sortedEvents);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error("Failed to fetch events:", error);
      setError("Failed to load events. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (formData) => {
    try {
      await axiosInstance.post("/admin/events", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Refresh events list
      fetchEvents();
      setShowForm(false);
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event. Please try again.");
    }
  };

  const handleEdit = async (formData) => {
    try {
      const eventId = formData.get("_id");
      console.log("Updating event with ID:", eventId);

      await axiosInstance.put(`/admin/events/${eventId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Refresh events list
      fetchEvents();
      setShowForm(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Failed to update event. Please try again.");
    }
  };

  const handleDelete = async (eventId) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        await axiosInstance.delete(`/admin/events/${eventId}`);

        // Refresh events list
        fetchEvents();
      } catch (error) {
        console.error("Error deleting event:", error);
        alert("Failed to delete event. Please try again.");
      }
    }
  };

  const openEditForm = (event) => {
    console.log("Opening edit form for event:", event);
    setSelectedEvent(event);
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Events</h1>
        <button
          onClick={() => {
            setSelectedEvent(null);
            setShowForm(true);
          }}
          className="flex items-center px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-light"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Event
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <input
              type="text"
              placeholder="Search events..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent w-full md:w-64"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1); // Reset to first page on new search
              }}
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <PageLoader />
      ) : (
        <>
          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard
                key={event._id}
                event={event}
                onEdit={openEditForm}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Empty State */}
          {events.length === 0 && !loading && !error && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900">
                No events found
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Get started by creating a new event.
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-6">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="p-2 border rounded-md disabled:opacity-50"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={page === totalPages}
                className="p-2 border rounded-md disabled:opacity-50"
                aria-label="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Event Form Modal */}
      {showForm && (
        <EventForm
          event={selectedEvent}
          onSubmit={selectedEvent ? handleEdit : handleCreate}
          onClose={() => {
            setShowForm(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
};

export default EventsPage;
