export const getCsrfToken = async (req, res, next) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    res.json({
      success: true,
      csrfToken: req.csrfToken,
    });
  } catch (error) {
    next(error);
  }
};
