import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const CTA_IMAGE =
  "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&q=80";

const slideInLeft = {
  initial: { opacity: 0, x: -60 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const slideInRight = {
  initial: { opacity: 0, x: 60 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const DonationCTA = () => {
  return (
    <section className="bg-background py-20 px-6">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Text content */}
        <motion.div className="lg:w-1/2" {...slideInLeft}>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-dark leading-tight">
            Your Generosity Creates Real Change
          </h2>
          <p className="font-body text-text-muted mt-6 text-lg leading-relaxed max-w-xl">
            Every dollar you give goes directly to the people who need it most.
            Transparent. Accountable. Impactful.
          </p>
          <Link
            to="/donate"
            className="inline-block mt-8 bg-accent text-text-dark font-semibold rounded-xl px-8 py-4 hover:bg-accent-light transition-colors"
          >
            Start Giving Today
          </Link>
        </motion.div>

        {/* Image */}
        <motion.div className="lg:w-1/2" {...slideInRight}>
          <img
            src={CTA_IMAGE}
            alt="Volunteers making a difference in the community"
            className="w-full h-auto rounded-2xl object-cover shadow-xl"
          />
        </motion.div>
      </div>
    </section>
  );
};

export default DonationCTA;
