import { Router } from 'express';
import { getMaterialsController } from '../controllers/material.controller.js';

export const materialRouter = Router();

materialRouter.get('/', getMaterialsController);
