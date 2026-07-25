/**
 * Unified metric colors — every page must use these for the same metric.
 */
export const METRIC_COLORS = {
  subscribers: "#a855f7", // Purple
  followers: "#a855f7",
  views: "#3b82f6", // Blue
  engagement: "#10b981", // Green
  engagementRate: "#10b981",
  averageEngagement: "#10b981",
  sentiment: "#eab308", // Yellow
  sentimentPositive: "#10b981",
  sentimentNeutral: "#eab308",
  sentimentNegative: "#ef4444", // Red
  negative: "#ef4444",
  influence: "#6366f1", // Indigo
  influenceScore: "#6366f1",
  politicalReach: "#6366f1",
  digitalPresence: "#6366f1",
  mediaVisibility: "#6366f1",
  electionStrength: "#6366f1",
  publicEngagement: "#10b981",
  confidence: "#06b6d4", // Cyan
  verifiedConfidence: "#06b6d4",
  videos: "#ec4899",
  likes: "#f59e0b",
  comments: "#14b8a6",
  uploads: "#8b5cf6",
};

export const getMetricColor = (metricKey, fallback = "#6366f1") =>
  METRIC_COLORS[metricKey] || fallback;

export default METRIC_COLORS;
