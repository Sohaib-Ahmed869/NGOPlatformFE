import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const initiatives = [
  {
    title: "Education for All",
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&q=80",
    description:
      "We build schools and fund scholarships in underserved regions, giving children the tools to break the cycle of poverty.",
    link: "/initiative-1",
    badge: "Education",
  },
  {
    title: "Healthcare Access",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&q=80",
    description:
      "Mobile clinics and medical camps bring essential healthcare to remote communities with little or no access to hospitals.",
    link: "/initiative-2",
    badge: "Healthcare",
  },
  {
    title: "Food Security",
    image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80",
    description:
      "Emergency food relief and sustainable farming programs ensure no family goes to bed hungry.",
    link: "/initiative-3",
    badge: "Food",
  },
];

const InitiativesSection = () => {
  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-text-dark mb-4">
            Where Your Donation Goes
          </h2>
          <p className="text-text-muted max-w-2xl mx-auto">
            Every contribution is directed to programs that create lasting, measurable change.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={{
            animate: { transition: { staggerChildren: 0.15 } },
          }}
        >
          {initiatives.map((initiative) => (
            <motion.div
              key={initiative.title}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl overflow-hidden transition-shadow"
              variants={{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
              }}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="relative">
                <img
                  src={initiative.image}
                  alt={initiative.title}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
                <span className="absolute top-4 left-4 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {initiative.badge}
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-heading font-bold text-text-dark mb-2">
                  {initiative.title}
                </h3>
                <p className="text-text-muted text-sm mb-4 leading-relaxed">
                  {initiative.description}
                </p>
                <Link
                  to={initiative.link}
                  className="text-primary font-semibold text-sm hover:text-primary-light transition-colors inline-flex items-center gap-1"
                >
                  Learn More
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default InitiativesSection;
