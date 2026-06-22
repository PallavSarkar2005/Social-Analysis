import { generateChannelInsights } from "../services/aiChannelInsightService.js";

export const getChannelInsights = async (req, res, next) => {
  try {
    const insights = await generateChannelInsights(req.body);

    res.json({
      success: true,
      insights,
    });
  } catch (error) {
    next(error);
  }
};
