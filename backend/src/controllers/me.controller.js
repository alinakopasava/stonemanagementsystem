export const getMeController = async (req, res) => {
  return res.status(200).json({
    data: req.user
  });
};
