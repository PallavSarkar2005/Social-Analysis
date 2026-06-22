import { generateVideoInsights } from "../services/aiInsightService.js";

export const getVideoInsights = async (req, res, next) => {
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
    next(error);
  }
};
