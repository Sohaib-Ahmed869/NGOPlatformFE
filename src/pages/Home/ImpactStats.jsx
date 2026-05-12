import { motion } from "framer-motion";

const stats = [
  { value: "$2.4M+", label: "Raised" },
  { value: "48,000+", label: "Lives Impacted" },
  { value: "120+", label: "Projects Funded" },
  { value: "30+", label: "Countries Reached" },
];

const container = {
  animate: { transition: { staggerChildren: 0.15 } },
};

const item = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const ImpactStats = () => {
  return (
    <section className="bg-primary py-16 px-6">
      <motion.div
        className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 text-center text-white"
        variants={container}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={item}>
            <p className="font-heading text-3xl md:text-4xl font-bold">
              {stat.value}
            </p>
            <p className="font-body text-sm mt-2 text-white/80">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

export default ImpactStats;
