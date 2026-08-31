import { listMyOrders } from '../services/order.service.js';
import { saveMonumentPhoto } from '../services/monument-photo.service.js';
import { sendError } from '../http/errors.js';

export const listMyOrdersController = async (req, res) => {
  try {
    const data = await listMyOrders({ supabase: req.supabase });
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error, 'Failed to load orders.');
  }
};

export const saveMonumentPhotoController = async (req, res) => {
  try {
    const photo = await saveMonumentPhoto({
      supabase: req.supabase,
      orderCardId: req.params.cardId,
      body: req.body,
      contentType: req.get('content-type')
    });
    return res.status(201).json({ data: photo });
  } catch (error) {
    return sendError(res, error, 'Failed to store the photo.');
  }
};
