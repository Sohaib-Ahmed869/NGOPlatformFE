import axiosInstance from './axios';

const API_URL = '/products';

// ── Session caches (admin) ───────────────────────────────────────────────────
// The admin list is fetched at most once per page load; mutations invalidate it
// so the next list visit is fresh, while plain revisits hit the cache (no call).
let _adminCache = null; // full response.data { success, products }
let _adminInFlight = null;
let _categories = null;

const invalidateAdminCache = () => {
  _adminCache = null;
};

// Synchronous peek for instant, loader-free revisits.
export const getCachedAdminProducts = () => _adminCache?.products || null;

// Single-product peek from the admin cache — lets the edit form skip a refetch
// when the product is already in memory from the list.
export const getCachedAdminProduct = (id) =>
  _adminCache?.products?.find((p) => p._id === id) || null;

// Admin: all products incl. inactive. Cached + in-flight de-duped.
export const getAdminProducts = async ({ force = false } = {}) => {
  if (_adminCache && !force) return _adminCache;
  if (_adminInFlight && !force) return _adminInFlight;
  _adminInFlight = axiosInstance
    .get(`${API_URL}/admin/all`)
    .then((res) => {
      _adminCache = res.data;
      _adminInFlight = null;
      return res.data;
    })
    .catch((err) => {
      _adminInFlight = null;
      throw err;
    });
  return _adminInFlight;
};

// Public: active products only (used by the initiative pages) — unchanged.
export const getProducts = async (params = {}) => {
  try {
    const response = await axiosInstance.get(API_URL, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// Get single product by ID
export const getProductById = async (id) => {
  try {
    const response = await axiosInstance.get(`${API_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

// Create new product
export const createProduct = async (productData) => {
  try {
    const formData = new FormData();
    Object.keys(productData).forEach((key) => {
      if (key === 'image' && productData[key]) {
        formData.append('image', productData[key]);
      } else if (productData[key] !== null && productData[key] !== undefined) {
        formData.append(key, productData[key]);
      }
    });
    const response = await axiosInstance.post(API_URL, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    invalidateAdminCache();
    return response.data;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

// Update product
export const updateProduct = async (id, productData) => {
  try {
    const formData = new FormData();
    Object.keys(productData).forEach((key) => {
      if (key === 'image' && productData[key] instanceof File) {
        formData.append('image', productData[key]);
      } else if (productData[key] !== null && productData[key] !== undefined) {
        formData.append(key, productData[key]);
      }
    });
    const response = await axiosInstance.put(`${API_URL}/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    invalidateAdminCache();
    return response.data;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

// Delete product
export const deleteProduct = async (id) => {
  try {
    const response = await axiosInstance.delete(`${API_URL}/${id}`);
    invalidateAdminCache();
    return response.data;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// Categories — cached (rarely change within a session).
export const getCategories = async () => {
  if (_categories) return { categories: _categories };
  try {
    const response = await axiosInstance.get(`${API_URL}/categories`);
    _categories = response.data.categories || [];
    return { categories: _categories };
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};
