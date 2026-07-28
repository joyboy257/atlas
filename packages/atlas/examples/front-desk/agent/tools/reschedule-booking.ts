export default {
  id: "front-desk.bookings.reschedule",
  version: 1,
  description: "Reschedule an identified booking after a governed operator approval.",
  risk: "high",
  execution: "commit",
  idempotency: "required",
  approval: "required",
  input: {
    bookingId: "string",
    requestedDate: "string"
  },
  outcome: "booking_rescheduled",
  delivery: "atlas_outbox"
} as const;
