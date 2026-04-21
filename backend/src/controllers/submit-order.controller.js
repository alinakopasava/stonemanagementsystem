import { submitOrder } from '../services/submit-order.service.js';

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
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Failed to submit order.'
    });
  }
};
