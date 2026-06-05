import { Router } from 'express';
import { getProductsController } from '../controllers/product.controller.js';

export const productRouter = Router();

productRouter.get('/', getProductsController);
