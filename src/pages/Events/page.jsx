import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axiosInstance from "../../services/axios";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { sectionReveal, staggerContainer, staggerItem } from "../../utils/animations";

// React Markdown + remark plugins for GitHub-flavored Markdown and breaks
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

// Static fallback events shown when the API returns an empty list
const fallbackEvents = [
  {
    id: "fallback-1",
    image:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80",
    title: "Annual Gala Dinner",
    description:
      "An evening of elegance and philanthropy featuring keynote speakers, live entertainment, and an exclusive auction.",
    date: "Saturday, December 15",
    time: "6:00 PM - 10:00 PM",
    location: "London, UK",
    registrationLink: null,
    status: "upcoming",
  },
  {
    id: "fallback-2",
    image:
      "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=600&q=80",
    title: "Charity Marathon",
    description:
      "Run for a cause! Join hundreds of runners raising funds for education and healthcare in underserved communities.",
    date: "Tuesday, January 20",
    time: "7:00 AM - 12:00 PM",
    location: "New York, USA",
    registrationLink: null,
    status: "upcoming",
  },
  {
    id: "fallback-3",
    image:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&q=80",
    title: "Fundraising Auction",
    description:
      "Bid on exclusive items and experiences while supporting clean water initiatives across three continents.",
    date: "Sunday, February 8",
    time: "3:00 PM - 7:00 PM",
    location: "Dubai, UAE",
    registrationLink: null,
    status: "upcoming",
  },
];

const Events = () => {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Helper: Insert newline before bullet characters (✅ or ♦) if not at start
  const processDescription = (desc) => {
    if (!desc) return desc;
    // Insert a newline before any bullet (✅ or ♦) that is not at the start of a line
    return desc.replace(/(?!^)([✅♦])/g, "\n$1");
  };

  // Helper: Wrap specific heading-like lines in bold markdown syntax.
  const processHeadings = (desc) => {
    if (!desc) return desc;
    // List of phrases you want to be bold
    const headings = [
      "Event Details",
      "How to Participate:",
      "Donation Details:",
      "📞 Contact for Registration:",
      "💳 Bank Transfer:",
    ];
    headings.forEach((heading) => {
      // Use multiline regex: for lines that exactly match the heading text.
      const regex = new RegExp(`^(${heading})$`, "gm");
      desc = desc.replace(regex, `**$1**`);
    });
    return desc;
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get("/events");
        const today = new Date();
        const upcoming = [];
        const past = [];

        response.data.forEach((event) => {
          const eventDate = new Date(event.date);
          const formattedEvent = {
            id: event._id,
            image: event.imageUrl,
            title: event.title,
            // Store description as provided (assumed to be Markdown or plain text)
            description: event.description,
            date: formatDate(eventDate),
            time: `${event.startTime} - ${event.endTime}`,
            location: `${event.location.city}, ${event.location.venue}`,
            registrationLink: event.registrationLink,
            status: event.status,
          };

          if (eventDate >= today && event.status !== "completed") {
            upcoming.push(formattedEvent);
          } else {
            past.push(formattedEvent);
          }
        });

        // Sort upcoming events (earliest first)
        upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
        // Sort past events (most recent first)
        past.sort((a, b) => new Date(b.date) - new Date(a.date));

        setUpcomingEvents(upcoming);
        setPastEvents(past);
        setError(null);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError("Failed to load events. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const formatDate = (date) => {
    const options = { weekday: "long", day: "numeric", month: "long" };
    return date.toLocaleDateString("en-US", options);
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = "https://via.placeholder.com/300";
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Page Header */}
      <div className="relative py-36 lg:py-44 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&q=80" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#4A3F30]/85 to-[#4A3F30]/65" />
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-[#F5EDE0]">Events</h1>
          <p className="mt-4 text-[#EDE4D3]/60 font-body max-w-2xl mx-auto">Join us at our upcoming gatherings</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700 text-justify">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Upcoming Events */}
            <h2 className="text-3xl font-bold mb-8 border-b-2 border-primary pb-2 inline-block">Upcoming Events</h2>
            {upcomingEvents.length === 0 ? (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}>
                {fallbackEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    variants={staggerItem}
                    className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col"
                  >
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-48 object-cover"
                      loading="lazy"
                    />
                    <div className="p-6 flex flex-col flex-1">
                      <span className="text-sm text-accent font-semibold">
                        {event.date} &middot; {event.location}
                      </span>
                      <h3 className="text-xl font-bold text-text-dark mt-2">
                        {event.title}
                      </h3>
                      <p className="text-sm text-text-muted line-clamp-3 mt-2 flex-1">
                        {event.description}
                      </p>
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="mt-6 w-full border-2 border-primary text-primary rounded-xl px-6 py-2 hover:bg-primary hover:text-white transition-colors font-semibold"
                      >
                        View Details
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}>
                {upcomingEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    variants={staggerItem}
                    className="bg-white rounded-2xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl border border-gray-100 hover:border-primary/30"
                  >
                    <div className="relative">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-64 object-cover"
                         loading="lazy"
                        onError={handleImageError}
                      />
                      <div className="absolute top-0 right-0 bg-primary text-white px-4 py-2 rounded-bl-lg font-semibold">
                        {event.date.split(',')[0]}
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-2xl font-bold mb-2 text-justify">{event.title}</h3>
                      <div className="flex flex-col space-y-2 mb-4">
                        <div className="flex items-center text-gray-600">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          <span>{event.date}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                          <span className="text-justify">{event.location}</span>
                        </div>
                      </div>
                      <div className="flex space-x-4 mt-6">
                        <button
                          onClick={() => setSelectedEvent(event)}
                          className="bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary-light transition-colors flex-1 flex items-center justify-center"
                        >
                          <span>More Details</span>
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                          </svg>
                        </button>
                        {event.registrationLink && (
                          <a
                            href={event.registrationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border border-primary text-primary px-4 py-2 rounded-xl hover:bg-background transition-colors flex-1 text-center"
                          >
                            Get Tickets
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Past Events */}
            <h2 className="text-3xl font-bold mb-8 border-b-2 border-primary pb-2 inline-block">Past Events</h2>
            {pastEvents.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No past events to display.
              </p>
            ) : (
              <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}>
                {pastEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    variants={staggerItem}
                    className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100"
                  >
                    <div className="relative">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-52 object-cover"
                         loading="lazy"
                        onError={handleImageError}
                      />
                      <div className="absolute top-0 left-0 bg-black bg-opacity-70 text-white px-3 py-1 m-2 rounded-md text-sm">
                        Past Event
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold mb-2 text-justify">{event.title}</h3>
                      <p className="text-gray-600 text-sm mb-1">{event.date}</p>
                      <p className="text-gray-600 text-sm mb-3 text-justify">{event.location}</p>
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="text-primary hover:text-primary font-medium flex items-center text-sm"
                      >
                        View Details
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Modal for Detailed Event View */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={() => setSelectedEvent(null)} // Close when clicking the backdrop
        >
          <div 
            className="bg-white rounded-2xl p-6 w-11/12 max-w-4xl relative max-h-[90vh] overflow-y-auto shadow-md"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the modal content
          >

            <div className="flex flex-col md:flex-row md:gap-8">
              <div className="md:w-1/2 mb-6 md:mb-0">
                <img
                  src={selectedEvent.image}
                  alt={selectedEvent.title}
                  className="w-full h-auto object-cover rounded-lg shadow-md"
                   loading="lazy"
                  onError={handleImageError}
                />

                <div className="mt-6 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <h3 className="font-bold text-lg mb-3 text-primary">Event Information</h3>
                  
                  <div className="flex items-start mb-3">
                    <svg className="w-5 h-5 mr-3 text-primary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <div>
                      <p className="font-medium">Date</p>
                      <p className="text-gray-600">{selectedEvent.date}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start mb-3">
                    <svg className="w-5 h-5 mr-3 text-primary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div>
                      <p className="font-medium">Time</p>
                      <p className="text-gray-600">{selectedEvent.time}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <svg className="w-5 h-5 mr-3 text-primary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-gray-600 text-justify">{selectedEvent.location}</p>
                    </div>
                  </div>
                </div>

                {selectedEvent.registrationLink && (
                  <a
                    href={selectedEvent.registrationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary-light transition-colors mt-6 w-full text-center font-medium"
                  >
                    Register for this Event
                  </a>
                )}
              </div>

              <div className="md:w-1/2">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-justify">{selectedEvent.title}</h2>
                
                {/* Description with Markdown, breaks, bold headings, and justified text */}
                <div className="prose prose-sm w-full max-w-full text-gray-700 leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      h1: ({ node, ...props }) => <h1 className="font-bold text-justify my-4" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="font-bold text-justify my-3" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="font-bold text-justify my-2" {...props} />,
                      h4: ({ node, ...props }) => <h4 className="font-bold text-justify my-2" {...props} />,
                      h5: ({ node, ...props }) => <h5 className="font-bold text-justify my-1" {...props} />,
                      h6: ({ node, ...props }) => <h6 className="font-bold text-justify my-1" {...props} />,
                      p: ({ node, ...props }) => <p className="text-justify my-2" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2" {...props} />,
                      li: ({ node, ...props }) => <li className="text-justify" {...props} />,
                    }}
                  >
                    {processHeadings(processDescription(selectedEvent.description))}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <NewsletterSection />
    </motion.div>
  );
};

export default Events;