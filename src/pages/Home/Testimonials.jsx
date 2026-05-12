import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Emily Richardson",
    location: "London, UK",
    quote:
      "Donating through HopeGive has been incredibly rewarding. I can see exactly where my money goes and the impact it creates.",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
  },
  {
    name: "Ahmed Al-Rashid",
    location: "Dubai, UAE",
    quote:
      "The transparency and dedication of this foundation is unmatched. Every quarterly report shows real, measurable change.",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
  },
  {
    name: "Sarah Chen",
    location: "New York, USA",
    quote:
      "I started with a small monthly donation and now I'm a regular volunteer. This organisation truly changes lives.",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
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

function Testimonials() {
  return (
    <section className="bg-background py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-heading text-3xl md:text-4xl text-text-dark text-center font-bold mb-4">
          What Our Donors Say
        </h2>
        <p className="text-text-muted text-center mb-12">
          Real stories from real people making a difference.
        </p>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.name}
              className="bg-white rounded-2xl p-8 shadow-md border border-gray-100 relative"
              variants={cardVariants}
            >
              {/* Quotation mark icon */}
              <svg
                className="absolute top-4 right-4 w-10 h-10 text-accent/20"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
              </svg>

              <p className="text-text-muted italic text-sm leading-relaxed mb-6">
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              <div className="flex items-center gap-4">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-text-dark text-sm">
                    {testimonial.name}
                  </p>
                  <p className="text-text-muted text-xs">
                    {testimonial.location}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default Testimonials;
