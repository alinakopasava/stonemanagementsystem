import express, { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { orderSubmitLimiter } from '../middleware/rate-limit.js';
import { submitOrderController } from '../controllers/submit-order.controller.js';
import {
  listMyOrdersController,
  saveMonumentPhotoController
} from '../controllers/order.controller.js';

export const orderRouter = Router();

orderRouter.get('/mine', requireAuth, listMyOrdersController);
orderRouter.post('/submit', requireAuth, orderSubmitLimiter, submitOrderController);

/**
 * The portrait for a monument, as raw bytes rather than multipart — the same
 * shape the installer's photo upload uses, so the global 100 kB JSON limit
 * stays where it is and no upload parser is needed.
 *
 * It shares `orderSubmitLimiter` with the submission it belongs to: one photo
 * follows one card, so a caller who cannot submit faster than eight times a
 * minute has no reason to upload faster either.
 */
orderRouter.post(
  '/:cardId/photo',
  requireAuth,
  orderSubmitLimiter,
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '8mb' }),
  saveMonumentPhotoController
);
