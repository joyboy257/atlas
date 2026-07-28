import type { AtlasTool } from "@atlas-runner/atlas";

export const searchKnowledgeBase: AtlasTool = {
  name: "search_knowledge_base",
  description: "Search the help centre and knowledge base for relevant articles",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query — use keywords from the customer's question",
      },
      category: {
        type: "string",
        enum: ["billing", "account", "technical", "general"],
        description: "Optional category to filter results",
      },
    },
    required: ["query"],
  },
  execute: async ({ query, category }) => {
    // Stub — replace with real knowledge base search (Algolia, Typesense, etc.)
    return {
      results: [
        {
          id: "kb-001",
          title: "How to reset your password",
          url: "/help/reset-password",
          snippet:
            "Go to Settings > Security > Change Password. Enter your current password...",
          relevance: 0.92,
        },
        {
          id: "kb-002",
          title: "Understanding your bill",
          url: "/help/billing-guide",
          snippet:
            "Your bill is calculated based on active seats, usage tier, and any add-ons...",
          relevance: 0.85,
        },
      ],
      query,
      category,
    };
  },
};
