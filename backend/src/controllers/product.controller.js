import { getProducts } from '../services/product.service.js';
import { sendError } from '../http/errors.js';

export const getProductsController = async (_req, res) => {
  try {
    const products = await getProducts();
    return res.status(200).json({ data: products });
  } catch (error) {
    return sendError(res, error, 'Failed to load products.');
  }
};
