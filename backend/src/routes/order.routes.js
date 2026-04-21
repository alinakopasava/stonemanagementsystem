import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { submitOrderController } from '../controllers/submit-order.controller.js';

export const orderRouter = Router();

orderRouter.post('/submit', requireAuth, submitOrderController);
