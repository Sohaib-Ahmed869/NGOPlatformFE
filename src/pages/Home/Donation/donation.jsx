import { useState, useEffect } from "react";
import { useCart } from "../../Components/cart";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import axiosInstance from "../../../services/axios";

const DonationSection = () => {
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axiosInstance.get("/products");
        if (Array.isArray(response.data)) {
          setProducts(response.data);
        } else if (response.data && Array.isArray(response.data.products)) {
          setProducts(response.data.products);
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          setProducts(response.data.data);
        } else {
          setProducts([]);
        }
        setLoading(false);
      } catch {
        setError("Failed to load products");
        setLoading(false);
        setProducts([]);
      }
    };
    fetchProducts();
  }, []);

  const getCategoryProducts = () => {
    if (!Array.isArray(products)) return [];
    const categoryMappings = {
      food: ["food"],
      education: ["education"],
      emergency: ["emergency", "emergencies"],
      water: ["water"],
    };
    const result = [];
    Object.entries(categoryMappings).forEach(([, possibleValues]) => {
      const product = products.find((p) =>
        possibleValues.some((v) => v === p?.category?.toLowerCase())
      );
      if (product) result.push(product);
    });
    return result;
  };

  const categoryProducts = getCategoryProducts();

  const categoryColors = {
    food: { bg: "bg-orange-50", text: "text-orange-700", label: "Food" },
    education: { bg: "bg-blue-50", text: "text-blue-700", label: "Education" },
    emergencies: { bg: "bg-red-50", text: "text-red-700", label: "Emergency" },
    emergency: { bg: "bg-red-50", text: "text-red-700", label: "Emergency" },
    water: { bg: "bg-cyan-50", text: "text-cyan-700", label: "Water" },
  };

  const sectionTitle = (
    <div className="text-center mb-12">
      <h2 className="text-3xl md:text-4xl font-heading font-bold text-text-dark mb-3">
        Make a Donation
      </h2>
      <p className="text-text-muted font-body max-w-xl mx-auto">
        Choose a cause and make a direct impact today.
      </p>
    </div>
  );

  if (loading) {
    return (
      <section className="py-20 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          {sectionTitle}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-52 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                  <div className="h-10 bg-gray-200 rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          {sectionTitle}
          <div className="text-center py-12">
            <p className="text-red-500 font-body mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-[#8B6914] hover:underline font-body"
            >
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (categoryProducts.length === 0) {
    return (
      <section className="py-20 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          {sectionTitle}
          <p className="text-center text-text-muted font-body">No products available at the moment.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        {sectionTitle}

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {categoryProducts.map((product) => {
            const cat = categoryColors[product.category?.toLowerCase()] || categoryColors.food;
            return (
              <motion.div
                key={product._id}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {/* Image */}
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Category badge */}
                  <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold ${cat.bg} ${cat.text}`}>
                    {cat.label}
                  </span>
                  {/* Price badge */}
                  <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold bg-white/90 backdrop-blur-sm text-text-dark shadow-sm">
                    ${product.price}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="font-heading text-lg font-bold text-text-dark mb-2 leading-snug">
                    {product.title}
                  </h3>
                  <p className="text-text-muted text-sm font-body leading-relaxed mb-5 flex-grow line-clamp-2">
                    {product.description}
                  </p>
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold font-body text-sm text-[#2C2418] transition-all hover:scale-[1.02]"
                    style={{
                      background: "linear-gradient(180deg, #D4B85A 0%, #C9A84C 100%)",
                      boxShadow: "0 2px 10px rgba(201,168,76,0.25)",
                    }}
                    onClick={() =>
                      addItem({
                        id: product._id,
                        title: product.title,
                        price: product.price,
                        image: product.image,
                      })
                    }
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Donate Now
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default DonationSection;
