import OpenAI from "openai";

export const generateChannelInsights = async (channel) => {
  console.log(`[AI Channel Insights] Starting analysis for channel: "${channel.title}"`);
  
  if (!process.env.GROQ_API_KEY) {
    console.error("[AI Channel Insights ERROR] GROQ_API_KEY is not defined in environment variables.");
    throw new Error("Missing API key: The server is not configured with a GROQ_API_KEY.");
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const recentVideosText = Array.isArray(channel.recentTitles) 
      ? channel.recentTitles.join(", ") 
      : "No recent titles available";

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a YouTube growth strategist.",
        },
        {
          role: "user",
          content: `
Analyze this YouTube channel.

Name:
${channel.title}

Subscribers:
${channel.subscribers}

Total Views:
${channel.totalViews}

Video Count:
${channel.videoCount}

Recent Videos:
${recentVideosText}

Provide:

1. Channel Strength Score /100
2. Growth Potential
3. Audience Type
4. Main Content Themes
5. Strengths
6. Weaknesses
7. Recommended Future Content
          `,
        },
      ],
    });

    console.log("[AI Channel Insights] Insights generated successfully.");
    return response.choices[0].message.content;
  } catch (error) {
    console.error("[AI Channel Insights ERROR] Groq API call encountered a failure:", error);
    
    const status = error.status || error.statusCode;
    const msg = error.message || "";
    
    if (status === 401 || msg.includes("401") || msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("invalid_api_key")) {
      throw new Error("Unauthorized: The GROQ_API_KEY configured on the server is invalid or inactive.");
    }
    if (status === 429 || msg.includes("429") || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("too many requests")) {
      throw new Error("Rate limited: The AI insights service is currently rate limited. Please retry in a few moments.");
    }
    if (status === 400 || msg.includes("400") || msg.toLowerCase().includes("invalid request") || msg.toLowerCase().includes("bad request")) {
      throw new Error("Invalid prompt: The request payload contained parameter formats rejected by the AI model.");
    }
    
    throw new Error(`Backend exception: Failed to reach Groq API. Details: ${msg}`);
  }
};
