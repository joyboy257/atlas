import type { AtlasTool } from "@atlas-runner/atlas";

export const handoffToHuman: AtlasTool = {
  name: "handoff_to_human",
  description:
    "Escalate the conversation to a human support agent. Use when unable to resolve or when the customer requests it.",
  parameters: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "Why this is being escalated",
      },
      summary: {
        type: "string",
        description: "Summary of the conversation so far for the human agent",
      },
      priority: {
        type: "string",
        enum: ["normal", "elevated"],
        description: "Elevated for angry customers or urgent issues",
      },
    },
    required: ["reason", "summary"],
  },
  execute: async ({ reason, summary, priority }) => {
    // Stub — replace with real queue/routing system
    return {
      handedOff: true,
      reason,
      summary,
      priority: priority ?? "normal",
      estimatedWait: "5-10 minutes",
      agentName: "Alex (Support Lead)",
    };
  },
};
