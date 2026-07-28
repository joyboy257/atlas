import type { AtlasPolicy } from "@atlas-runner/atlas";

/**
 * Handoff approval policy — requires confirmation before escalating to a human,
 * ensuring the agent has attempted resolution first.
 */
export const handoffApprovalPolicy: AtlasPolicy = {
  name: "handoff_approval_policy",
  description: "Ensure agent has attempted KB search before escalating",
  evaluate: async (context) => {
    const { toolCalls, action } = context;

    if (action === "handoff_to_human") {
      const hasSearchedKB = toolCalls.some(
        (call: { tool: string }) => call.tool === "search_knowledge_base"
      );

      if (!hasSearchedKB) {
        return {
          decision: "block",
          reason:
            "Please search the knowledge base before escalating to a human agent.",
        };
      }
    }

    return { decision: "approve" };
  },
};
