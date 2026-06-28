import OpenAI from "openai";

const generateProgrammaticFallback = (creatorA, creatorB) => {
  const diffSubs = Math.abs(creatorA.subscribers - creatorB.subscribers);
  const winnerSubs = creatorA.subscribers > creatorB.subscribers ? creatorA.name : creatorB.name;
  
  const audienceReport = `${winnerSubs} holds a larger subscriber base with a lead of ${diffSubs.toLocaleString()} subscribers.`;
  
  const engagementReport = creatorA.engagementRate > creatorB.engagementRate
    ? `${creatorA.name} shows stronger audience interaction with an engagement rate of ${creatorA.engagementRate}% compared to ${creatorB.name}'s ${creatorB.engagementRate}%.`
    : `${creatorB.name} shows stronger audience interaction with an engagement rate of ${creatorB.engagementRate}% compared to ${creatorA.name}'s ${creatorA.engagementRate}%.`;
    
  const growthReport = creatorA.totalViews > creatorB.totalViews
    ? `${creatorA.name} demonstrates a higher cumulative view volume (${creatorA.totalViews.toLocaleString()} views), indicating broader content circulation.`
    : `${creatorB.name} demonstrates a higher cumulative view volume (${creatorB.totalViews.toLocaleString()} views), indicating broader content circulation.`;
    
  const consistencyReport = `Both channels demonstrate active video output. ${creatorA.name} uploads at a frequency of '${creatorA.uploadFrequency}', while ${creatorB.name} uploads at '${creatorB.uploadFrequency}'.`;
  
  const uploadReport = `Upload cycles are stable. ${creatorA.name} has produced ${creatorA.totalVideos} videos since account establishment, compared to ${creatorB.name}'s ${creatorB.totalVideos} videos.`;
  
  const overallWinner = creatorA.subscribers > creatorB.subscribers ? creatorA.name : creatorB.name;
  
  return {
    audienceSizeComparison: audienceReport,
    engagementComparison: engagementReport,
    growthComparison: growthReport,
    contentConsistency: consistencyReport,
    uploadFrequency: uploadReport,
    overallStrongerCreator: `${overallWinner} has a stronger overall footprint on YouTube due to higher subscriber reach and total channel telemetry.`,
    creatorA: {
      keyStrengths: [
        `High historical views count of ${creatorA.totalViews.toLocaleString()}`,
        `Engagement rating of ${creatorA.engagementRate}%`,
        `Consistent upload pattern: ${creatorA.uploadFrequency}`
      ],
      keyWeaknesses: [
        `Higher viewer drop-off per upload compared to leaders`,
        `Needs more active subscriber interaction`
      ]
    },
    creatorB: {
      keyStrengths: [
        `High historical views count of ${creatorB.totalViews.toLocaleString()}`,
        `Engagement rating of ${creatorB.engagementRate}%`,
        `Consistent upload pattern: ${creatorB.uploadFrequency}`
      ],
      keyWeaknesses: [
        `Higher viewer drop-off per upload compared to leaders`,
        `Needs more active subscriber interaction`
      ]
    }
  };
};

export const generateCreatorComparisonReport = async (creatorA, creatorB) => {
  console.log(`[AI Compare Service] Generating comparison report for: "${creatorA.name}" vs "${creatorB.name}"`);

  if (!process.env.GROQ_API_KEY) {
    console.warn("[AI Compare Service] GROQ_API_KEY is not defined. Using programmatic fallback.");
    return generateProgrammaticFallback(creatorA, creatorB);
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
          content: "You are a YouTube analytics research bot. Your task is to compare two YouTube channels and return a structured JSON object containing a detailed comparison report. Do not return any extra text, only a single JSON block.",
        },
        {
          role: "user",
          content: `Compare these two YouTube channels:
          
          Creator A:
          - Name: ${creatorA.name}
          - Handle: ${creatorA.handle}
          - Subscribers: ${creatorA.subscribers}
          - Total Views: ${creatorA.totalViews}
          - Videos: ${creatorA.totalVideos}
          - Avg Views/Video: ${creatorA.avgViews}
          - Avg Likes/Video: ${creatorA.avgLikes}
          - Engagement Rate: ${creatorA.engagementRate}%
          - Upload Frequency: ${creatorA.uploadFrequency}
          
          Creator B:
          - Name: ${creatorB.name}
          - Handle: ${creatorB.handle}
          - Subscribers: ${creatorB.subscribers}
          - Total Views: ${creatorB.totalViews}
          - Videos: ${creatorB.totalVideos}
          - Avg Views/Video: ${creatorB.avgViews}
          - Avg Likes/Video: ${creatorB.avgLikes}
          - Engagement Rate: ${creatorB.engagementRate}%
          - Upload Frequency: ${creatorB.uploadFrequency}

          Return exactly a JSON object matching this structure:
          {
            "audienceSizeComparison": "A summary sentence comparing subscriber bases",
            "engagementComparison": "A summary sentence comparing average likes and engagement rates",
            "growthComparison": "A summary sentence comparing view volume and potential growth",
            "contentConsistency": "A summary sentence comparing their upload patterns and video output",
            "uploadFrequency": "A summary sentence comparing active upload cycles",
            "overallStrongerCreator": "A declaration and reasoning of who is overall stronger",
            "creatorA": {
              "keyStrengths": ["Strength 1", "Strength 2", "Strength 3"],
              "keyWeaknesses": ["Weakness 1", "Weakness 2"]
            },
            "creatorB": {
              "keyStrengths": ["Strength 1", "Strength 2", "Strength 3"],
              "keyWeaknesses": ["Weakness 1", "Weakness 2"]
            }
          }
          `,
        },
      ],
      response_format: { type: "json_object" },
    });

    const reportContent = JSON.parse(response.choices[0].message.content);
    console.log("[AI Compare Service] Comparison report generated successfully via Groq.");
    return reportContent;
  } catch (error) {
    console.error("[AI Compare Service ERROR] Groq API call failed. Using programmatic fallback.", error.message);
    return generateProgrammaticFallback(creatorA, creatorB);
  }
};
