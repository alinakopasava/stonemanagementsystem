import { getMaterials } from '../services/material.service.js';
import { sendError } from '../http/errors.js';

export const getMaterialsController = async (_req, res) => {
  try {
    const materials = await getMaterials();

    return res.status(200).json({
      data: materials
    });
  } catch (error) {
    return sendError(res, error, 'Failed to load materials.');
  }
};
