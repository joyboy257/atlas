import type { AtlasTool } from "@atlas-runner/atlas";

export const bookRoom: AtlasTool = {
  name: "book_room",
  description: "Book a room for a guest",
  parameters: {
    type: "object",
    properties: {
      guestName: {
        type: "string",
        description: "Full name of the guest",
      },
      guestEmail: {
        type: "string",
        description: "Email address for confirmation",
      },
      checkIn: {
        type: "string",
        description: "Check-in date (YYYY-MM-DD)",
      },
      checkOut: {
        type: "string",
        description: "Check-out date (YYYY-MM-DD)",
      },
      roomType: {
        type: "string",
        enum: ["Standard", "Deluxe", "Suite"],
        description: "Room type requested",
      },
      guests: {
        type: "number",
        description: "Number of guests",
      },
    },
    required: ["guestName", "guestEmail", "checkIn", "checkOut", "roomType"],
  },
  execute: async (params) => {
    // Stub — replace with real booking system
    const confirmationId = `BK-${Date.now().toString(36).toUpperCase()}`;
    return {
      confirmed: true,
      confirmationId,
      ...params,
      status: "CONFIRMED",
    };
  },
};
