import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import axiosInstance from "../../services/axios";
import { Eyebrow, CardHoverGlow } from "../../components/giving";

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const reduce = useReducedMotion();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await axiosInstance.get("/events");
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

  if (!loading && events.length === 0) return null;

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <section className="bg-background px-6 py-20 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow icon={Calendar}>Get together</Eyebrow>
            <h2 className="mt-3 font-heading text-3xl font-bold text-primary md:text-4xl">Upcoming events</h2>
            <p className="mt-3 max-w-2xl text-text-muted">Join us at our next event and be part of the change in person.</p>
          </div>
          {events.length > 0 && (
            <Link
              to="/events"
              className="inline-flex shrink-0 items-center gap-2 border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-accent/50 hover:text-accent"
            >
              View all events <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event, i) => (
              <motion.div
                key={event._id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: (i % 3) * 0.08 }}
                whileHover={reduce ? {} : { y: -6 }}
                className="group relative flex flex-col overflow-hidden border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
              >
                <CardHoverGlow />
                {event.imageUrl ? (
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="grid h-44 place-items-center bg-accent/10">
                    <Calendar className="h-10 w-10 text-accent/40" />
                  </div>
                )}
                <div className="relative flex flex-1 flex-col p-6">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-accent">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(event.date)}</span>
                    {event.location?.city && (
                      <>
                        <span className="text-text-muted">&middot;</span>
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{event.location.city}</span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-2 font-heading text-lg font-bold text-primary">{event.title}</h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm text-text-muted">{event.description}</p>
                  {event.registrationLink ? (
                    <a
                      href={event.registrationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 border border-primary text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
                    >
                      Register
                    </a>
                  ) : (
                    <Link
                      to="/events"
                      className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 border border-primary text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
                    >
                      View details
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}

export default Events;
