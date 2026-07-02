export const getCsrfToken = async (req, res, next) => {
  try {
    res.json({
      success: true,
      csrfToken: req.csrfToken,
    });
  } catch (error) {
    next(error);
  }
};
