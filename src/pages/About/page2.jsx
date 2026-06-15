import React, { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Target, Eye, Heart, Users, Sparkles, HeartHandshake, ArrowRight } from "lucide-react";
import NewsletterSection from "../Home/Newsletter/newsletter";
import HeroOverlay from "../../components/HeroOverlay";
import {
  sectionReveal,
  staggerContainer,
  staggerItem,
  slideInLeft,
  slideInRight,
} from "../../utils/animations";
import usePageContent from "../../hooks/usePageContent";

// Hero
const image1 = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1600&h=900&fit=crop&q=80"; // volunteer,team
// Who we are
const image2 = "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&h=600&fit=crop&q=80"; // community,impact
// Leadership portraits
const image3 = "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&h=800&fit=crop&q=80"; // person,professional (male)
const image4 = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=800&fit=crop&q=80"; // person,professional (female)
const image5 = "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&h=800&fit=crop&q=80"; // person,professional (female 2)
// Impact projects
const image6 = "https://images.unsplash.com/photo-1497375638960-ca368c7231e4?w=600&h=400&fit=crop&q=80"; // education,children
const image7 = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop&q=80"; // healthcare,africa
const image8 = "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&h=400&fit=crop&q=80"; // food,hunger
const image9 = "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=600&h=400&fit=crop&q=80"; // water,well
const image10 = "https://images.unsplash.com/photo-1603321544554-f416a9a11fcb?w=600&h=400&fit=crop&q=80"; // disaster,relief
const image11 = "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop&q=80"; // community,gathering

// House-style eyebrow chip: accent-tinted, uppercase, with an optional icon.
const Eyebrow = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
    {Icon && <Icon className="h-3.5 w-3.5" />}
    {children}
  </span>
);

const focusAreas = ["Education", "Clean Water & Food", "Healthcare", "Community Rehabilitation"];

const pillars = [
  {
    icon: Target,
    title: "Our Mission",
    text: "To provide access to education, healthcare services, and clean water across Pakistan, empowering underprivileged communities for a better future.",
  },
  {
    icon: Eye,
    title: "Our Vision",
    text: "To become the driving force for transforming the lives of underprivileged communities in Pakistan and across the globe.",
  },
  {
    icon: Heart,
    title: "Our Values",
    text: "Compassion, integrity and accountability guide every decision — we treat every community we serve with dignity and respect.",
  },
];

const stats = [
  { value: "12K+", label: "Lives Impacted" },
  { value: "85+", label: "Projects Delivered" },
  { value: "30+", label: "Communities Served" },
  { value: "10+", label: "Years of Service" },
];

const leadershipTeam = [
  {
    name: "Sarah Mitchell",
    title: "CEO",
    description:
      "We are committed to providing better education, health services and access to water amongst underprivileged communities.",
    image: image3,
  },
  {
    name: "James Chen",
    title: "COO",
    description:
      "HopeGive wants to spread HOPE to underprivileged communities. The sole meaning of life is to serve humanity.",
    image: image4,
  },
  {
    name: "Amira Patel",
    title: "Director of Programs",
    description:
      "I strongly believe that our blessings should be used to support and uplift those in need — a principle we uphold at HopeGive.",
    image: image5,
  },
];

const impactProjects = [
  {
    title: "Flood Relief Drive with AusRelief",
    description:
      "Providing lifelines and first aid care they deserve, unlocking lifelong futures and endless possibilities.",
    image: image6,
  },
  {
    title: "Water Supply Scheme in Malangori with SMEC Foundation",
    description:
      "A water supply scheme was inaugurated by SMEC Foundation at Malangri Tehsil valley in KPK.",
    image: image7,
  },
  {
    title: "Promoting Digital Literacy for socio-economic development",
    description:
      "To ensure students are equipped with the tools to succeed, we have set up a digital resource school.",
    image: image8,
  },
  {
    title: "Ensuring the Provision of Safe Water through Hand Pumps",
    description:
      "Our partnership with AusRelief has helped us provide water hand pumps to 50 households, serving 80 families with clean water.",
    image: image9,
  },
  {
    title: "Flood Relief Drive with GIM Foundation",
    description:
      "People were forced to leave their homes and fields during the floods — we stood with affectees through these trying times.",
    image: image10,
  },
  {
    title: "Food Relief Drive with SMEC",
    description:
      "During the COVID-19 lockdown, HopeGive partnered with the Humanity Project and Global GIM Foundation to assist families in need.",
    image: image11,
  },
];

const AboutUsPage = () => {
  const { content } = usePageContent("team");
  const hero = content?.hero || {};
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  // Parallax hero (matches Contact / Programs / Events).
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroBgY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-12%", "12%"]);
  const heroScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 1.08]);
  const heroContentY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "30%"]);
  const heroContentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="bg-white">
      {/* ── Hero ── */}
      <section ref={heroRef} className="relative overflow-hidden py-36 lg:py-44">
        <motion.div
          style={{ y: heroBgY, scale: heroScale }}
          className="absolute -inset-y-[16%] inset-x-0 will-change-transform"
        >
          <img src={hero.image ?? image1} alt="" className="h-full w-full object-cover" />
          <HeroOverlay />
        </motion.div>

        <motion.div
          style={{ y: heroContentY, opacity: heroContentOpacity }}
          className="relative z-10 px-6 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-6"
          >
            <Eyebrow icon={Sparkles}>{hero.label ?? "About Us"}</Eyebrow>
          </motion.div>
          <motion.h1
            className="font-heading text-4xl font-bold leading-[1.08] text-[#F5EDE0] md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {hero.title ?? "Our Mission and Values"}
          </motion.h1>
          <motion.p
            className="mx-auto mt-5 max-w-2xl font-body text-lg text-[#EDE4D3]/80"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {hero.subtitle ?? "Driven by compassion, dedicated to lasting change in the communities that need it most."}
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <button
              onClick={() => navigate("/donate")}
              className="inline-flex items-center gap-2 bg-accent px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-light"
            >
              Support Our Work <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate("/programs")}
              className="inline-flex items-center gap-2 border border-white/30 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Our Programs
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Who We Are ── */}
      <section className="bg-background px-6 py-16 lg:py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-12 lg:flex-row lg:gap-16">
          <motion.div
            className="lg:w-1/2"
            initial={slideInLeft.initial}
            whileInView={slideInLeft.animate}
            viewport={{ once: true }}
            transition={slideInLeft.transition}
          >
            <Eyebrow icon={Users}>Who We Are</Eyebrow>
            <h2 className="mt-3 font-heading text-3xl font-bold text-primary md:text-4xl">
              A foundation built on hope and action
            </h2>
            <p className="mt-6 font-body text-lg leading-relaxed text-text-muted">
              HopeGive Foundation was founded by a group of passionate philanthropists and community
              advocates dedicated to social change.
            </p>
            <p className="mt-4 font-body text-lg leading-relaxed text-text-muted">
              Our aim is to improve the conditions of underprivileged communities through education,
              access to clean water and food, healthcare services, and community rehabilitation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {focusAreas.map((area) => (
                <span
                  key={area}
                  className="bg-accent/10 px-4 py-2 text-sm font-body font-medium text-primary"
                >
                  {area}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="relative lg:w-1/2"
            initial={slideInRight.initial}
            whileInView={slideInRight.animate}
            viewport={{ once: true }}
            transition={slideInRight.transition}
          >
            <div aria-hidden className="absolute -bottom-6 -left-6 hidden h-28 w-28 bg-accent/20 md:block" />
            <div aria-hidden className="absolute -top-6 -right-6 hidden h-28 w-28 border-4 border-primary/10 md:block" />
            <img
              src={image2}
              alt="Our community work"
              className="relative aspect-[4/3] w-full object-cover shadow-xl"
              loading="lazy"
            />
          </motion.div>
        </div>
      </section>

      {/* ── Mission / Vision / Values ── */}
      <section className="bg-white px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...sectionReveal} className="mb-12 text-center">
            <Eyebrow icon={Sparkles}>What Drives Us</Eyebrow>
            <h2 className="mt-3 font-heading text-3xl font-bold text-primary md:text-4xl">
              Mission, Vision &amp; Values
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-text-muted">
              The principles that anchor our work and shape every project we take on.
            </p>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 gap-6 md:grid-cols-3"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {pillars.map(({ icon: Icon, title, text }) => (
              <motion.div
                key={title}
                variants={staggerItem}
                whileHover={reduce ? {} : { y: -6 }}
                className="group relative flex h-full flex-col border border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
              >
                <div className="mb-6 grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent transition-colors duration-300 group-hover:bg-accent group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-3 font-heading text-xl font-bold text-primary">{title}</h3>
                <p className="font-body leading-relaxed text-text-muted">{text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Impact stats band ── */}
      <section className="bg-primary px-6 py-16">
        <motion.div
          className="mx-auto grid max-w-7xl grid-cols-2 gap-10 text-center text-white md:grid-cols-4"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={staggerItem}>
              <div className="font-heading text-4xl font-bold md:text-5xl">{stat.value}</div>
              <div className="mt-2 font-body text-sm uppercase tracking-wider text-white/70">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Leadership ── */}
      <section className="bg-background px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...sectionReveal} className="mb-12 text-center">
            <Eyebrow icon={Users}>Our People</Eyebrow>
            <h2 className="mt-3 font-heading text-3xl font-bold text-primary md:text-4xl">
              Meet Our Leadership
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-text-muted">
              The dedicated team guiding our vision and turning it into impact on the ground.
            </p>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {leadershipTeam.map((leader) => (
              <motion.div
                key={leader.name}
                variants={staggerItem}
                whileHover={reduce ? {} : { y: -6 }}
                className="group relative overflow-hidden border border-gray-100 shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={leader.image}
                    alt={leader.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <span className="inline-flex items-center bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                    {leader.title}
                  </span>
                  <h3 className="mt-3 font-heading text-2xl font-bold">{leader.name}</h3>
                  <p className="mt-2 font-body text-sm leading-relaxed text-white/80">{leader.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Impact projects ── */}
      <section className="bg-white px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...sectionReveal} className="mb-12 text-center">
            <Eyebrow icon={HeartHandshake}>Our Work</Eyebrow>
            <h2 className="mt-3 font-heading text-3xl font-bold text-primary md:text-4xl">
              Our Impact in Action
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-text-muted">
              A snapshot of the projects and partnerships changing lives across communities.
            </p>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {impactProjects.map((project) => (
              <motion.div
                key={project.title}
                variants={staggerItem}
                whileHover={reduce ? {} : { y: -6 }}
                className="group relative flex h-full flex-col overflow-hidden border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-heading text-lg font-bold text-primary transition-colors group-hover:text-accent">
                    {project.title}
                  </h3>
                  <p className="mt-3 flex-1 font-body text-sm leading-relaxed text-text-muted">
                    {project.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <NewsletterSection />
    </div>
  );
};

export default AboutUsPage;
