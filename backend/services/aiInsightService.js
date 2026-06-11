import OpenAI from "openai";

export const generateVideoInsights = async (video) => {
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

  return response.choices[0].message.content;
};
