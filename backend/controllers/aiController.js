import OpenAI from "openai";
import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";

// Video Insights Handler (Pre-existing compatibility)
export const getVideoInsights = async (req, res, next) => {
  try {
    const { title, views, likes, comments } = req.body;
    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
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

    res.json({
      success: true,
      insights: response.choices[0].message.content,
    });
  } catch (error) {
    next(error);
  }
};

// Conversational Political Research Assistant with Mongoose RAG context injection
export const chatAssistant = async (req, res, next) => {
  const { message, history = [] } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, message: "Prompt message is required." });
  }

  // Set SSE response headers for chunk streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  if (!process.env.GROQ_API_KEY) {
    res.write(`data: ${JSON.stringify({ content: "Political Research Assistant: The server is not configured with a GROQ_API_KEY. Please add it to your .env file." })}\n\n`);
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

    // 4. Construct messages history
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6), // Limit to last 6 messages for context token safety
      { role: "user", content: message }
    ];

    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const responseStream = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      stream: true,
    });

    for await (const chunk of responseStream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("[AI Chat Error]", error.message);
    res.write(`data: ${JSON.stringify({ error: "Political Research Assistant is currently offline. Please configure a valid GROQ_API_KEY." })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
};
