import { tool } from "ai";
import { z } from "zod";

export const searchWeb = tool({
  description: "Search the web for real-time information or news on a topic.",
  execute: async ({ query }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return {
        error:
          "Tavily API Key is not configured. Please set the TAVILY_API_KEY environment variable.",
      };
    }

    try {
      const response = await fetch("https://api.tavily.com/search", {
        body: JSON.stringify({
          api_key: apiKey,
          num_results: 5,
          query,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Tavily search request failed");
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Search error:", err);
      return {
        error: "Failed to perform web search. Please check your API key.",
      };
    }
  },
  inputSchema: z.object({
    query: z.string().describe("The search query to look up on the web"),
  }),
});
