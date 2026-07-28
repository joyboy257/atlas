import type { AtlasChannelAdapter } from "@atlas-runner/atlas";

/**
 * Web chat channel — embedded widget or standalone chat page.
 * Stub: LOCAL_CONFORMANCE only. Replace with a real provider for production.
 */
const webChat: AtlasChannelAdapter = {
  id: "web-chat",
  name: "Web Chat",
  kind: "chat",
  readiness: "LOCAL_CONFORMANCE",
  provider: "local",
  config: {
    greeting: "👋 Welcome to The Example Hotel. How can I help you today?",
    placeholder: "Type your message...",
    typingIndicator: true,
  },
};

export default webChat;
