import type { AtlasTool } from "@atlas-runner/atlas";

export const updateCrm: AtlasTool = {
  name: "update_crm",
  description: "Create or update a lead record in the CRM",
  parameters: {
    type: "object",
    properties: {
      email: {
        type: "string",
        description: "Lead's email address",
      },
      name: {
        type: "string",
        description: "Lead's full name",
      },
      company: {
        type: "string",
        description: "Company name",
      },
      score: {
        type: "number",
        description: "Lead qualification score (0-100)",
      },
      tier: {
        type: "string",
        enum: ["MQL", "Warm", "Cold"],
        description: "Lead tier",
      },
      action: {
        type: "string",
        enum: ["create", "update"],
        description: "Whether to create a new record or update existing",
      },
      notes: {
        type: "string",
        description: "Conversation summary and qualification notes",
      },
    },
    required: ["email", "action"],
  },
  execute: async (params) => {
    // Stub — replace with Salesforce, HubSpot, Pipedrive, etc.
    const crmId = params.action === "create"
      ? `LEAD-${Date.now().toString(36).toUpperCase()}`
      : params.email;

    return {
      synced: true,
      crmId,
      ...params,
      syncedAt: new Date().toISOString(),
    };
  },
};
