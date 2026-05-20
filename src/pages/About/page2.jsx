import React from "react";
import { motion } from "framer-motion";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { fadeInUp, sectionReveal, staggerContainer, staggerItem, slideInLeft, slideInRight } from "../../utils/animations";

// Hero
const image1 = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1600&h=900&fit=crop&q=80"; // volunteer,team
// Mission
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

const AboutUsPage = () => {
  const leadershipTeam = [
    {
      name: "Sarah Mitchell",
      title: "CEO",
      description:
        "We are committed to provide better education, health services and access to water amongst underprivileged communities.",
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
        "I strongly believe that our blessings should be used to support and uplift those in need - a principle we uphold at HopeGive.",
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
        "To ensure students are equipped with the tools to succeed, we have a resource school Park.",
      image: image8,
    },
    {
      title: "Ensuring the Provision of Safe Water through Hand Pumps",
      description:
        "The partnership with Aus Relief has helped us provide water hand pump to 50 households with clean and save 80 family.",
      image: image9,
    },
    {
      title: "Flood Relief Drive with GIM Foundation",
      description:
        "People were forced to leave their homes and fields going to flood trying times for the flood affectees.",
      image: image10,
    },
    {
      title: "Food Relief Drive with SMEC",
      description:
        "During the covid-19 lockdown, HopeGive partnered with the Humanity project along Global GIM Foundation to provide assistance to families in need.",
      image: image11,
    },
  ];

   //scroll to top when page loads
    React.useEffect(() => {
      window.scrollTo(0, 0);
    }, []);

  return (
    <motion.div className="bg-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Hero Section */}
      <div
        className="relative h-96 bg-cover bg-center"
        style={{ backgroundImage: `url(${image1})` }}
      >
        <div className="absolute inset-0" style={{ background: `linear-gradient(to right, var(--tenant-sidebar-top, #4A3F30), var(--tenant-sidebar-bottom, #3D3226))`, opacity: 0.75 }} />
        <div className="absolute inset-0">
          <motion.div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center text-white" {...fadeInUp}>
            <span className="text-sm font-body mb-2">About Us</span>
            <h1 className="text-4xl font-heading font-bold mb-4">Our Mission and Values</h1>
          </motion.div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="bg-background w-full">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div className="space-y-8" {...slideInLeft} initial={slideInLeft.initial} whileInView={slideInLeft.animate} viewport={{ once: true }} transition={slideInLeft.transition}>
              <div>
                <h2 className="text-lg font-heading font-bold mb-4 mt-4 text-text-dark">About Us</h2>
                <h1 className="text-4xl font-heading font-bold mb-4 text-justify text-text-dark">
                  Our Mission and Values
                </h1>
                <p className="text-text-muted font-body text-justify">
                  HopeGive Foundation was founded by a group of passionate
                  philanthropists and community advocates dedicated to social change.
                  Our aim is to improve the conditions of underprivileged
                  communities in terms of Education, Access to water and food,
                  Healthcare Services, and Community Rehabilitation
                </p>
              </div>
              <div>
                <h3 className="text-2xl font-heading font-bold mb-4 mt-4 text-justify text-text-dark">Mission</h3>
                <p className="text-text-muted font-body text-justify">
                  To provide access to education, healthcare services, and clean
                  water across Pakistan, empowering underprivileged communities
                  for a better future
                </p>
              </div>
              <div>
                <h3 className="text-2xl font-heading font-bold mb-4 mt-10 text-justify text-text-dark">Our Vision</h3>
                <p className="text-text-muted font-body text-justify">
                  We aspire to become the source for transforming lives of the
                  underprivileged communities in Pakistan and across the globe.
                </p>
              </div>
            </motion.div>
            <motion.div className="object-contain flex items-center justify-center" {...slideInRight} initial={slideInRight.initial} whileInView={slideInRight.animate} viewport={{ once: true }} transition={slideInRight.transition}>
              <img
                src={image2}
                alt="Mission visualization"
                className="object-cover rounded-2xl shadow-md p-5"
                loading="lazy"
              />
            </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Leadership Section */}
      <div className="py-20 px-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 className="text-3xl font-heading font-bold mb-12 text-text-dark" {...sectionReveal}>Our Leadership</motion.h2>
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}>
            {leadershipTeam.map((leader, index) => (
              <motion.div
                key={index}
                variants={staggerItem}
                className="rounded-2xl shadow-md hover:shadow-xl transition-shadow overflow-hidden lg:relative"
                style={{ height: "500px" }}
              >
                <img
                  src={leader.image}
                  alt={leader.name}
                  className="w-full object-cover lg:absolute"
                   loading="lazy"
                />
                <div className="p-6 text-white lg:absolute bottom-4">
                  <p className="text-white mb-4">{leader.title}</p>
                  <h3 className="text-xl font-bold mb-2">{leader.name}</h3>
                  <p className="text-white">{leader.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Impact Section */}
      <div className="py-20 px-6 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <motion.h2 className="text-3xl font-heading font-bold text-text-dark" {...sectionReveal}>Our Impact</motion.h2>
          </div>
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}>
            {impactProjects.map((project, index) => (
              <motion.div
                key={index}
                variants={staggerItem}
                className="bg-surface rounded-2xl shadow-md hover:shadow-xl transition-shadow overflow-hidden"
              >
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-48 object-cover"
                   loading="lazy"
                />
                <div className="p-6">
                  <h3 className="text-lg font-heading font-bold mb-4 text-justify text-text-dark">{project.title}</h3>
                  <p className="text-text-muted font-body text-justify">{project.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <NewsletterSection />
    </motion.div>
  );
};

export default AboutUsPage;