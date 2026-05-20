import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Search, Plus, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { getProducts, deleteProduct, getCategories } from '../../../services/productService';
import Loader from '../../../components/Loader';

const ITEMS_PER_PAGE = 12;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.4 } }),
};

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [deleteModal, setDeleteModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      console.log('Fetched products:', data);
      setProducts(data.products || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      console.log('Fetched categories:', data);
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    }
  };

  const handleDelete = async (id) => {
    try {
        await deleteProduct(id);
        toast.success('Product deleted successfully');
        setDeleteModal(null);
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error(error.response?.data?.message || 'Failed to delete product');
      }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter]);

  if (loading) {
    return (
      <Loader />
    );
  }

  return (
    <motion.div className="lg:p-6 mt-20 lg:mt-0 space-y-6 bg-background/30 min-h-screen"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">Products</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Link
          to="/admin/products/new"
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Product
        </Link>
      </motion.div>

      {/* Toolbar */}
      <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible"
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title or description..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none bg-white min-w-[160px]"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Product Grid */}
      {paginatedProducts.length > 0 ? (
        <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {paginatedProducts.map((product, i) => (
            <motion.div key={product._id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col h-full">
              <div className="relative pt-[100%] bg-gray-50">
                <img
                  className="absolute inset-0 w-full h-full object-cover"
                  src={product.image || '/placeholder-product.png'}
                  alt={product.title}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder-product.png';
                  }}
                />
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <div className="mb-2">
                  <span className="text-xs font-medium text-accent uppercase tracking-wider">
                    {product.category || 'Uncategorized'}
                  </span>
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-1 mb-1">
                    {product.title}
                  </h3>
                  {product.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 h-10">
                      {product.description}
                    </p>
                  )}
                </div>

                <div className="mt-auto pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">
                      ${product.price?.toFixed(2) || '0.00'}
                    </span>
                    <div className="flex space-x-1">
                      <Link
                        to={`/admin/products/edit/${product._id}`}
                        className="p-2 rounded-lg text-gray-400 hover:text-accent hover:bg-accent/5 transition-colors"
                        title="Edit"
                      >
                        <FaEdit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setDeleteModal(product._id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Package className="w-10 h-10 mx-auto mb-3 text-text-muted" />
          <p className="text-text-muted">
            {products.length === 0
              ? 'No products yet. Click "Add Product" to get started.'
              : 'No matching products found.'}
          </p>
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible"
          className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
          <span className="text-xs text-text-muted">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg text-text-muted hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg text-text-muted hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModal(null)} />
            <motion.div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <FaTrash className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-primary mb-1">Delete Product?</h3>
              <p className="text-sm text-text-muted mb-5">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteModal(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={() => handleDelete(deleteModal)}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProductList;
