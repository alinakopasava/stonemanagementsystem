import { getMaterials } from '../services/material.service.js';

export const getMaterialsController = async (_req, res) => {
  try {
    const materials = await getMaterials();

    return res.status(200).json({
      data: materials
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message
    });
  }
};
