import React from "react";
import { Link } from "react-router-dom";
import i1 from "../../../assets/news/i1.png";
import i2 from "../../../assets/news/i2.png";
import i3 from "../../../assets/news/i3.png";
import i4 from "../../../assets/news/i4.png";

const NewsAndEvents = () => {
  const news = [
    {
      id: 1,
      image: i4,
      title: "Smiling Faces",
      subtitle: "As families gather to collect ration",
    },
    {
      id: 2,
      image: i3,
      title: "Empowering",
      subtitle: "Beyond classrooms",
    },
    {
      id: 3,
      image: i2,
      title: "Enriching Livelihoods",
      subtitle: "Through a consistent water supply",
    },
    {
      id: 4,
      image: i1,
      title: "World Patient Safety Day",
      subtitle: "Caring for our community",
    },
  ];

  return (
    <section className="py-16 px-4 md:px-6 lg:px-16 mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-5 lg:gap-0 lg:flex-row lg:justify-between items-center mb-8">
        <h2 className="text-4xl md:text-5xl font-serif font-bold">
          News & Events
        </h2>
        <Link
          to="/events"
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors"
        >
          View More
        </Link>
      </div>

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {news.map((item) => (
          <Link
            key={item.id}
            className="group relative overflow-hidden rounded-2xl bg-white shadow-md transition-transform hover:-translate-y-1"
          >
            <div className="aspect-w-16 aspect-h-12">
              <img src={item.image} className="w-full"  loading="lazy"/>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default NewsAndEvents;
