import OpenAI from "openai";

export const generateVideoInsights = async (video) => {
  console.log(`[AI Video Insights] Starting analysis for video title: "${video.title}"`);
  
  if (!process.env.GROQ_API_KEY) {
    console.error("[AI Video Insights ERROR] GROQ_API_KEY is not defined in environment variables.");
    throw new Error("Missing API key: The server is not configured with a GROQ_API_KEY.");
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a YouTube analytics expert.",
        },
        {
          role: "user",
          content: `
Analyze this YouTube video.

Title: ${video.title}

Views: ${video.views}

Likes: ${video.likes}

Comments: ${video.comments}

Give:

1. Why it performed well
2. Audience type
3. Content category
4. Virality score out of 100
5. Suggested next videos
`,
        },
      ],
      temperature: 0.7,
    });

    console.log("[AI Video Insights] Insights generated successfully.");
    return response.choices[0].message.content;
  } catch (error) {
    console.error("[AI Video Insights ERROR] Groq API call encountered a failure:", error);
    
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
