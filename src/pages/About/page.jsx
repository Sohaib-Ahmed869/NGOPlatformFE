import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Users, Sparkles, ArrowRight, Heart } from "lucide-react";
import NewsletterSection from "../Home/Newsletter/newsletter";
import usePageContent from "../../hooks/usePageContent";
import { useTenant } from "../../context/TenantContext";
import { PageHero, SectionHeading, CardHoverGlow, CTABand } from "../../components/giving";

const DEFAULT_HERO = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1600&q=80";

const DEFAULT_CARDS = [
  {
    title: "Our Vision & Mission",
    description:
      "We are committed to serving underprivileged communities. Our vision and mission guide everything we do, ensuring meaningful and lasting impact.",
    image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=80",
    link: "/about-us",
  },
  {
    title: "Our Leadership",
    description:
      "Meet the dedicated team behind our vision — diverse expertise and a shared passion for driving positive change.",
    image: "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=600&q=80",
    link: "/about-us",
  },
  {
    title: "Our Partners",
    description:
      "Collaboration is at the heart of our success. We work with organisations and individuals who share our mission.",
    image: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&q=80",
    link: "/our-partners",
  },
  {
    title: "Our Impact",
    description:
      "Explore how we are empowering communities and creating sustainable solutions for a better tomorrow.",
    image: "https://images.unsplash.com/photo-1526958097901-5e6d742d3371?w=600&q=80",
    link: "/about-us",
  },
];

const AboutSection = () => {
  const { content } = usePageContent("about");
  const { organisation } = useTenant();
  const reduce = useReducedMotion();
  const hero = content?.hero || {};
  const orgName = organisation?.name || "us";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const cards = Array.isArray(content?.cards) && content.cards.length ? content.cards : DEFAULT_CARDS;

  return (
    <motion.div className="bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <PageHero
        image={hero.image ?? DEFAULT_HERO}
        icon={Users}
        eyebrow={hero.eyebrow ?? "Who we are"}
        title={hero.title ?? "About Us"}
        subtitle={hero.subtitle ?? "Our mission to create lasting, measurable change in the communities we serve."}
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/donate"
            className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-light"
          >
            Support our work <Heart className="h-4 w-4" />
          </Link>
          <Link
            to="/contact-us"
            className="inline-flex items-center gap-2 border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            Get in touch <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PageHero>

      {/* ── Cards ────────────────────────────────────────────────────────── */}
      <section className="bg-background px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            icon={Sparkles}
            eyebrow="Get to know us"
            title="The people and purpose behind our work"
            intro="From our mission and leadership to our partners and impact — here's what drives everything we do."
            center
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card, i) => (
              <motion.div
                key={card.title || i}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: (i % 4) * 0.08 }}
                whileHover={reduce ? {} : { y: -6 }}
              >
                <Link
                  to={card.link || "#"}
                  className="group relative flex h-full flex-col overflow-hidden border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
                >
                  <CardHoverGlow />
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                    <h3 className="absolute bottom-3 left-4 right-4 font-heading text-lg font-bold text-white drop-shadow">
                      {card.title}
                    </h3>
                  </div>
                  <div className="relative flex flex-1 flex-col p-5">
                    <p className="flex-1 text-sm leading-relaxed text-text-muted">{card.description}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent transition-all group-hover:gap-3">
                      Read more <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <CTABand
        title={`Be part of the story at ${orgName}`}
        text="Your support turns our mission into real, lasting change — join us today."
      >
        <Link
          to="/donate"
          className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-light"
        >
          Donate now <Heart className="h-4 w-4" />
        </Link>
        <Link
          to="/initiatives"
          className="inline-flex items-center gap-2 border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          Explore our work <ArrowRight className="h-4 w-4" />
        </Link>
      </CTABand>

      <NewsletterSection />
    </motion.div>
  );
};

export default AboutSection;
