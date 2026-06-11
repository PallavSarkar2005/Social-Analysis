import { generateVideoInsights } from "../services/aiInsightService.js";

export const getVideoInsights = async (req, res) => {
  try {
    const { title, views, likes, comments } = req.body;

    const insights = await generateVideoInsights({
      title,
      views,
      likes,
      comments,
    });

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
