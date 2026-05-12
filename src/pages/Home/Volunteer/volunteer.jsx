import React, {useEffect} from "react";
import { Link } from "react-router-dom";
import CTA from '../../../assets/CTA.png'

const VolunteerSection = () => {
  
  return (
    <section className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Left Content */}
        <div className="flex flex-col justify-center px-4 md:px-12 lg:px-16 py-20">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
            Volunteer with us
          </h2>
          <p className="text-lg md:text-xl text-gray-700 mb-8">
            Join our team and create meaningful change as a team.
          </p>
          <div>
            <Link
              to="/team-hope"
              className="inline-block bg-green-600 text-white px-8 py-3 rounded hover:bg-green-700 transition-colors font-medium"
            >
              Join us
            </Link>
          </div>
        </div>

        {/* Right Image */}
        <div className="relative  object-fit">
          <img
            src={CTA}
            alt="SAF Volunteers"
            className="w-full h-full object-cover"
             loading="lazy"
          />
        </div>
      </div>
    </section>
  );
};

export default VolunteerSection;
