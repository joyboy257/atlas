import type { AtlasPolicy } from "@atlas-runner/atlas";

/**
 * Lead routing policy — ensures CRM is updated before scheduling meetings,
 * and that only MQL-tier leads (score ≥ 75) get meeting offers.
 */
export const routingPolicy: AtlasPolicy = {
  name: "lead_routing_policy",
  description: "Enforce MQL threshold and CRM sync before meeting scheduling",
  evaluate: async (context) => {
    const { action, leadScore, leadTier } = context;

    if (action === "schedule_meeting") {
      // Only MQL leads get meetings
      if (leadTier !== "MQL" && (leadScore === undefined || leadScore < 75)) {
        return {
          decision: "block",
          reason:
            "Meeting scheduling is reserved for MQL leads (score ≥ 75). " +
            `Current score: ${leadScore ?? "unscored"}. Offer materials or nurture instead.`,
        };
      }
    }

    if (action === "schedule_meeting" && leadTier === "MQL") {
      return {
        decision: "approve_with_note",
        reason:
          "MQL lead confirmed. Ensure CRM is updated before the meeting.",
      };
    }

    return { decision: "approve" };
  },
};
