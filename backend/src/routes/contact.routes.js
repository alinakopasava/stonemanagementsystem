import { Router } from 'express';
import { contactController } from '../controllers/contact.controller.js';

export const contactRouter = Router();

contactRouter.post('/', contactController);
