import type { AtlasTool } from "@atlas-runner/atlas";

export const createTicket: AtlasTool = {
  name: "create_ticket",
  description: "Create a support ticket for an issue that needs follow-up",
  parameters: {
    type: "object",
    properties: {
      customerEmail: {
        type: "string",
        description: "Customer's email address",
      },
      subject: {
        type: "string",
        description: "Brief summary of the issue",
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high", "urgent"],
        description: "Ticket priority",
      },
      body: {
        type: "string",
        description: "Detailed description of the issue and steps taken",
      },
    },
    required: ["customerEmail", "subject", "body"],
  },
  execute: async (params) => {
    // Stub — replace with real ticketing system (Zendesk, Linear, etc.)
    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
    return {
      created: true,
      ticketId,
      ...params,
      priority: params.priority ?? "medium",
      status: "OPEN",
      createdAt: new Date().toISOString(),
    };
  },
};
