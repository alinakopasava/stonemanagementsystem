import { Router } from 'express';
import { getExchangeRateController } from '../controllers/exchange-rate.controller.js';

export const exchangeRateRouter = Router();

exchangeRateRouter.get('/', getExchangeRateController);
