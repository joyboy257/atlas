import type { AtlasPolicy } from "@atlas-runner/atlas";

/**
 * Booking change policy — requires confirmation before any reschedule or
 * cancellation that would incur a fee (within 24 hours of check-in).
 */
export const bookingChangePolicy: AtlasPolicy = {
  name: "booking_change_policy",
  description: "Require human confirmation for last-minute booking changes",
  evaluate: async (context) => {
    const { action, checkIn } = context;

    if (action === "reschedule" || action === "cancel") {
      const now = new Date();
      const checkInDate = new Date(checkIn);
      const hoursUntilCheckIn =
        (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilCheckIn <= 24) {
        return {
          decision: "approve_with_confirmation",
          reason:
            "This change is within 24 hours of check-in and may incur a fee. Please confirm with the guest.",
        };
      }
    }

    return { decision: "approve" };
  },
};
