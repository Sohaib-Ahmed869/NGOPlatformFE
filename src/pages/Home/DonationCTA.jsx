import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Lock, Receipt, HeartHandshake } from "lucide-react";
import { Eyebrow, reveal } from "../../components/giving";

const CTA_IMAGE = "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=900&q=80";

const POINTS = [
  { icon: Lock, title: "Secure by design", text: "Bank-level encryption on every gift." },
  { icon: Receipt, title: "Instant receipt", text: "Emailed the moment your gift clears." },
  { icon: HeartHandshake, title: "Goes to the cause", text: "Directed straight to the work that matters." },
];

const DonationCTA = () => {
  const reduce = useReducedMotion();

  return (
    <section className="bg-white px-6 py-20 lg:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Text */}
        <motion.div {...reveal()}>
          <Eyebrow icon={HeartHandshake}>Why give</Eyebrow>
          <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-primary md:text-4xl">
            Your generosity creates real change
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-text-muted">
            Every dollar goes directly to the people who need it most — transparent, accountable, and impactful from the
            moment you give.
          </p>

          <div className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <div key={p.title} className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center bg-accent/10 text-accent">
                  <p.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-primary">{p.title}</p>
                  <p className="text-sm text-text-muted">{p.text}</p>
                </div>
              </div>
            ))}
          </div>

          <Link
            to="/donate"
            className="mt-9 inline-flex items-center gap-2 bg-accent px-8 py-4 text-base font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-light"
          >
            Start giving today <ArrowRight className="h-5 w-5" />
          </Link>
        </motion.div>

        {/* Image */}
        <motion.div
          initial={{ opacity: 0, x: reduce ? 0 : 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="overflow-hidden border border-gray-100 shadow-xl">
            <img src={CTA_IMAGE} alt="Volunteers making a difference in the community" className="aspect-[4/3] w-full object-cover" loading="lazy" />
          </div>
          <span aria-hidden className="pointer-events-none absolute -bottom-6 -right-6 -z-10 h-40 w-40 bg-accent/10 blur-2xl" />
          <span aria-hidden className="pointer-events-none absolute -right-3 -top-3 h-20 w-20 -rotate-12 border-2 border-accent/20" />
        </motion.div>
      </div>
    </section>
  );
};

export default DonationCTA;
