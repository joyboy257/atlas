import type { AtlasTool } from "@atlas-runner/atlas";

export const enrichLead: AtlasTool = {
  name: "enrich_lead",
  description:
    "Enrich a lead profile with company and contact details from external data sources",
  parameters: {
    type: "object",
    properties: {
      email: {
        type: "string",
        description: "Lead's email address",
      },
      company: {
        type: "string",
        description: "Company name if known",
      },
    },
    required: ["email"],
  },
  execute: async ({ email, company }) => {
    // Stub — replace with Clearbit, Apollo, ZoomInfo, etc.
    return {
      email,
      enriched: {
        company: company ?? "Acme Corp",
        companySize: "50-200 employees",
        industry: "Technology",
        role: "Engineering Lead",
        linkedinUrl: "https://linkedin.com/in/example",
        recentFunding: null,
        techStack: ["AWS", "React", "Node.js"],
      },
      source: "stub",
    };
  },
};
