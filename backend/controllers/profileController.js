import OpenAI from "openai";
import axios from "axios";
import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";
import PoliticalProfile from "../models/PoliticalProfile.js";

// Helper to launch AI Client
const getAiClient = () => {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No AI API Keys configured on the server.");
  }
  if (process.env.GROQ_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      }),
      model: "llama-3.3-70b-versatile",
    };
  } else {
    return {
      client: new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      }),
      model: "gpt-4o-mini",
    };
  }
};

// Helper: Parse Google News RSS XML
const parseGoogleNewsRss = (xmlString) => {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xmlString)) !== null && items.length < 8) {
    const content = match[1];
    const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = content.match(/<link>([\s\S]*?)<\/link>/);
    const pubDateMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const sourceMatch = content.match(/<source[\s\S]*?>([\s\S]*?)<\/source>/);

    let title = titleMatch ? titleMatch[1] : "";
    let url = linkMatch ? linkMatch[1] : "";
    let publishedTime = pubDateMatch ? pubDateMatch[1] : "";
    let source = sourceMatch ? sourceMatch[1] : "News";

    // Clean XML encoding escaping
    title = title
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, "/");

    // Clean source name suffix from headline (e.g. "Modi speech - Times of India")
    const cleanTitle = title.replace(/\s+-\s+[^ -]+$/, "").trim();

    items.push({
      headline: cleanTitle,
      source,
      publishedTime: publishedTime ? new Date(publishedTime).toLocaleDateString() : new Date().toLocaleDateString(),
      url,
      thumbnail: `https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=120&auto=format&fit=crop&q=60`, // Professional fallback
      summary: cleanTitle,
    });
  }
  return items;
};

// Core Research Engine (Uses LLM RAG + Wikipedia knowledge to build a full profile)
const researchPoliticalLeader = async (account) => {
  console.log(`[PROFILE RESEARCH] Executing deep research for leader: ${account.name}`);
  const { client, model } = getAiClient();

  const prompt = `You are a professional political research analyst for an election intelligence platform.
Analyze and research the following Indian political leader:
Name: ${account.name}
Party: ${account.party}
State: ${account.state}

Provide a complete political intelligence profile in STRICT JSON FORMAT.
Do not wrap in markdown quotes, return ONLY the raw JSON string.

Schema to follow:
{
  "biography": {
    "fullName": "Full legal name",
    "dob": "DD-MM-YYYY (or approximate birth year)",
    "age": age as integer,
    "gender": "Male" or "Female" or "Other",
    "state": "${account.state}",
    "constituency": "Active parliamentary or assembly constituency",
    "party": "${account.party}",
    "currentPosition": "Current primary position/office held",
    "previousPositions": ["array of prior key positions held"],
    "currentOffice": "Address or office name",
    "dateJoinedParty": "Year or date joined",
    "dateFirstElected": "Year or date first elected",
    "yearsInOffice": years in office as integer,
    "education": "Highest education qualification",
    "profession": "Profession before/during politics",
    "officialWebsite": "URL or empty string",
    "wikipediaLink": "Wikipedia URL"
  },
  "timeline": [
    { "year": "YYYY", "event": "Key highlight event description" }
  ],
  "elections": [
    {
      "year": election year,
      "election": "e.g. Lok Sabha 2019 or Assam Assembly 2021",
      "constituency": "Constituency name",
      "party": "Party name",
      "votes": number of votes (approximate integer if exact unknown),
      "margin": winning margin (integer),
      "position": "Winner" or "Runner-up",
      "votePct": vote percentage as a decimal (e.g. 54.2)
    }
  ],
  "influence": {
    "nationalReach": score 0-100,
    "regionalReach": score 0-100,
    "digitalInfluence": score 0-100,
    "audienceGrowth": score 0-100,
    "engagementScore": score 0-100,
    "visibilityScore": score 0-100,
    "trustScore": score 0-100,
    "followerQualityScore": score 0-100,
    "explanation": "2-sentence summary detailing their political reach and media footprint."
  },
  "geographicReach": [
    { "state": "${account.state}", "concentration": 70, "influenceScore": 85 },
    { "state": "Delhi", "concentration": 15, "influenceScore": 60 },
    { "state": "Other States", "concentration": 15, "influenceScore": 40 }
  ],
  "aiInsights": [
    "Insight 1: Primary digital footprint analysis.",
    "Insight 2: Key content or speech performance trend.",
    "Insight 3: Election and sentiment summary."
  ]
}`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content.trim());
    console.log(`[PROFILE RESEARCH] Success resolving profile data for ${account.name}`);
    return parsed;
  } catch (error) {
    console.error(`[PROFILE RESEARCH ERROR] Failed to research leader ${account.name}:`, error.message);
    throw error;
  }
};

// News Sentiment Analyzer
const analyzeNewsSentiment = async (headlines) => {
  const { client, model } = getAiClient();
  const prompt = `Analyze the political sentiment of these news headlines:
${headlines.map((h, i) => `${i+1}. ${h}`).join("\n")}

Respond with ONLY a JSON object:
{
  "positive": percentage (integer, e.g. 40),
  "neutral": percentage (integer, e.g. 45),
  "negative": percentage (integer, e.g. 15),
  "keywords": ["array of top 5 keywords"],
  "trending": ["array of top 3 trending political topics"]
}`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });
    return JSON.parse(response.choices[0].message.content.trim());
  } catch (error) {
    console.error("[SENTIMENT ANALYSIS ERROR] Fallback used:", error.message);
    return {
      positive: 33,
      neutral: 34,
      negative: 33,
      keywords: ["Leader", "Elections", "Party"],
      trending: ["Policy updates", "Campaign"],
    };
  }
};

// Helper to resolve Account by ID or YouTube Channel ID (accountId)
const resolveAccount = async (idOrChannelId) => {
  if (!idOrChannelId) return null;
  // If it matches standard 24-character hexadecimal ObjectId format, search by ID first
  if (idOrChannelId.match(/^[0-9a-fA-F]{24}$/)) {
    const acc = await Account.findById(idOrChannelId);
    if (acc) return acc;
  }
  // Otherwise, find by the YouTube channel ID (accountId)
  return await Account.findOne({ accountId: idOrChannelId });
};

// Core Helper: Get or Create Political Profile
const getOrCreateProfile = async (accountId) => {
  const account = await resolveAccount(accountId);
  if (!account) return null;

  let profile = await PoliticalProfile.findOne({ accountId: account._id });
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  // If missing or cached for more than 3 days, trigger LLM background crawl/update
  if (!profile || profile.lastSynced < threeDaysAgo) {
    try {
      const data = await researchPoliticalLeader(account);
      
      const updateData = {
        accountId: account._id,
        biography: data.biography,
        timeline: data.timeline,
        elections: data.elections,
        influence: data.influence,
        geographicReach: data.geographicReach,
        aiInsights: data.aiInsights,
        lastSynced: new Date(),
      };

      if (!profile) {
        profile = await PoliticalProfile.create(updateData);
      } else {
        profile = await PoliticalProfile.findOneAndUpdate(
          { accountId: account._id },
          { $set: updateData },
          { new: true }
        );
      }
    } catch (err) {
      console.error("[CRAWL FALLBACK] Failed to update, serving stale profile or default mockup", err.message);
      if (!profile) {
        // Create emergency placeholder profile to avoid 404 blockages
        profile = await PoliticalProfile.create({
          accountId: account._id,
          biography: {
            fullName: account.name,
            dob: "Unknown",
            state: account.state,
            party: account.party,
            currentPosition: "Political Leader",
          },
          timeline: [{ year: new Date().getFullYear().toString(), event: "Tracked in Social IQ analytics" }],
          elections: [],
          influence: { nationalReach: 50, regionalReach: 50, digitalInfluence: 50 },
          lastSynced: new Date(),
        });
      }
    }
  }

  return { account, profile };
};

// 1. GET /api/profile/:creatorId
export const getProfile = async (req, res, next) => {
  try {
    const result = await getOrCreateProfile(req.params.creatorId);
    if (!result) return res.status(404).json({ success: false, message: "Profile not found" });

    res.json({
      success: true,
      data: {
        account: result.account,
        biography: result.profile.biography,
        lastSynced: result.profile.lastSynced,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET /api/profile/:creatorId/timeline
export const getTimeline = async (req, res, next) => {
  try {
    const result = await getOrCreateProfile(req.params.creatorId);
    if (!result) return res.status(404).json({ success: false, message: "Profile not found" });

    res.json({
      success: true,
      data: result.profile.timeline,
    });
  } catch (error) {
    next(error);
  }
};

// 3. GET /api/profile/:creatorId/news
export const getNews = async (req, res, next) => {
  try {
    const { creatorId } = req.params;
    const result = await getOrCreateProfile(creatorId);
    if (!result) return res.status(404).json({ success: false, message: "Profile not found" });

    const { account, profile } = result;
    const cacheLimit = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes news cache

    // If news cache is stale, crawl fresh RSS feed
    if (profile.news.length === 0 || profile.lastSynced < cacheLimit) {
      try {
        console.log(`[NEWS CRAWL] Scraping Google News RSS for ${account.name}`);
        const rssUrl = `https://news.google.com/rss/search?hl=en-IN&gl=IN&ceid=IN:en&q=${encodeURIComponent(account.name)}`;
        const response = await axios.get(rssUrl, { timeout: 10000 });
        
        const freshNews = parseGoogleNewsRss(response.data);
        
        if (freshNews.length > 0) {
          const sentiment = await analyzeNewsSentiment(freshNews.map(item => item.headline));
          
          profile.news = freshNews;
          profile.newsSentiment = sentiment;
          profile.lastSynced = new Date();
          await profile.save();
        }
      } catch (err) {
        console.error("[NEWS CRAWL ERROR] Serving stored news:", err.message);
      }
    }

    res.json({
      success: true,
      data: {
        news: profile.news,
        sentiment: profile.newsSentiment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 4. GET /api/profile/:creatorId/charts
export const getCharts = async (req, res, next) => {
  try {
    const { creatorId } = req.params;
    const account = await resolveAccount(creatorId);
    if (!account) return res.status(404).json({ success: false, message: "Account not found" });

    // Fetch snapshot history
    const snapshots = await Snapshot.find({
      account: account._id,
      userId: req.user._id,
    }).sort({ capturedAt: 1 }).lean();

    // Map time-series charts
    const timeSeries = snapshots.map((s) => ({
      date: new Date(s.capturedAt).toLocaleDateString(),
      subscribers: s.followers,
      views: s.views,
      engagement: s.engagementRate || 2.5,
    }));

    // Build uploads bar chart (mock distribution over past 6 months based on videoCount)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const avgUploads = Math.max(Math.round(account.videos / 24), 2);
    const uploadsDistribution = months.map((m) => ({
      month: m,
      uploads: Math.round(avgUploads * (0.8 + Math.random() * 0.4)),
    }));

    res.json({
      success: true,
      data: {
        timeSeries,
        uploadsDistribution,
        categories: [
          { name: "Elections & Campaigns", value: 45 },
          { name: "Interviews & Press Talks", value: 30 },
          { name: "Public Welfare Schemes", value: 15 },
          { name: "Other", value: 10 },
        ],
      },
    });
  } catch (error) {
    next(error);
  }
};

// 5. GET /api/profile/:creatorId/elections
export const getElections = async (req, res, next) => {
  try {
    const result = await getOrCreateProfile(req.params.creatorId);
    if (!result) return res.status(404).json({ success: false, message: "Profile not found" });

    res.json({
      success: true,
      data: result.profile.elections,
    });
  } catch (error) {
    next(error);
  }
};

// 6. GET /api/profile/:creatorId/influence
export const getInfluence = async (req, res, next) => {
  try {
    const result = await getOrCreateProfile(req.params.creatorId);
    if (!result) return res.status(404).json({ success: false, message: "Profile not found" });

    res.json({
      success: true,
      data: {
        influence: result.profile.influence,
        geographicReach: result.profile.geographicReach,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 7. GET /api/profile/:creatorId/ai-insights
export const getAiInsights = async (req, res, next) => {
  try {
    const result = await getOrCreateProfile(req.params.creatorId);
    if (!result) return res.status(404).json({ success: false, message: "Profile not found" });

    res.json({
      success: true,
      data: result.profile.aiInsights,
    });
  } catch (error) {
    next(error);
  }
};

// 8. GET /api/profile/:creatorId/history
export const getHistory = async (req, res, next) => {
  try {
    const { creatorId } = req.params;
    const account = await resolveAccount(creatorId);
    if (!account) return res.status(404).json({ success: false, message: "Account not found" });

    const snapshots = await Snapshot.find({
      account: account._id,
      userId: req.user._id,
    })
      .sort({ capturedAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: snapshots.map((s) => ({
        id: s._id,
        date: new Date(s.capturedAt).toLocaleDateString(),
        subscribers: s.followers,
        views: s.views,
        engagement: s.engagementRate || 0,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// 9. GET /api/profile/:creatorId/similar
export const getSimilar = async (req, res, next) => {
  try {
    const account = await resolveAccount(req.params.creatorId);
    if (!account) return res.status(404).json({ success: false, message: "Creator not found" });

    // Look for leaders in same party, same state, or similar size
    const similar = await Account.find({
      _id: { $ne: account._id },
      userId: req.user._id,
      $or: [
        { party: account.party },
        { state: account.state },
      ],
    }).limit(4).lean();

    res.json({
      success: true,
      data: similar.map((s) => ({
        _id: s._id,
        name: s.name,
        party: s.party,
        state: s.state,
        profileImage: s.profileImage || s.uploadedImage || s.thumbnail || "",
        uploadedImage: s.uploadedImage || "",
        resolvedImage: s.resolvedImage || "",
        thumbnail: s.thumbnail || "",
        imageSource: s.imageSource || "youtube",
        subscribers: s.subscribers || 0,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// 10. POST /api/profile/:creatorId/chat (SSE Stream context-aware researcher chat)
export const chatProfile = async (req, res, next) => {
  const { creatorId } = req.params;
  const { message, history = [] } = req.body;
  
  if (!message) {
    return res.status(400).json({ success: false, message: "Message is required." });
  }

  // SSE setup
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const result = await getOrCreateProfile(creatorId);
    if (!result) {
      res.write(`data: ${JSON.stringify({ error: "Profile not found" })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    const { account, profile } = result;

    // Fetch snapshot timeline
    const snapshots = await Snapshot.find({ account: account._id, userId: req.user._id })
      .sort({ capturedAt: -1 })
      .limit(6)
      .lean();

    // Compile RAG context
    let creatorContext = `REAL-TIME POLITICAL PROFILE & TELEMETRY CONTEXT:\n`;
    creatorContext += `- Name: ${account.name}\n`;
    creatorContext += `- Party: ${account.party} | State: ${account.state}\n`;
    creatorContext += `- Active constituency: ${profile.biography?.constituency || "N/A"}\n`;
    creatorContext += `- Current position: ${profile.biography?.currentPosition || "N/A"}\n`;
    creatorContext += `- Education: ${profile.biography?.education || "N/A"}\n`;
    creatorContext += `- Digital metrics: ${account.subscribers.toLocaleString()} subscribers | ${account.views.toLocaleString()} total views | ${account.engagement}% engagement\n`;
    
    if (snapshots.length > 0) {
      creatorContext += `\nCHECKPOINT SNAPSHOT HISTORY:\n`;
      snapshots.forEach((s) => {
        creatorContext += `- Date: ${new Date(s.capturedAt).toLocaleDateString()} | Subscribers: ${s.followers.toLocaleString()} | Views: ${s.views.toLocaleString()}\n`;
      });
    }

    const systemPrompt = `You are a context-aware political research assistant for the Social IQ platform.
You are researching ${account.name}.
Answer questions concisely and professionally based directly on the provided leadership profile and telemetry context.
Format your responses in clean Markdown. Include comparisons and timelines when requested.

[CONTEXT]
${creatorContext}
[END CONTEXT]`;

    const { client, model } = getAiClient();
    const activeStream = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-6),
        { role: "user", content: message },
      ],
      stream: true,
    });

    for await (const chunk of activeStream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("[PROFILE CHAT ERROR]", error.message);
    res.write(`data: ${JSON.stringify({ error: "Political Research assistant encountered a problem. Please try again." })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
};
