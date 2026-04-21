import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { getMeController } from '../controllers/me.controller.js';

export const meRouter = Router();

meRouter.get('/', requireAuth, getMeController);
