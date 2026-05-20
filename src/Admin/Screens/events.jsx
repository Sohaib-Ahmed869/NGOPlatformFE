import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Loader from "../../components/Loader";
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
  XCircle,
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="text-lg font-heading font-semibold text-primary">
            {event?._id ? "Edit Event" : "Create Event"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Event Image
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl hover:border-accent/40 transition-colors">
                <div className="flex justify-center px-6 pt-5 pb-6">
                  <div className="space-y-1 text-center">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="mx-auto h-48 w-96 object-cover rounded-xl"
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
                          className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 mt-2">
                          <label className="relative cursor-pointer rounded-xl font-medium text-accent hover:text-accent/80 transition-colors">
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
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Event Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Description <span className="text-red-500">*</span>
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
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all resize-none"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Event Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
              />
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Start Time <span className="text-red-500">*</span>
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  End Time <span className="text-red-500">*</span>
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                />
              </div>
            </div>

            {/* Location - City/Venue side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  City <span className="text-red-500">*</span>
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Venue <span className="text-red-500">*</span>
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Address <span className="text-red-500">*</span>
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
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
              />
            </div>

            {/* Registration Link */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
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
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
              >
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

          <div className="flex gap-3 mt-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
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
  const [deleteModal, setDeleteModal] = useState(null);
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

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await axiosInstance.delete(`/admin/events/${deleteModal}`);
      setDeleteModal(null);
      fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const openEditForm = (event) => {
    console.log("Opening edit form for event:", event);
    setSelectedEvent(event);
    setShowForm(true);
  };

  return (
    <motion.div
      className="lg:p-6 mt-20 lg:mt-0 space-y-6 bg-background/30 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">Events</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {events.length} event{events.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedEvent(null);
            setShowForm(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-light transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </button>
      </div>

      {/* Card wrapper with toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-colors"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mx-4 mt-4 flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <Loader />
          ) : (
            <>
              {/* Events Grid */}
              {events.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {events.map((event) => (
                    <EventCard
                      key={event._id}
                      event={event}
                      onEdit={openEditForm}
                      onDelete={(id) => setDeleteModal(id)}
                    />
                  ))}
                </div>
              ) : (
                /* Empty State */
                !error && (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <Calendar className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">No events found</p>
                    <p className="text-xs text-text-muted mt-1">
                      Get started by creating a new event.
                    </p>
                  </div>
                )
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-5 mt-5 border-t border-gray-100">
                  <span className="text-xs text-text-muted">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                      disabled={page === 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                      <button
                        key={pg}
                        onClick={() => setPage(pg)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${
                          pg === page
                            ? "bg-accent text-white"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {pg}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={page === totalPages}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModal(null)} />
            <motion.div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-primary mb-1">Delete Event?</h3>
              <p className="text-sm text-text-muted mb-5">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteModal(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={handleDelete}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EventsPage;
