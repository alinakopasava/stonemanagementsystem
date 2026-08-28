import express, { Router } from 'express';
import {
  listInstallationCardsController,
  saveInstallationPhotoController,
  saveInstallationReportController
} from '../controllers/installation-card.controller.js';
import { requireAuth, requireRole } from '../middleware/require-auth.js';

export const installationCardRouter = Router();

installationCardRouter.use(requireAuth, requireRole('monter', 'admin'));
installationCardRouter.get('/', listInstallationCardsController);
installationCardRouter.put('/:orderId/report', saveInstallationReportController);

/**
 * The photograph arrives as raw bytes, not multipart: one file per request and
 * no field names to parse, so the global `express.json` limit of 100 kB — which
 * only ever sees JSON — stays where it is and no upload parser is needed.
 */
installationCardRouter.post(
  '/:orderId/photo',
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '8mb' }),
  saveInstallationPhotoController
);
