import { Router } from 'express';
import { contactController } from '../controllers/contact.controller.js';
import { contactLimiter } from '../middleware/rate-limit.js';

export const contactRouter = Router();

contactRouter.post('/', contactLimiter, contactController);
