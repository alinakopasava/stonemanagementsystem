import { submitContactMessage } from '../services/contact.service.js';
import { sendError } from '../http/errors.js';

export const contactController = async (req, res) => {
  try {
    const result = await submitContactMessage({
      payload: req.body
    });

    return res.status(201).json({
      message: 'Contact message received.',
      data: result
    });
  } catch (error) {
    return sendError(res, error, 'Failed to submit contact message.');
  }
};
