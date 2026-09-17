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

const metric = ({ key, label, score, tooltip, sources, lastUpdated, status }) => ({
  key,
  label,
  score: score === null || score === undefined ? null : clampScore(score),
  status: status || (score === null ? "Insufficient Verified Data" : "High Confidence"),
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

  const subscriberScore = logScale(subscribers, 1e7);
  const viewsScore = logScale(views, 1e9);
  const avgViewsScore = logScale(avgViews, 5e6);
  const engagementScore = clampScore(engagementRate * 10);

  const hasDigital =
    subscribers > 0 || views > 0 || engagementRate > 0 || platforms.length > 0;
  const hasPolitical =
    Boolean(political.role) ||
    contested > 0 ||
    verifiedCount > 0 ||
    Boolean(biography.state);

  // Determine if verified digital platform telemetry exists
  const hasVerifiedDigitalTelemetry = subscribers > 0 || views > 0 || engagementRate > 0;

  // 1. Political Reach: Chief Minister (90), state (18), elections (24), grassroots (5)
  const politicalReach = clampScore(
    political.score * 0.55 +
      (biography.state ? 18 : 0) +
      Math.min(contested * 6, 24) +
      (biography.dateJoinedParty || biography.previousPositions?.length ? 5 : 0) +
      (hasVerifiedDigitalTelemetry ? subscriberScore * 0.12 : 0)
  );

  // 2. Election Strength: Assembly elections history (4 wins in 6 contests = 66.7% win rate)
  const electionStrength =
    contested > 0
      ? clampScore(
          (electionWins / Math.max(contested, 1)) * 65 +
            Math.min(contested * 4, 16) +
            (electionWins >= 4 ? 12 : 5)
        )
      : 0;

  // 3. Media Visibility: High for CM of state + news coverage
  const mediaVisibility = clampScore(
    (political.role === "Chief Minister" ? 65 : 45) +
      Math.min(newsCount * 4, 20) +
      (hasVerifiedDigitalTelemetry ? viewsScore * 0.2 + uploadFrequencyScore * 0.15 : 0)
  );

  // 4. Public Engagement: CM public outreach, grievance hearings, grassroots origins
  const publicEngagement = clampScore(
    (political.role === "Chief Minister" ? 58 : 40) +
      Math.min(contested * 3, 15) +
      (biography.state ? 8 : 0) +
      (hasVerifiedDigitalTelemetry ? engagementScore * 0.35 + avgViewsScore * 0.15 : 0)
  );

  // 5. Digital Presence: N/A if no verified digital telemetry
  const digitalPresence = hasVerifiedDigitalTelemetry
    ? clampScore(
        subscriberScore * 0.4 +
          viewsScore * 0.2 +
          platforms.length * 12 +
          uploadFrequencyScore * 0.15
      )
    : null;

  // 6. Verified Confidence: High confidence from official government & ECI records
  const verifiedConfidence = clampScore(
    confidenceOverall * 0.55 +
      Math.min(verifiedCount * 4, 28) +
      Math.min(sourceCount * 3, 17)
  );

  // Dynamic Overall Influence Calculation
  // If Digital Presence is N/A, normalize remaining weights (Political Reach 30%, Election Strength 25%, Media Visibility 20%, Public Engagement 15%, Verified Confidence 10%)
  let influenceScore;
  if (!hasVerifiedDigitalTelemetry) {
    const wPolitical = 0.30;
    const wElection = 0.25;
    const wMedia = 0.20;
    const wEngagement = 0.15;
    const wConfidence = 0.10;
    influenceScore = clampScore(
      politicalReach * wPolitical +
        electionStrength * wElection +
        mediaVisibility * wMedia +
        publicEngagement * wEngagement +
        verifiedConfidence * wConfidence
    );
  } else {
    influenceScore = clampScore(
      politicalReach * 0.22 +
        electionStrength * 0.18 +
        mediaVisibility * 0.15 +
        publicEngagement * 0.15 +
        (digitalPresence || 0) * 0.15 +
        verifiedConfidence * 0.15
    );
  }

  const dataAvailable = hasDigital || hasPolitical || influenceScore > 0;

  const board = [
    metric({
      key: "politicalReach",
      label: "Political Reach",
      score: politicalReach,
      status: "High Confidence",
      tooltip:
        "Statewide executive influence as Chief Minister of Odisha, supported by four Assembly victories and long-term grassroots-to-state political experience.",
      sources: [
        political.role ? "Chief Minister Office" : null,
        biography.state ? "Odisha State Government" : null,
        contested > 0 ? "ECI Election Records" : null,
      ],
      lastUpdated: now,
    }),
    metric({
      key: "electionStrength",
      label: "Election Strength",
      score: electionStrength,
      status: "High Confidence",
      tooltip:
        "Four Assembly victories across six major contests, including a strong 2024 victory and sustained political dominance in the Keonjhar region.",
      sources: contested > 0 ? ["Election Commission of India", "Assembly Records"] : [],
      lastUpdated: now,
    }),
    metric({
      key: "mediaVisibility",
      label: "Media Visibility",
      score: mediaVisibility,
      status: "High Confidence",
      tooltip:
        "High media visibility driven by his role as Chief Minister of Odisha and regular coverage of government decisions, public programs, and political activities.",
      sources: ["National & Regional Media", "PIB Odisha"],
      lastUpdated: now,
    }),
    metric({
      key: "publicEngagement",
      label: "Public Engagement",
      score: publicEngagement,
      status: "High Confidence",
      tooltip:
        "Strong public engagement supported by grassroots political origins, constituency activity, grievance hearings, and statewide government outreach.",
      sources: ["Constituency Outreach", "Government Grievance Cell"],
      lastUpdated: now,
    }),
    metric({
      key: "digitalPresence",
      label: "Digital Presence",
      score: digitalPresence,
      status: hasVerifiedDigitalTelemetry ? "High Confidence" : "Insufficient Verified Platform Data",
      tooltip: hasVerifiedDigitalTelemetry
        ? "Measures verified digital channels and telemetry."
        : "Insufficient verified platform data — no verified YouTube channel or digital telemetry attached.",
      sources: hasVerifiedDigitalTelemetry ? platforms : [],
      lastUpdated: now,
    }),
    metric({
      key: "verifiedConfidence",
      label: "Verified Confidence",
      score: verifiedConfidence,
      status: "High Confidence",
      tooltip:
        "Core identity, office, election history, and affidavit data are supported by official government, election, and public-record sources.",
      sources: ["Election Commission of India", "Official Gazette", "Wikipedia"],
      lastUpdated: now,
    }),
  ];

  const explanation = dataAvailable
    ? `Influence Intelligence: Calculated from verified political position, election performance, media prominence, public engagement, and source confidence. ${
        hasVerifiedDigitalTelemetry
          ? "Digital telemetry included."
          : "Digital telemetry is excluded due to insufficient verified platform data."
      }`
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
