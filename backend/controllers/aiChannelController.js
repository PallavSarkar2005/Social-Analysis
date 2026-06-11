import { generateChannelInsights } from "../services/aiChannelInsightService.js";

export const getChannelInsights = async (req, res) => {
  try {
    const insights = await generateChannelInsights(req.body);

    res.json({
      success: true,
      insights,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
