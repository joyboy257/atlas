export default {
  id: "front-desk-first-agent-loop",
  version: 1,
  customer: "Can I move booking BK-100 to Friday?",
  expects: [
    "message.accepted",
    "knowledge.retrieved",
    "tool.proposed",
    "policy.decided:approval_required",
    "approval.requested",
    "approval.approved",
    "action.committed:exactly_once",
    "outbox.enqueued",
    "outcome.recorded:booking_rescheduled",
    "delivery.delivered",
    "duplicate.replayed"
  ],
  negativeCases: [
    "consent_required",
    "messaging_window_closed",
    "idempotency_mismatch",
    "human_takeover",
    "transient_delivery_failure",
    "permanent_provider_rejection",
    "delivery_state_regression"
  ]
} as const;
