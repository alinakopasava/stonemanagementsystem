import { submitContactMessage } from '../services/contact.service.js';

export const contactController = async (req, res) => {
  try {
    const result = await submitContactMessage({ payload: req.body });

    return res.status(201).json({
      message: 'Contact message received.',
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Failed to submit contact message.'
    });
  }
};
