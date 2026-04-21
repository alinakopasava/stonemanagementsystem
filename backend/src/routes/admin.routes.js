import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/require-auth.js';
import {
  listOrdersController,
  listUsersController,
  updateOrderStatusController,
  updateUserRoleController
} from '../controllers/admin.controller.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/users', listUsersController);
adminRouter.patch('/users/:id/role', updateUserRoleController);

adminRouter.get('/orders', listOrdersController);
adminRouter.patch('/orders/:id/status', updateOrderStatusController);
