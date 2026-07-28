import type { AtlasChannelAdapter } from "@atlas-runner/atlas";

/**
 * Web chat channel — embedded on the pricing or demo page.
 * Stub: LOCAL_CONFORMANCE only. Replace with a real provider for production.
 */
const webChat: AtlasChannelAdapter = {
  id: "web-chat",
  name: "Web Chat",
  kind: "chat",
  readiness: "LOCAL_CONFORMANCE",
  provider: "local",
  config: {
    greeting:
      "👋 Thanks for your interest! I'd love to learn more about what you're looking for. What brings you here today?",
    placeholder: "Tell us about your needs...",
    typingIndicator: true,
  },
};

export default webChat;
