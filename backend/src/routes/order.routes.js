import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { orderSubmitLimiter } from '../middleware/rate-limit.js';
import { submitOrderController } from '../controllers/submit-order.controller.js';
import { listMyOrdersController } from '../controllers/order.controller.js';

export const orderRouter = Router();

orderRouter.get('/mine', requireAuth, listMyOrdersController);
orderRouter.post('/submit', requireAuth, orderSubmitLimiter, submitOrderController);
