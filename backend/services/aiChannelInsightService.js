import OpenAI from "openai";

export const generateChannelInsights = async (channel) => {
  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });

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
${channel.recentTitles.join(", ")}

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

  return response.choices[0].message.content;
};
