import { submitContactMessage } from '../services/contact.service.js';
import { sendError } from '../http/errors.js';
import { getClientIp, getUserAgent } from '../http/client-ip.js';

export const contactController = async (req, res) => {
  try {
    const result = await submitContactMessage({
      payload: req.body,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.status(201).json({
      message: 'Contact message received.',
      data: result
    });
  } catch (error) {
    return sendError(res, error, 'Failed to submit contact message.');
  }
};
