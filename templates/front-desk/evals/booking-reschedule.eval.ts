import type { AtlasEval } from "@atlas-runner/atlas";

/**
 * Booking reschedule evaluation — verifies the agent handles a
 * standard reschedule request correctly.
 */
export const bookingRescheduleEval: AtlasEval = {
  name: "booking-reschedule",
  description: "Guest requests to reschedule a booking to new dates",
  turns: [
    {
      user: "Hi, I have a booking with confirmation BK-ABC123. Can I move it from July 10-15 to July 20-25 instead?",
      assertions: [
        { kind: "tool_called", tool: "reschedule_booking" },
        { kind: "contains", text: "BK-ABC123" },
        { kind: "contains", text: "July 20" },
      ],
    },
  ],
};
