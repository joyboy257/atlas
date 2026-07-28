export default {
  id: "front-desk.booking-change",
  version: 1,
  appliesTo: "front-desk.bookings.reschedule",
  risk: "high",
  decision: "approval_required",
  requires: [
    "customer_identity",
    "message_consent",
    "open_messaging_window",
    "approved_booking_policy",
    "idempotency_key"
  ],
  handoffWhen: [
    "identity_unverified",
    "consent_missing",
    "messaging_window_closed",
    "availability_unknown",
    "operator_takeover"
  ]
} as const;
