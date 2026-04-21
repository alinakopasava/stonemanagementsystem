export const getMeController = async (req, res) => {
  const { id, email, role, profile } = req.user;
  return res.status(200).json({
    data: {
      id,
      email,
      role,
      profile
    }
  });
};
