export default {
  id: "local-web-chat",
  version: 1,
  provider: "atlas-simulator",
  credentials: "none",
  direction: ["inbound", "outbound"],
  normalizedMessageContract: "atlas.local-message/v1",
  consentRequired: true,
  messagingWindowRequired: true,
  deliveryReceipts: true,
  duplicateDetection: true,
  orderedConversationSequence: true
} as const;
