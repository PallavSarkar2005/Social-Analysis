/**
 * Service to calculate growth forecasts based on historical snapshots
 */

/**
 * Calculates growth projections for 30 and 90 days
 * @param {Array} snapshots - Array of Snapshot documents sorted by capturedAt ASC
 * @returns {Object} Forecast results containing 30d/90d predictions and trend line data
 */
export const calculateForecast = (snapshots) => {
  if (!snapshots || snapshots.length < 2) {
    return {
      hasEnoughData: false,
      message: "At least 2 historical snapshots are required to generate forecasts.",
      predictions: { followers30d: 0, followers90d: 0, views30d: 0, views90d: 0 },
      trend: [],
    };
  }

  const oldest = snapshots[0];
  const latest = snapshots[snapshots.length - 1];

  const timeDiff = new Date(latest.capturedAt) - new Date(oldest.capturedAt);
  const daysDiff = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));

  // Followers rate of change per day
  const followerDiff = latest.followers - oldest.followers;
  const followerRatePerDay = followerDiff / daysDiff;

  // Views rate of change per day
  const viewDiff = latest.views - oldest.views;
  const viewRatePerDay = viewDiff / daysDiff;

  // Projections
  const followers30d = Math.max(0, Math.round(latest.followers + followerRatePerDay * 30));
  const followers90d = Math.max(0, Math.round(latest.followers + followerRatePerDay * 90));

  const views30d = Math.max(0, Math.round(latest.views + viewRatePerDay * 30));
  const views90d = Math.max(0, Math.round(latest.views + viewRatePerDay * 90));

  // Generate historical + forecast trend line points (e.g. 10 points over 90 days)
  const trend = [];
  
  // 1. Add latest actual state
  trend.push({
    day: 0,
    label: "Current",
    followers: latest.followers,
    views: latest.views,
    isForecast: false,
  });

  // 2. Add projection points
  for (let i = 1; i <= 3; i++) {
    const daysOut = i * 30;
    trend.push({
      day: daysOut,
      label: `Day +${daysOut}`,
      followers: Math.max(0, Math.round(latest.followers + followerRatePerDay * daysOut)),
      views: Math.max(0, Math.round(latest.views + viewRatePerDay * daysOut)),
      isForecast: true,
    });
  }

  // Calculate scores
  const growthScore = Math.min(100, Math.max(0, Math.round(followerRatePerDay > 0 ? 50 + (followerRatePerDay / 100) : 25)));
  const performanceScore = Math.min(100, Math.max(0, Math.round(viewRatePerDay > 0 ? 60 + (viewRatePerDay / 1000) : 40)));

  return {
    hasEnoughData: true,
    daysOfHistoryTracked: daysDiff,
    rates: {
      followersPerDay: parseFloat(followerRatePerDay.toFixed(2)),
      viewsPerDay: parseFloat(viewRatePerDay.toFixed(2)),
    },
    predictions: {
      followers30d,
      followers90d,
      views30d,
      views90d,
    },
    scores: {
      growthScore,
      performanceScore,
    },
    trend,
  };
};
