import { Router } from 'express';
import { listInstallationCardsController } from '../controllers/installation-card.controller.js';
import { requireAuth, requireRole } from '../middleware/require-auth.js';

export const installationCardRouter = Router();

installationCardRouter.use(requireAuth, requireRole('monter', 'admin'));
installationCardRouter.get('/', listInstallationCardsController);
