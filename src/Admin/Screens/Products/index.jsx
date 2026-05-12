import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProductList from './ProductList';
import ProductForm from './ProductForm';

const Products = () => {
  return (
    <Routes>
      <Route path="/" element={<ProductList />} />
      <Route path="new" element={<ProductForm />} />
      <Route path="edit/:id" element={<ProductForm />} />
    </Routes>
  );
};

export default Products;
