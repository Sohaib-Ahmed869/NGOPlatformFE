import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import axiosInstance from "../../services/axios";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await axiosInstance.get("/events");
        // Show only upcoming events, max 3
        const upcoming = (res.data || [])
          .filter((e) => e.status === "upcoming" || new Date(e.date) >= new Date())
          .slice(0, 3);
        setEvents(upcoming);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Don't render the section if no events
  if (!loading && events.length === 0) return null;

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-heading text-3xl md:text-4xl text-primary text-center font-bold mb-4">
          Upcoming Events
        </h2>
        <p className="text-text-muted text-center mb-12">
          Join us at our next fundraising event and be part of the change.
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {events.map((event) => (
              <motion.div
                key={event._id}
                className="rounded-2xl shadow-md hover:shadow-xl overflow-hidden bg-white flex flex-col border border-gray-100"
                variants={cardVariants}
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {event.imageUrl ? (
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-accent/10 flex items-center justify-center">
                    <Calendar className="w-10 h-10 text-accent/40" />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 text-sm text-accent font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(event.date)}</span>
                    {event.location?.city && (
                      <>
                        <span className="text-text-muted">&middot;</span>
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{event.location.city}</span>
                      </>
                    )}
                  </div>
                  <h3 className="text-xl font-heading font-bold text-primary mt-2">
                    {event.title}
                  </h3>
                  <p className="text-sm text-text-muted line-clamp-3 mt-2 flex-1">
                    {event.description}
                  </p>
                  {event.registrationLink ? (
                    <a
                      href={event.registrationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 w-full border-2 border-primary text-primary rounded-xl px-6 py-2 hover:bg-primary hover:text-white transition-colors font-semibold text-center block"
                    >
                      Register
                    </a>
                  ) : (
                    <Link
                      to="/events"
                      className="mt-6 w-full border-2 border-primary text-primary rounded-xl px-6 py-2 hover:bg-primary hover:text-white transition-colors font-semibold text-center block"
                    >
                      View Details
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {events.length > 0 && (
          <div className="text-center mt-10">
            <Link
              to="/events"
              className="text-sm text-accent font-semibold hover:underline"
            >
              View all events &rarr;
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default Events;
