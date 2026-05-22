import axiosInstance from './axios';

const API_URL = '/products';

// Get all products
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

    Object.keys(productData).forEach(key => {
      if (key === 'image' && productData[key]) {
        formData.append('image', productData[key]);
      } else if (productData[key] !== null && productData[key] !== undefined) {
        formData.append(key, productData[key]);
      }
    });

    const response = await axiosInstance.post(API_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

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

    Object.keys(productData).forEach(key => {
      if (key === 'image' && productData[key] instanceof File) {
        formData.append('image', productData[key]);
      } else if (productData[key] !== null && productData[key] !== undefined) {
        formData.append(key, productData[key]);
      }
    });

    const response = await axiosInstance.put(`${API_URL}/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

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
    return response.data;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// Get all categories
export const getCategories = async () => {
  try {
    const response = await axiosInstance.get(`${API_URL}/categories`);
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};
