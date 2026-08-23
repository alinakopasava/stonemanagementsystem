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
import { sendError } from '../http/errors.js';
import { getClientIp, getUserAgent } from '../http/client-ip.js';

export const listUsersController = async (req, res) => {
  try {
    const users = await listUsers({ supabase: req.supabase });
    return res.status(200).json({ data: users });
  } catch (error) {
    return sendError(res, error, 'Failed to list users.');
  }
};

export const updateUserRoleController = async (req, res) => {
  try {
    const result = await updateUserRole({
      supabase: req.supabase,
      userId: req.params.id,
      role: req.body?.role,
      actorUserId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return res.status(200).json({ data: result });
  } catch (error) {
    return sendError(res, error, 'Failed to update role.');
  }
};

export const listOrdersController = async (req, res) => {
  try {
    const orders = await listOrders({ supabase: req.supabase });
    return res.status(200).json({ data: orders });
  } catch (error) {
    return sendError(res, error, 'Failed to list orders.');
  }
};

export const updateOrderStatusController = async (req, res) => {
  try {
    const result = await updateOrderStatus({
      supabase: req.supabase,
      orderId: req.params.id,
      status: req.body?.status,
      actorUserId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return res.status(200).json({ data: result });
  } catch (error) {
    return sendError(res, error, 'Failed to update order status.');
  }
};

export const listContactMessagesController = async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const messages = await listContactMessages({ supabase: req.supabase, status });
    return res.status(200).json({ data: messages });
  } catch (error) {
    return sendError(res, error, 'Failed to list messages.');
  }
};

export const updateContactMessageStatusController = async (req, res) => {
  try {
    const result = await updateContactMessageStatus({
      supabase: req.supabase,
      id: req.params.id,
      status: req.body?.status,
      actorUserId: req.user.id
    });
    return res.status(200).json({ data: result });
  } catch (error) {
    return sendError(res, error, 'Failed to update message.');
  }
};

export const deleteContactMessageController = async (req, res) => {
  try {
    const result = await deleteContactMessage({
      supabase: req.supabase,
      id: req.params.id,
      actorUserId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return res.status(200).json({ data: result });
  } catch (error) {
    return sendError(res, error, 'Failed to delete message.');
  }
};

export const listOrderCardsController = async (req, res) => {
  try {
    const filter = req.query.converted;
    const converted = filter === 'true' ? true : filter === 'false' ? false : undefined;
    const cards = await listOrderCards({ supabase: req.supabase, converted });
    return res.status(200).json({ data: cards });
  } catch (error) {
    return sendError(res, error, 'Failed to list order cards.');
  }
};

export const convertOrderCardController = async (req, res) => {
  try {
    const order = await convertOrderCardToOrder({
      supabase: req.supabase,
      orderCardId: req.params.id,
      payload: req.body,
      actorUserId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return res.status(201).json({ data: order });
  } catch (error) {
    return sendError(res, error, 'Failed to convert order card.');
  }
};

export const deleteOrderCardController = async (req, res) => {
  try {
    const result = await deleteOrderCard({
      supabase: req.supabase,
      orderCardId: req.params.id,
      actorUserId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return res.status(200).json({ data: result });
  } catch (error) {
    return sendError(res, error, 'Failed to delete order card.');
  }
};
