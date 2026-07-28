import type { AtlasTool } from "@atlas-runner/atlas";

export const scheduleMeeting: AtlasTool = {
  name: "schedule_meeting",
  description: "Schedule a sales meeting for a qualified lead",
  parameters: {
    type: "object",
    properties: {
      leadEmail: {
        type: "string",
        description: "Lead's email address",
      },
      leadName: {
        type: "string",
        description: "Lead's full name",
      },
      preferredDate: {
        type: "string",
        description: "Preferred meeting date (YYYY-MM-DD)",
      },
      preferredTime: {
        type: "string",
        description: "Preferred time slot (e.g. 'morning', 'afternoon', or 'HH:MM')",
      },
      meetingType: {
        type: "string",
        enum: ["discovery", "demo", "follow-up"],
        description: "Type of meeting",
        default: "discovery",
      },
    },
    required: ["leadEmail", "leadName"],
  },
  execute: async (params) => {
    // Stub — replace with Calendly, HubSpot Meetings, etc.
    return {
      scheduled: true,
      meetingLink: "https://cal.example.com/meet/abc123",
      date: params.preferredDate ?? "2026-08-01",
      time: "10:30 AM EST",
      duration: "30 minutes",
      meetingType: params.meetingType ?? "discovery",
      salesRep: "Sarah (Account Executive)",
    };
  },
};
