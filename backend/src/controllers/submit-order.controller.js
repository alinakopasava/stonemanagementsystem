import { submitOrder } from '../services/submit-order.service.js';
import { sendError } from '../http/errors.js';

export const submitOrderController = async (req, res) => {
  try {
    const result = await submitOrder({
      supabase: req.supabase,
      userId: req.user.id,
      payload: req.body
    });

    return res.status(201).json({
      message: 'Order submitted successfully.',
      data: result
    });
  } catch (error) {
    return sendError(res, error, 'Failed to submit order.');
  }
};
