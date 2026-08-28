import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/require-auth.js';
import {
  convertOrderCardController,
  deleteContactMessageController,
  deleteOrderCardController,
  listContactMessagesController,
  listOrderCardsController,
  listOrdersController,
  listUsersController,
  updateContactMessageStatusController,
  handOverOrderController,
  updateOrderStatusController,
  updateUserRoleController
} from '../controllers/admin.controller.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/users', listUsersController);
adminRouter.patch('/users/:id/role', updateUserRoleController);

adminRouter.get('/orders', listOrdersController);
adminRouter.patch('/orders/:id/status', updateOrderStatusController);
adminRouter.post('/orders/:id/hand-over', handOverOrderController);

adminRouter.get('/order-cards', listOrderCardsController);
adminRouter.post('/order-cards/:id/convert', convertOrderCardController);
adminRouter.delete('/order-cards/:id', deleteOrderCardController);

adminRouter.get('/contact-messages', listContactMessagesController);
adminRouter.patch('/contact-messages/:id', updateContactMessageStatusController);
adminRouter.delete('/contact-messages/:id', deleteContactMessageController);
