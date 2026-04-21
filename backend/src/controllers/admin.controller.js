import {
  listOrders,
  listUsers,
  updateOrderStatus,
  updateUserRole
} from '../services/admin.service.js';

export const listUsersController = async (_req, res) => {
  try {
    const users = await listUsers();
    return res.status(200).json({ data: users });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const updateUserRoleController = async (req, res) => {
  try {
    const result = await updateUserRole({
      userId: req.params.id,
      role: req.body?.role,
      actorUserId: req.user.id
    });
    return res.status(200).json({ data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const listOrdersController = async (_req, res) => {
  try {
    const orders = await listOrders();
    return res.status(200).json({ data: orders });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const updateOrderStatusController = async (req, res) => {
  try {
    const result = await updateOrderStatus({
      orderId: req.params.id,
      status: req.body?.status
    });
    return res.status(200).json({ data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
