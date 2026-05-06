import {
  convertOrderCardToOrder,
  deleteOrderCard,
  listOrderCards,
  listOrders,
  listUsers,
  updateOrderStatus,
  updateUserRole
} from '../services/admin.service.js';
import {
  deleteContactMessage,
  listContactMessages,
  updateContactMessageStatus
} from '../services/contact.service.js';

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

export const listContactMessagesController = async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const messages = await listContactMessages({ status });
    return res.status(200).json({ data: messages });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const updateContactMessageStatusController = async (req, res) => {
  try {
    const result = await updateContactMessageStatus({
      id: req.params.id,
      status: req.body?.status,
      actorUserId: req.user.id
    });
    return res.status(200).json({ data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const deleteContactMessageController = async (req, res) => {
  try {
    const result = await deleteContactMessage({ id: req.params.id });
    return res.status(200).json({ data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const listOrderCardsController = async (req, res) => {
  try {
    const filter = req.query.converted;
    const converted =
      filter === 'true' ? true : filter === 'false' ? false : undefined;
    const cards = await listOrderCards({ converted });
    return res.status(200).json({ data: cards });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const convertOrderCardController = async (req, res) => {
  try {
    const order = await convertOrderCardToOrder({
      orderCardId: req.params.id,
      payload: req.body
    });
    return res.status(201).json({ data: order });
  } catch (error) {
    const status = /already been converted/i.test(error.message) ? 409 : 400;
    return res.status(status).json({ message: error.message });
  }
};

export const deleteOrderCardController = async (req, res) => {
  try {
    const result = await deleteOrderCard({ orderCardId: req.params.id });
    return res.status(200).json({ data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
