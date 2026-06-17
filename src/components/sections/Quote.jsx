import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { reveal } from "../giving";

/* Section: a single large testimonial / quote with optional author + photo. */
export default function QuoteSection({ quote, author, role, photo }) {
  if (!quote) return null;
  return (
    <section className="bg-white px-6 py-16 lg:py-24">
      <motion.div {...reveal()} className="mx-auto max-w-3xl text-center">
        <Quote className="mx-auto h-10 w-10 text-accent" />
        <blockquote className="mt-5 font-heading text-2xl font-bold leading-snug text-primary md:text-3xl">
          {quote}
        </blockquote>
        {(author || role || photo) && (
          <div className="mt-6 flex flex-col items-center gap-2">
            {photo && <img src={photo} alt={author || ""} className="h-14 w-14 rounded-full object-cover" loading="lazy" />}
            <div>
              {author && <p className="font-semibold text-primary">{author}</p>}
              {role && <p className="text-sm text-text-muted">{role}</p>}
            </div>
          </div>
        )}
      </motion.div>
    </section>
  );
}
