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
        year: { type: String, required: true },
        event: { type: String, required: true },
      },
    ],

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
      },
    ],

    influence: {
      nationalReach: { type: Number, default: 0 },
      regionalReach: { type: Number, default: 0 },
      digitalInfluence: { type: Number, default: 0 },
      audienceGrowth: { type: Number, default: 0 },
      engagementScore: { type: Number, default: 0 },
      visibilityScore: { type: Number, default: 0 },
      trustScore: { type: Number, default: 0 },
      followerQualityScore: { type: Number, default: 0 },
      explanation: { type: String, default: "" },
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
        concentration: { type: Number, default: 0 }, // Percent value e.g. 0-100
        influenceScore: { type: Number, default: 0 },
      },
    ],

    audienceAnalytics: {
      ageGroups: {
        type: mongoose.Schema.Types.Mixed,
        default: {
          "18-24": 25,
          "25-34": 40,
          "35-44": 20,
          "45+": 15,
        },
      },
      gender: {
        type: mongoose.Schema.Types.Mixed,
        default: {
          male: 75,
          female: 24,
          other: 1,
        },
      },
      devices: {
        type: mongoose.Schema.Types.Mixed,
        default: {
          mobile: 85,
          desktop: 12,
          tablet: 3,
        },
      },
      languages: {
        type: mongoose.Schema.Types.Mixed,
        default: {
          Hindi: 50,
          English: 25,
          Regional: 25,
        },
      },
      peakWatchTime: { type: String, default: "7 PM - 10 PM" },
      topCities: { type: [String], default: ["Mumbai", "Delhi", "Guwahati", "Bangalore"] },
      topCountries: { type: [String], default: ["India", "United States", "UAE"] },
      returningPct: { type: Number, default: 45 },
      newPct: { type: Number, default: 55 },
    },

    aiInsights: {
      type: [String],
      default: [],
    },

    lastSynced: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
politicalProfileSchema.index({ accountId: 1 });

const PoliticalProfile = mongoose.model("PoliticalProfile", politicalProfileSchema);

export default PoliticalProfile;
