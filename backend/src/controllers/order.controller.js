import { listMyOrders } from '../services/order.service.js';
import { sendError } from '../http/errors.js';

export const listMyOrdersController = async (req, res) => {
  try {
    const data = await listMyOrders({ supabase: req.supabase });
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error, 'Failed to load orders.');
  }
};
