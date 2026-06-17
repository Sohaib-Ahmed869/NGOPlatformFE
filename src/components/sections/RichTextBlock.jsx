import { motion } from "framer-motion";
import { Eyebrow, reveal } from "../giving";
import RichText from "../RichText";
import { cn } from "../../utils/cn";

/* Section: free-form rich text with an optional eyebrow + heading. */
export default function RichTextSection({ eyebrow, heading, body, center }) {
  if (!heading && !body) return null;
  const centered = center === "yes";
  return (
    <section className="bg-background px-6 py-16 lg:py-24">
      <motion.div {...reveal()} className={cn("mx-auto max-w-3xl", centered && "text-center")}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {heading && (
          <h2 className={cn("font-heading text-3xl font-bold text-primary md:text-4xl", eyebrow && "mt-3")}>
            {heading}
          </h2>
        )}
        {body && <RichText html={body} className={cn("text-text-muted", (heading || eyebrow) && "mt-4")} />}
      </motion.div>
    </section>
  );
}
