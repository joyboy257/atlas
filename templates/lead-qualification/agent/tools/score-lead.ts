import type { AtlasTool } from "@atlas-runner/atlas";

export const scoreLead: AtlasTool = {
  name: "score_lead",
  description: "Score a lead based on BANT+Fit qualification criteria",
  parameters: {
    type: "object",
    properties: {
      email: {
        type: "string",
        description: "Lead's email address",
      },
      budget: {
        type: "number",
        description: "Lead score for Budget dimension (0-20)",
      },
      authority: {
        type: "number",
        description: "Lead score for Authority dimension (0-20)",
      },
      need: {
        type: "number",
        description: "Lead score for Need dimension (0-20)",
      },
      timeline: {
        type: "number",
        description: "Lead score for Timeline dimension (0-20)",
      },
      companyFit: {
        type: "number",
        description: "Lead score for Company Fit dimension (0-20)",
      },
    },
    required: ["email", "budget", "authority", "need", "timeline", "companyFit"],
  },
  execute: async (params) => {
    const total =
      Number(params.budget) +
      Number(params.authority) +
      Number(params.need) +
      Number(params.timeline) +
      Number(params.companyFit);

    const tier = total >= 75 ? "MQL" : total >= 50 ? "Warm" : "Cold";

    return {
      email: params.email,
      score: total,
      tier,
      dimensions: {
        budget: params.budget,
        authority: params.authority,
        need: params.need,
        timeline: params.timeline,
        companyFit: params.companyFit,
      },
      recommendedAction:
        tier === "MQL"
          ? "Schedule sales meeting"
          : tier === "Warm"
            ? "Add to nurture campaign"
            : "Send overview materials",
    };
  },
};
