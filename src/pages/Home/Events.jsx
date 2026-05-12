import { motion } from "framer-motion";

const events = [
  {
    title: "Annual Gala Dinner",
    date: "Dec 15, 2025",
    location: "London, UK",
    description:
      "An evening of elegance and philanthropy featuring keynote speakers, live entertainment, and an exclusive auction.",
    image:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80",
  },
  {
    title: "Charity Marathon",
    date: "Jan 20, 2026",
    location: "New York, USA",
    description:
      "Run for a cause! Join hundreds of runners raising funds for education and healthcare in underserved communities.",
    image:
      "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=600&q=80",
  },
  {
    title: "Fundraising Auction",
    date: "Feb 8, 2026",
    location: "Dubai, UAE",
    description:
      "Bid on exclusive items and experiences while supporting clean water initiatives across three continents.",
    image:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&q=80",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function Events() {
  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-heading text-3xl md:text-4xl text-text-dark text-center font-bold mb-4">
          Upcoming Events
        </h2>
        <p className="text-text-muted text-center mb-12">
          Join us at our next fundraising event and be part of the change.
        </p>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {events.map((event) => (
            <motion.div
              key={event.title}
              className="rounded-2xl shadow-md hover:shadow-xl overflow-hidden bg-white flex flex-col"
              variants={cardVariants}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-48 object-cover rounded-t-2xl"
              />
              <div className="p-6 flex flex-col flex-1">
                <span className="text-sm text-accent font-semibold">
                  {event.date} &middot; {event.location}
                </span>
                <h3 className="text-xl font-heading font-bold text-text-dark mt-2">
                  {event.title}
                </h3>
                <p className="text-sm text-text-muted line-clamp-3 mt-2 flex-1">
                  {event.description}
                </p>
                <button className="mt-6 w-full border-2 border-primary text-primary rounded-xl px-6 py-2 hover:bg-primary hover:text-white transition-colors font-semibold">
                  Register
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default Events;
