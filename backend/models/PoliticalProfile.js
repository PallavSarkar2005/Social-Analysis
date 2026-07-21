import mongoose from "mongoose";

const politicalProfileSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      unique: true,
    },

    biography: {
      fullName: { type: String, default: "" },
      dob: { type: String, default: "" },
      age: { type: Number, default: null },
      gender: { type: String, default: "" },
      state: { type: String, default: "" },
      constituency: { type: String, default: "" },
      party: { type: String, default: "" },
      currentPosition: { type: String, default: "" },
      previousPositions: { type: [String], default: [] },
      currentOffice: { type: String, default: "" },
      dateJoinedParty: { type: String, default: "" },
      dateFirstElected: { type: String, default: "" },
      yearsInOffice: { type: Number, default: 0 },
      education: { type: String, default: "" },
      profession: { type: String, default: "" },
      officialWebsite: { type: String, default: "" },
      socialLinks: {
        youtube: { type: String, default: "" },
        twitter: { type: String, default: "" },
        facebook: { type: String, default: "" },
        instagram: { type: String, default: "" },
      },
      wikipediaLink: { type: String, default: "" },
    },

    timeline: [
      {
        id: { type: String, default: "" },
        year: { type: String, required: true },
        yearEnd: { type: String, default: null },
        yearLabel: { type: String, default: "" },
        date: { type: String, default: null },
        category: { type: String, required: true },
        title: { type: String, required: true },
        narrative: { type: String, default: "" },
        description: { type: String, default: "" },
        source: { type: String, default: "" },
        sourceUrl: { type: String, default: "" },
        confidence: { type: Number, default: 0 },
        verifiedBy: { type: [String], default: [] },
        importance: { type: Number, default: null },
        chapter: { type: String, default: "" },
        filters: { type: [String], default: [] },
        durationYears: { type: Number, default: null },
        evidence: { type: mongoose.Schema.Types.Mixed, default: null },
        related: { type: mongoose.Schema.Types.Mixed, default: null },
        details: { type: mongoose.Schema.Types.Mixed, default: null },
      },
    ],

    timelineIntelligence: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    elections: [
      {
        year: { type: Number, required: true },
        election: { type: String, required: true },
        constituency: { type: String, required: true },
        party: { type: String, required: true },
        votes: { type: Number, default: 0 },
        margin: { type: Number, default: 0 },
        position: { type: String, default: "Winner" },
        votePct: { type: Number, default: 0 },
        opponent: { type: String, default: "" },
        voteShare: { type: Number, default: null },
        winner: { type: String, default: "" },
        runnerUp: { type: String, default: "" },
        turnout: { type: Number, default: null },
        assets: { type: String, default: "" },
        liabilities: { type: String, default: "" },
        criminalCases: { type: Number, default: null },
        education: { type: String, default: "" },
        occupation: { type: String, default: "" },
        affidavitLink: { type: String, default: "" },
        source: { type: String, default: "" },
      },
    ],

    facts: [
      {
        type: { type: String, required: true },
        title: { type: String, default: "" },
        description: { type: String, default: "" },
        value: { type: String, default: "" },
        date: { type: String, default: null },
        year: { type: String, default: null },
        confidence: { type: Number, default: 0 },
        source: { type: String, default: "" },
        sourceUrl: { type: String, default: "" },
        verifiedBy: { type: [String], default: [] },
      },
    ],

    verifiedFacts: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        value: { type: String, required: true },
        confidence: { type: Number, default: 0 },
        verifiedBy: { type: [String], default: [] },
        lastVerified: { type: String, default: null },
        conflict: { type: Boolean, default: false },
        alternatives: { type: [mongoose.Schema.Types.Mixed], default: [] },
      },
    ],

    fieldProvenance: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    electionIntelligence: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },

    relationships: {
      nodes: { type: [mongoose.Schema.Types.Mixed], default: [] },
      edges: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },

    intelligenceOverview: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    confidenceBreakdown: {
      identity: { type: Number, default: 0 },
      birth: { type: Number, default: 0 },
      education: { type: Number, default: 0 },
      career: { type: Number, default: 0 },
      electionHistory: { type: Number, default: 0 },
      biography: { type: Number, default: 0 },
      overall: { type: Number, default: 0 },
    },

    aiSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    fieldConflicts: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    politicalStatistics: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    sectionMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    verificationCatalog: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    influence: {
      influenceScore: { type: Number, default: 0 },
      nationalReach: { type: Number, default: 0 },
      regionalReach: { type: Number, default: 0 },
      regionalInfluence: { type: Number, default: 0 },
      digitalInfluence: { type: Number, default: 0 },
      politicalReach: { type: Number, default: 0 },
      electionStrength: { type: Number, default: 0 },
      mediaVisibility: { type: Number, default: 0 },
      publicEngagement: { type: Number, default: 0 },
      digitalPresence: { type: Number, default: 0 },
      verifiedConfidence: { type: Number, default: 0 },
      audienceGrowth: { type: Number, default: null },
      audienceGrowthScore: { type: Number, default: null },
      engagementScore: { type: Number, default: 0 },
      engagementRate: { type: Number, default: 0 },
      visibilityScore: { type: Number, default: 0 },
      trustScore: { type: Number, default: 0 },
      followerQualityScore: { type: Number, default: 0 },
      followerQuality: { type: Number, default: 0 },
      explanation: { type: String, default: "" },
      lastCalculated: { type: Date, default: null },
      calculationVersion: { type: Number, default: 0 },
      dataAvailable: { type: Boolean, default: false },
      factors: { type: [String], default: [] },
      politicalRole: { type: String, default: null },
      electionWins: { type: Number, default: 0 },
      electionContests: { type: Number, default: 0 },
      metrics: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },

    news: [
      {
        headline: { type: String, required: true },
        source: { type: String, required: true },
        publishedTime: { type: String, default: "" },
        url: { type: String, default: "" },
        thumbnail: { type: String, default: "" },
        summary: { type: String, default: "" },
      },
    ],

    newsSentiment: {
      positive: { type: Number, default: 33 },
      neutral: { type: Number, default: 34 },
      negative: { type: Number, default: 33 },
      keywords: { type: [String], default: [] },
      trending: { type: [String], default: [] },
    },

    geographicReach: [
      {
        state: { type: String, required: true },
        concentration: { type: Number, default: 0 },
        influenceScore: { type: Number, default: 0 },
        followers: { type: Number, default: 0 },
        confidence: { type: Number, default: 0 },
        evidenceCount: { type: Number, default: 0 },
        evidence: { type: [mongoose.Schema.Types.Mixed], default: [] },
        politicalRole: { type: String, default: null },
        electionWins: { type: Number, default: 0 },
        electionHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
        primarySources: { type: [String], default: [] },
        source: { type: String, default: "" },
        lastUpdated: { type: Date, default: null },
        isHomeState: { type: Boolean, default: false },
        isPrimary: { type: Boolean, default: false },
        tier: { type: String, default: "monitoring" },
        status: { type: String, default: "monitoring" },
      },
    ],

    geographicMeta: {
      status: { type: String, default: "monitoring" },
      message: {
        type: String,
        default:
          "Geographic monitoring active. State influence will populate as verified evidence syncs.",
      },
      lastCalculated: { type: Date, default: null },
      calculationVersion: { type: Number, default: 0 },
      evidenceCount: { type: Number, default: 0 },
      verifiedCoverage: { type: Number, default: 0 },
      regionalSummary: {
        primaryRegion: { type: String, default: null },
        secondaryRegions: { type: [String], default: [] },
        emergingRegions: { type: [String], default: [] },
        verifiedCoverage: { type: Number, default: 0 },
      },
    },

    audienceAnalytics: {
      ageGroups: { type: mongoose.Schema.Types.Mixed, default: {} },
      gender: { type: mongoose.Schema.Types.Mixed, default: {} },
      devices: { type: mongoose.Schema.Types.Mixed, default: {} },
      languages: { type: mongoose.Schema.Types.Mixed, default: {} },
      peakWatchTime: { type: String, default: "" },
      topCities: { type: [String], default: [] },
      topCountries: { type: [String], default: [] },
      returningPct: { type: Number, default: null },
      newPct: { type: Number, default: null },
    },

    aiInsights: {
      type: [String],
      default: [],
    },

    sources: [
      {
        name: { type: String, required: true },
        url: { type: String, default: "" },
        type: { type: String, default: "scrape" },
        confidence: { type: Number, default: 0 },
        fetchedAt: { type: Date, default: Date.now },
        verified: { type: Boolean, default: true },
        matchedIdentity: { type: Boolean, default: true },
        lastChecked: { type: Date, default: null },
        statusCode: { type: Number, default: null },
      },
    ],

    confidenceScore: {
      type: Number,
      default: 0,
    },

    lastVerified: {
      type: Date,
      default: null,
    },

    lastSynced: {
      type: Date,
      default: Date.now,
    },

    builderVersion: {
      type: Number,
      default: 0,
    },

    overviewVersion: {
      type: Number,
      default: 0,
    },

    timelineVersion: {
      type: Number,
      default: 0,
    },

    factsVersion: {
      type: Number,
      default: 0,
    },

    electionVersion: {
      type: Number,
      default: 0,
    },

    relationshipVersion: {
      type: Number,
      default: 0,
    },

    aiVersion: {
      type: Number,
      default: 0,
    },

    influenceVersion: {
      type: Number,
      default: 0,
    },

    reachVersion: {
      type: Number,
      default: 0,
    },

    lastBuiltAt: {
      type: Date,
      default: null,
    },

    profileSchemaVersion: {
      type: Number,
      default: 0,
    },

    profileEngineVersion: {
      type: Number,
      default: 0,
    },

    moduleVersion: {
      type: Number,
      default: 0,
    },

    moduleVersions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    moduleMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    newsVersion: {
      type: Number,
      default: 0,
    },

    syncStatus: {
      type: String,
      default: "pending",
    },

    syncProgress: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    syncTrigger: {
      type: String,
      default: null,
    },

    lastSyncAttemptAt: {
      type: Date,
      default: null,
    },

    lastSyncCompletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

politicalProfileSchema.index({ syncStatus: 1, lastSyncAttemptAt: 1 });
politicalProfileSchema.index({ profileSchemaVersion: 1 });
politicalProfileSchema.index({ builderVersion: 1 });

const PoliticalProfile = mongoose.model("PoliticalProfile", politicalProfileSchema);

export default PoliticalProfile;
