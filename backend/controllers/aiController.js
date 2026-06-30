import OpenAI from "openai";
import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";

// Hashed in-memory cache for queries
const aiCache = new Map();
const CACHE_STALE_TIME = 10 * 60 * 1000; // 10 minutes cache freshness

const getCachedResponse = (key) => {
  const cached = aiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_STALE_TIME) {
    return cached.content;
  }
  return null;
};

const setCachedResponse = (key, content) => {
  aiCache.set(key, {
    content,
    timestamp: Date.now(),
  });
};

// Video Insights Handler (Pre-existing compatibility)
export const getVideoInsights = async (req, res, next) => {
  try {
    const { title, views, likes, comments } = req.body;
    
    // Hash key for cache lookup
    const cacheKey = `video_${title}_${views}_${likes}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        insights: cached,
      });
    }

    let responseContent = "";
    
    // Try GROQ
    if (process.env.GROQ_API_KEY) {
      try {
        const client = new OpenAI({
          apiKey: process.env.GROQ_API_KEY,
          baseURL: "https://api.groq.com/openai/v1",
          timeout: 10000, // 10s timeout
        });
        const response = await client.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You are a YouTube analytics expert." },
            {
              role: "user",
              content: `Analyze video: Title: ${title}, Views: ${views}, Likes: ${likes}, Comments: ${comments}. Provide strength, virality score out of 100, and next suggestions.`,
            },
          ],
        });
        responseContent = response.choices[0]?.message?.content || "";
      } catch (err) {
        console.warn("Primary Groq connection failed for video insights, retrying via OpenAI fallback...");
      }
    }

    // Try OpenAI Fallback
    if (!responseContent && process.env.OPENAI_API_KEY) {
      try {
        const client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          timeout: 10000, // 10s timeout
        });
        const response = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a YouTube analytics expert." },
            {
              role: "user",
              content: `Analyze video: Title: ${title}, Views: ${views}, Likes: ${likes}, Comments: ${comments}. Provide strength, virality score out of 100, and next suggestions.`,
            },
          ],
        });
        responseContent = response.choices[0]?.message?.content || "";
      } catch (err) {
        console.error("OpenAI fallback failed for video insights:", err.message);
      }
    }

    if (!responseContent) {
      return res.status(503).json({
        success: false,
        message: "AI services are currently unreachable. Please check API keys.",
      });
    }

    setCachedResponse(cacheKey, responseContent);
    res.json({
      success: true,
      insights: responseContent,
    });
  } catch (error) {
    next(error);
  }
};

// Conversational Political Research Assistant with Fallbacks & Mongoose RAG context injection
export const chatAssistant = async (req, res, next) => {
  const { message, history = [] } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, message: "Prompt message is required." });
  }

  // Set SSE response headers for chunk streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Hash key for cached responses
  const cacheKey = `chat_${message.trim().toLowerCase()}_${JSON.stringify(history.slice(-3))}`;
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    res.write(`data: ${JSON.stringify({ content: cached })}\n\n`);
    res.write("data: [DONE]\n\n");
    return res.end();
  }

  try {
    // 1. Fetch all tracked YouTube accounts for this user to build real-time RAG context
    const accounts = await Account.find({ userId: req.user._id, platform: "youtube" });
    
    // Find latest snapshots in parallel
    const latestSnapshots = await Promise.all(
      accounts.map(async (acc) => {
        const snap = await Snapshot.findOne({ account: acc._id }).sort({ capturedAt: -1 });
        return { accountId: acc._id.toString(), snap };
      })
    );

    const snapMap = {};
    latestSnapshots.forEach(item => {
      if (item.snap) snapMap[item.accountId] = item.snap;
    });

    // 2. Perform dynamic party aggregations (BJP vs Congress vs others)
    const partyStats = {};
    accounts.forEach(acc => {
      const party = acc.party || "Independent";
      const snap = snapMap[acc._id.toString()] || {};
      if (!partyStats[party]) {
        partyStats[party] = {
          count: 0,
          subscribers: 0,
          views: 0,
          engagementSum: 0,
          creators: [],
        };
      }
      partyStats[party].count += 1;
      partyStats[party].subscribers += snap.followers || 0;
      partyStats[party].views += snap.views || 0;
      partyStats[party].engagementSum += snap.engagementRate || 0;
      partyStats[party].creators.push({
        name: acc.name,
        subscribers: snap.followers || 0,
        views: snap.views || 0,
        state: acc.state,
      });
    });

    let partyContext = "PARTY LEVEL TELEMETRY MATRIX:\n";
    Object.entries(partyStats).forEach(([party, stats]) => {
      const avgEngagement = stats.count > 0 ? (stats.engagementSum / stats.count).toFixed(2) : 0;
      partyContext += `- Party: ${party.toUpperCase()}\n`;
      partyContext += `  Total Tracked Leaders: ${stats.count}\n`;
      partyContext += `  Combined Subscribers: ${stats.subscribers.toLocaleString()}\n`;
      partyContext += `  Combined Views: ${stats.views.toLocaleString()}\n`;
      partyContext += `  Average Engagement: ${avgEngagement}%\n`;
      partyContext += `  Tracked Accounts: ${stats.creators.map(c => `${c.name} (${c.subscribers.toLocaleString()} subs in ${c.state})`).join(", ")}\n\n`;
    });

    // 3. Scan prompt for specific tracked creators
    let creatorContext = "SPECIFIC CREATOR METRICS:\n";
    let foundCreator = false;
    accounts.forEach(acc => {
      if (message.toLowerCase().includes(acc.name.toLowerCase())) {
        foundCreator = true;
        const snap = snapMap[acc._id.toString()] || {};
        creatorContext += `- Leader Name: ${acc.name}\n`;
        creatorContext += `  Party: ${acc.party}\n`;
        creatorContext += `  State: ${acc.state}\n`;
        creatorContext += `  Subscribers: ${(snap.followers || 0).toLocaleString()}\n`;
        creatorContext += `  Total Views: ${(snap.views || 0).toLocaleString()}\n`;
        creatorContext += `  Engagement: ${snap.engagementRate || 0}%\n`;
        creatorContext += `  Profile URL: ${acc.profileUrl || "N/A"}\n\n`;
      }
    });

    const systemPrompt = `You are a high-level Political Research Assistant for Social IQ.
Your task is to analyze political leadership, media influence, and party footprints.
You MUST prioritize using the real-time database context provided below to answer user queries.
If the database context lacks sufficient details for general historical political questions, you may use your external knowledge but explicitly mention that it is external.

[GROUND-TRUTH DATABASE CONTEXT]
${partyContext}
${foundCreator ? creatorContext : "No specific tracked leader name resolved in the prompt."}
[END CONTEXT]

Be extremely precise, professional, and report comparisons, growth trajectories, and state presences based directly on the numbers above. Format responses in clean Markdown.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6), // Limit to last 6 messages for context token safety
      { role: "user", content: message }
    ];

    let activeStream = null;
    let fallbackUsed = false;

    // 1. Attempt Groq client
    if (process.env.GROQ_API_KEY) {
      try {
        const groqClient = new OpenAI({
          apiKey: process.env.GROQ_API_KEY,
          baseURL: "https://api.groq.com/openai/v1",
          timeout: 10000, // 10s connection timeout
        });
        activeStream = await groqClient.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages,
          stream: true,
        });
      } catch (err) {
        console.warn("Groq chat stream creation failed, switching to OpenAI fallback...", err.message);
      }
    }

    // 2. Fallback to OpenAI Client
    if (!activeStream && process.env.OPENAI_API_KEY) {
      try {
        const openAIClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          timeout: 10000,
        });
        activeStream = await openAIClient.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          stream: true,
        });
        fallbackUsed = true;
      } catch (err) {
        console.error("OpenAI chat fallback stream creation failed:", err.message);
      }
    }

    if (!activeStream) {
      throw new Error("All AI providers (Groq/OpenAI) failed or are unconfigured.");
    }

    let fullResponseText = "";
    for await (const chunk of activeStream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponseText += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Cache the completed text
    setCachedResponse(cacheKey, fullResponseText);

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("[AI Chat Error]", error.message);
    res.write(`data: ${JSON.stringify({ error: "Political Research Assistant is currently offline. Please configure a valid GROQ_API_KEY." })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
};
