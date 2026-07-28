import type { AtlasChannelAdapter } from "@atlas-runner/atlas";

/**
 * Email channel — async support via email.
 * Stub: LOCAL_CONFORMANCE only. Replace with a real provider for production.
 */
const email: AtlasChannelAdapter = {
  id: "email",
  name: "Email Support",
  kind: "email",
  readiness: "LOCAL_CONFORMANCE",
  provider: "local",
  config: {
    inboundAddress: "support@example.com",
    outboundName: "Example Support",
    replyHandling: "thread",
  },
};

export default email;
