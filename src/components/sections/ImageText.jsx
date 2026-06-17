import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "../../utils/cn";
import { Eyebrow } from "../giving";
import RichText from "../RichText";
import AutoPlayIframe from "../../pages/Components/AutoPlayIframe";

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

/* Image + text split — image on the left or right of a heading + rich-text
   body with an optional CTA button. */
const ImageTextSection = ({ eyebrow, heading, body, image, videoId, imageSide = "right", ctaText, ctaLink }) => {
  const imageLeft = imageSide === "left";
  const hasMedia = image || videoId;

  return (
    <section className="bg-white px-6 py-16 lg:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
        {hasMedia && (
          <motion.div {...reveal} className={cn("overflow-hidden", imageLeft ? "lg:order-1" : "lg:order-2")}>
            {videoId ? (
              <AutoPlayIframe videoId={videoId} title={heading || ""} className="w-full" />
            ) : (
              <img src={image} alt={heading || ""} className="h-80 w-full object-cover lg:h-96" loading="lazy" />
            )}
          </motion.div>
        )}

        <motion.div {...reveal} className={cn(imageLeft ? "lg:order-2" : "lg:order-1")}>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          {heading && (
            <h2 className="mt-3 font-heading text-3xl font-bold text-primary md:text-4xl">{heading}</h2>
          )}
          {body && <RichText html={body} className="mt-4 text-text-muted" />}
          {ctaText && (
            <Link
              to={ctaLink || "#"}
              className="mt-6 inline-flex items-center gap-2 rounded-token-btn bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-light"
            >
              {ctaText} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default ImageTextSection;
