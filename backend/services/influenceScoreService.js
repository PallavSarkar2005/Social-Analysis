/**
 * Influence Intelligence metrics from verified Account / Snapshot / PoliticalProfile data.
 * Calculated only during background sync — never on page load.
 */
export const INFLUENCE_CALCULATION_VERSION = 3;

const clampScore = (value, max = 100) =>
  Math.min(max, Math.max(0, Math.round(Number(value) || 0)));

const logScale = (value, maxRef) => {
  const v = Math.max(Number(value) || 0, 0);
  if (v <= 0) return 0;
  return clampScore((Math.log10(v + 1) / Math.log10(maxRef + 1)) * 100);
};

const daysBetween = (a, b) => {
  const t0 = new Date(a).getTime();
  const t1 = new Date(b).getTime();
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) return 0;
  return (t1 - t0) / (1000 * 60 * 60 * 24);
};

const scorePoliticalPosition = (biography = {}) => {
  const text = [
    biography.currentPosition,
    biography.currentOffice,
    ...(biography.previousPositions || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!text.trim()) return { score: 0, label: "No verified office", role: null };
  if (/prime\s*minister|\bpm\b/.test(text)) {
    return { score: 98, label: "Prime Minister", role: "Prime Minister" };
  }
  if (/chief\s*minister|\bcm\b/.test(text)) {
    return { score: 90, label: "Chief Minister", role: "Chief Minister" };
  }
  if (/union\s+minister|cabinet\s+minister|minister\s+of\s+state/.test(text)) {
    return { score: 82, label: "Union Minister", role: "Union Minister" };
  }
  if (/\bmp\b|member of parliament|lok sabha|rajya sabha|mla\b|m\.l\.a/.test(text)) {
    return { score: 72, label: "Legislator", role: biography.currentPosition || "Legislator" };
  }
  if (/mayor|councillor|corporator|sarpanch/.test(text)) {
    return { score: 48, label: "Local office", role: biography.currentPosition || "Local office" };
  }
  if (/leader|president|secretary|spokesperson|candidate/.test(text)) {
    return {
      score: 40,
      label: "Party / leadership role",
      role: biography.currentPosition || "Party role",
    };
  }
  return {
    score: 28,
    label: biography.currentPosition || "Political role",
    role: biography.currentPosition || biography.currentOffice || null,
  };
};

const countPlatforms = (biography = {}, account = {}) => {
  const links = biography.socialLinks || {};
  const names = [];
  if (links.youtube || account.platform === "youtube") names.push("YouTube");
  if (links.twitter) names.push("X / Twitter");
  if (links.facebook) names.push("Facebook");
  if (links.instagram) names.push("Instagram");
  if (biography.wikipediaLink || biography.officialWebsite) names.push("Official web");
  return names;
};

const scoreUploadFrequency = (account, snapshots = []) => {
  const videos = Number(account.videos || 0);
  if (snapshots.length >= 2) {
    const oldest = snapshots[0];
    const latest = snapshots[snapshots.length - 1];
    const spanDays = daysBetween(oldest.capturedAt, latest.capturedAt);
    const videoDelta =
      Number(latest.videos || 0) - Number(oldest.videos || videos || 0);
    if (spanDays >= 1 && videoDelta >= 0) {
      const perWeek = (videoDelta / spanDays) * 7;
      return clampScore(perWeek * 25);
    }
  }
  if (videos <= 0) return 0;
  return clampScore(Math.min(60, Math.log10(videos + 1) * 22));
};

const countElectionWins = (profile = {}) => {
  const rows = [
    ...(Array.isArray(profile.electionIntelligence) ? profile.electionIntelligence : []),
    ...(Array.isArray(profile.elections) ? profile.elections : []),
  ];
  let wins = 0;
  for (const row of rows) {
    const position = String(row.position || row.result || row.outcome || "").toLowerCase();
    const winnerFlag = row.winner === true || row.isWinner === true;
    if (winnerFlag || /win|won|victor|1st|first|elected/.test(position) || position === "winner") {
      wins += 1;
    } else if (!position && Number(row.votes) > 0 && !row.runnerUp) {
      // Many stored winners omit explicit position — count contested elections lightly later.
    }
  }
  // Prefer explicit wins; fall back to contested election count * softer weight elsewhere.
  return { wins, contested: rows.length };
};

const metric = ({ key, label, score, tooltip, sources, lastUpdated }) => ({
  key,
  label,
  score: clampScore(score),
  tooltip,
  sources: Array.isArray(sources) ? sources.filter(Boolean) : [],
  lastUpdated,
});

/**
 * Build influence intelligence payload for MongoDB.
 */
export const calculateInfluenceMetrics = ({
  account = {},
  profile = {},
  snapshots = [],
} = {}) => {
  const now = new Date();
  const subscribers = Number(account.subscribers || 0);
  const views = Number(account.views || 0);
  const videos = Number(account.videos || 0);
  const engagementRate = Number(account.engagement || 0);
  const avgViews = videos > 0 ? views / videos : 0;
  const biography = profile.biography || {};
  const political = scorePoliticalPosition(biography);
  const platforms = countPlatforms(biography, account);
  const { wins: electionWins, contested } = countElectionWins(profile);
  const newsCount = Array.isArray(profile.news) ? profile.news.length : 0;
  const verifiedCount = Array.isArray(profile.verifiedFacts)
    ? profile.verifiedFacts.length
    : 0;
  const sourceCount = Array.isArray(profile.sources) ? profile.sources.length : 0;
  const confidenceOverall = Number(profile.confidenceScore || 0);
  const uploadFrequencyScore = scoreUploadFrequency(account, snapshots);

  const hasDigital =
    subscribers > 0 || views > 0 || engagementRate > 0 || platforms.length > 0;
  const hasPolitical =
    Boolean(political.role) ||
    contested > 0 ||
    verifiedCount > 0 ||
    Boolean(biography.state);

  const subscriberScore = logScale(subscribers, 1e7);
  const viewsScore = logScale(views, 1e9);
  const avgViewsScore = logScale(avgViews, 5e6);
  const engagementScore = clampScore(engagementRate * 10);

  // Preferred intelligence metrics
  const politicalReach = clampScore(
    political.score * 0.55 +
      (biography.state ? 18 : 0) +
      Math.min(contested * 6, 24) +
      subscriberScore * 0.12
  );

  const electionStrength =
    contested > 0
      ? clampScore(
          (electionWins / Math.max(contested, 1)) * 70 +
            Math.min(contested * 8, 30) +
            (electionWins > 0 ? 10 : 0)
        )
      : 0;

  const mediaVisibility = clampScore(
    viewsScore * 0.35 +
      avgViewsScore * 0.2 +
      Math.min(newsCount * 6, 35) +
      uploadFrequencyScore * 0.15
  );

  const publicEngagement = clampScore(
    engagementScore * 0.55 +
      avgViewsScore * 0.25 +
      Math.min(newsCount * 3, 20)
  );

  const digitalPresence = clampScore(
    subscriberScore * 0.4 +
      viewsScore * 0.2 +
      platforms.length * 12 +
      uploadFrequencyScore * 0.15
  );

  const verifiedConfidence = clampScore(
    confidenceOverall * 0.55 +
      Math.min(verifiedCount * 4, 28) +
      Math.min(sourceCount * 3, 17)
  );

  const influenceScore = clampScore(
    politicalReach * 0.22 +
      electionStrength * 0.18 +
      mediaVisibility * 0.15 +
      publicEngagement * 0.15 +
      digitalPresence * 0.15 +
      verifiedConfidence * 0.15
  );

  const dataAvailable = hasDigital || hasPolitical || influenceScore > 0;

  const board = [
    metric({
      key: "politicalReach",
      label: "Political Reach",
      score: politicalReach,
      tooltip:
        "Weighted from verified political office, represented state, election contest history, and digital audience scale.",
      sources: [
        political.role ? "Official biography" : null,
        biography.state ? "Verified state" : null,
        contested > 0 ? "Election records" : null,
        subscribers > 0 ? "YouTube audience" : null,
      ],
      lastUpdated: now,
    }),
    metric({
      key: "electionStrength",
      label: "Election Strength",
      score: electionStrength,
      tooltip:
        contested > 0
          ? `Derived from ${electionWins} verified win(s) across ${contested} recorded election contest(s).`
          : "No verified election contests stored yet — score remains 0 until election records sync.",
      sources: contested > 0 ? ["Election records", "Constituency history"] : [],
      lastUpdated: now,
    }),
    metric({
      key: "mediaVisibility",
      label: "Media Visibility",
      score: mediaVisibility,
      tooltip:
        "Combines stored video view volume, average views per upload, recent news coverage count, and publishing cadence.",
      sources: [
        views > 0 ? "YouTube views" : null,
        newsCount > 0 ? "News index" : null,
        videos > 0 ? "Upload history" : null,
      ],
      lastUpdated: now,
    }),
    metric({
      key: "publicEngagement",
      label: "Public Engagement",
      score: publicEngagement,
      tooltip:
        "Based on stored channel engagement rate, average view depth, and news mention activity.",
      sources: [
        engagementRate > 0 ? "YouTube engagement" : null,
        avgViews > 0 ? "Average views" : null,
        newsCount > 0 ? "News mentions" : null,
      ],
      lastUpdated: now,
    }),
    metric({
      key: "digitalPresence",
      label: "Digital Presence",
      score: digitalPresence,
      tooltip:
        "Measures subscriber base, view scale, active platforms (YouTube / social / official web), and upload frequency.",
      sources: [
        ...platforms,
        subscribers > 0 ? "Subscriber telemetry" : null,
      ],
      lastUpdated: now,
    }),
    metric({
      key: "verifiedConfidence",
      label: "Verified Confidence",
      score: verifiedConfidence,
      tooltip:
        "Confidence from profile verification score, count of verified facts, and number of supporting source records.",
      sources: [
        confidenceOverall > 0 ? "Confidence engine" : null,
        verifiedCount > 0 ? "Verified facts" : null,
        sourceCount > 0 ? "Source catalog" : null,
      ],
      lastUpdated: now,
    }),
  ];

  const explanation = dataAvailable
    ? `Influence Intelligence ${influenceScore}/100 — strongest signals: ${board
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map((m) => m.label)
        .join(" & ")}.`
    : "Influence Intelligence is monitoring this profile — metrics will strengthen as verified political and digital evidence syncs.";

  return {
    influence: {
      // New intelligence board (primary UI source)
      metrics: board,
      influenceScore,
      digitalInfluence: influenceScore,
      // Mapped BC fields for older consumers
      nationalReach: politicalReach,
      regionalReach: politicalReach,
      regionalInfluence: politicalReach,
      politicalReach,
      electionStrength,
      mediaVisibility,
      publicEngagement,
      digitalPresence,
      verifiedConfidence,
      visibilityScore: mediaVisibility,
      engagementScore: publicEngagement,
      engagementRate,
      trustScore: verifiedConfidence,
      followerQuality: publicEngagement,
      followerQualityScore: publicEngagement,
      audienceGrowth: null,
      audienceGrowthScore: null,
      explanation,
      lastCalculated: now,
      calculationVersion: INFLUENCE_CALCULATION_VERSION,
      dataAvailable,
      factors: board.filter((m) => m.score > 0).map((m) => m.key),
      politicalRole: political.role,
      electionWins,
      electionContests: contested,
    },
  };
};

export default calculateInfluenceMetrics;
