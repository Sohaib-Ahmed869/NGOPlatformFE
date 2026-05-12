import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProducts, deleteProduct, getCategories } from '../../../services/productService';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);

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
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
        toast.success('Product deleted successfully');
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error(error.response?.data?.message || 'Failed to delete product');
      }
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C9A84C]"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Products Management</h1>
        <Link
          to="/admin/products/new"
          className="bg-[#C9A84C] hover:bg-[#B8952F] text-white px-4 py-2 rounded-md flex items-center whitespace-nowrap"
        >
          <FaPlus className="mr-2" /> Add New Product
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Products
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search by title or description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Category
            </label>
            <select
              id="category"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
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
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product._id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all duration-300 flex flex-col h-full">
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
                    <span className="text-xs font-medium text-[#C9A84C] uppercase tracking-wider">
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
                      <div className="flex space-x-2">
                        <Link
                          to={`/admin/products/edit/${product._id}`}
                          className="p-2 text-gray-500 hover:text-[#C9A84C] transition-colors"
                          title="Edit"
                        >
                          <FaEdit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {products.length === 0 
                ? 'No products found. Click "Add New Product" to get started.' 
                : 'No matching products found.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;
