import { getProducts } from '../services/product.service.js';

export const getProductsController = async (_req, res) => {
  try {
    const products = await getProducts();
    return res.status(200).json({ data: products });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
