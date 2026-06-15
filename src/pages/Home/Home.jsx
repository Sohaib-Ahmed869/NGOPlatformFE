import { Link } from "react-router-dom";
import { Heart, ArrowRight } from "lucide-react";
import Hero from "./Hero";
import InitiativesSection from "./Initiative/initiative";
import DonationCTA from "./DonationCTA";
import Events from "./Events";
import Testimonials from "./Testimonials";
import NewsletterSection from "./Newsletter/newsletter";
import { CTABand } from "../../components/giving";
import { useTenant } from "../../context/TenantContext";

const Home = () => {
  const { organisation } = useTenant();
  const orgName = organisation?.name || "us";

  return (
    <div className="bg-background">
      <Hero />
      <InitiativesSection />
      <DonationCTA />
      <Events />
      <Testimonials />

      <CTABand
        title="Ready to make a difference?"
        text={`Join the community of donors changing lives with ${orgName}. Every gift, big or small, creates lasting impact.`}
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
    </div>
  );
};

export default Home;
