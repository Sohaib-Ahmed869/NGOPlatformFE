import React, { useState } from "react";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log("Email submitted:", email);
  };

  return (
    <section className="bg-gray-200 py-24">
      <div className=" mx-auto px-4 md:px-6 lg:px-28">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
          {/* Left Side - Heading */}
          <div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold">
              Add Impact to Your Inbox
            </h2>
          </div>

          {/* Right Side - Form */}
          <div className="w-full lg:w-1/2">
            <p className="text-lg mb-4">Get our emails to stay in the know</p>
            <form onSubmit={handleSubmit} className="flex gap-4 flex-col lg:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address..."
                className="flex-grow px-4 py-3 border bg-transparent border-black rounded focus:outline-none focus:border-green-600 min-w-[300px]"
                required
              />
              <button
                type="submit"
                className="bg-green-600 text-white px-8 py-3 rounded hover:bg-green-700 transition-colors whitespace-nowrap"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
