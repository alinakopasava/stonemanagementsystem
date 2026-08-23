import { Router } from 'express';
import {
  establishSessionController,
  forgotPasswordController,
  resetPasswordController,
  signInController,
  signOutController,
  signUpController
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import {
  passwordLimiter,
  sessionLimiter,
  signInLimiter,
  signUpLimiter
} from '../middleware/rate-limit.js';

export const authRouter = Router();

authRouter.post('/sign-in', signInLimiter, signInController);
authRouter.post('/sign-up', signUpLimiter, signUpController);
authRouter.post('/sign-out', signOutController);
authRouter.post('/forgot-password', passwordLimiter, forgotPasswordController);
authRouter.post('/session', sessionLimiter, establishSessionController);
authRouter.post('/reset-password', passwordLimiter, requireAuth, resetPasswordController);
