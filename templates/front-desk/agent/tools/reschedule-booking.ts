import type { AtlasTool } from "@atlas-runner/atlas";

export const rescheduleBooking: AtlasTool = {
  name: "reschedule_booking",
  description: "Reschedule an existing booking to new dates",
  parameters: {
    type: "object",
    properties: {
      confirmationId: {
        type: "string",
        description: "The confirmation ID of the booking to reschedule",
      },
      newCheckIn: {
        type: "string",
        description: "New check-in date (YYYY-MM-DD)",
      },
      newCheckOut: {
        type: "string",
        description: "New check-out date (YYYY-MM-DD)",
      },
    },
    required: ["confirmationId", "newCheckIn", "newCheckOut"],
  },
  execute: async ({ confirmationId, newCheckIn, newCheckOut }) => {
    // Stub — replace with real booking system
    return {
      rescheduled: true,
      confirmationId,
      newCheckIn,
      newCheckOut,
      status: "RESCHEDULED",
    };
  },
};
