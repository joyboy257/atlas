import type { AtlasTool } from "@atlas-runner/atlas";

export const checkAvailability: AtlasTool = {
  name: "check_availability",
  description: "Check room availability for a date range",
  parameters: {
    type: "object",
    properties: {
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
        description: "Room type to check",
      },
      guests: {
        type: "number",
        description: "Number of guests",
      },
    },
    required: ["checkIn", "checkOut"],
  },
  execute: async ({ checkIn, checkOut, roomType, guests }) => {
    // Stub — replace with real availability lookup
    return {
      available: true,
      rooms: [
        {
          id: "201",
          type: roomType ?? "Standard",
          rate: roomType === "Suite" ? 299 : roomType === "Deluxe" ? 199 : 129,
          maxGuests: roomType === "Suite" ? 4 : roomType === "Deluxe" ? 3 : 2,
        },
      ],
      checkIn,
      checkOut,
    };
  },
};
