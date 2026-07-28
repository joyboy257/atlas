# Provider Onboarding Guide

How to connect real messaging providers to an Atlas agent.

## Quick Reference

| Channel | Provider Options | Setup Complexity | Sandbox Status |
|---------|-----------------|-----------------|----------------|
| Email | Resend, SendGrid, AWS SES | Low | Simulator only |
| SMS | Twilio, Vonage | Low | Simulator only |
| WhatsApp | Meta Business Cloud | Medium | Simulator only |
| Web Chat | Atlas-native, custom | Low | Works locally |
| Messenger | Meta | Medium | Simulator only |
| Instagram | Meta | Medium | Simulator only |
| Slack | Slack API | Low | Simulator only |
| Teams | Microsoft Graph | Medium | Simulator only |
| Google Chat | Google Chat API | Medium | Simulator only |
| Discord | Discord API | Low | Simulator only |
| GitHub | GitHub App | Low | Simulator only |
| Linear | Linear API | Low | Simulator only |
| Voice | Twilio, Vonage | High | Simulator only |
| X | X API | Medium | Simulator only |
| Telegram | Telegram Bot API | Low | Simulator only |
| TikTok | TikTok Business API | High | Simulator only |

## Adding a Provider

### 1. Get Provider Credentials

Each provider has its own credential format. Atlas normalizes these into
`AtlasSecretReference` (`atlas.secret-ref/v1`):

```ts
// Example: Resend (email)
const emailCreds: AtlasSecretReference = {
  kind: "atlas.secret-ref/v1",
  provider: "resend",
  fields: ["api_key"],
  // The actual key is never in source — it's resolved at runtime
  // from environment, secret store, or credential manager
};
```

### 2. Configure the Channel

```ts
// channels/email.ts
import type { AtlasChannelAdapter } from "@atlas-runner/atlas";

const email: AtlasChannelAdapter = {
  id: "email",
  name: "Transactional Email",
  kind: "email",
  readiness: "LOCAL_CONFORMANCE",  // ← Change to "PROVIDER_CONNECTED" when live
  provider: "resend",               // ← Change to your provider
  config: {
    fromAddress: "agent@yourdomain.com",
    fromName: "Your Agent",
    replyTo: "support@yourdomain.com",
  },
};

export default email;
```

### 3. Add Credentials

```bash
# Environment variable (dev)
export ATLAS_EMAIL_API_KEY="re_..."

# Or Atlas credential manager (recommended)
atlas env create --key ATLAS_EMAIL_API_KEY
```

### 4. Update Readiness

When the provider is connected and tested:

```ts
readiness: "PROVIDER_CONNECTED",  // Was LOCAL_CONFORMANCE
```

### 5. Test

```bash
# Dry run — no real send
atlas test --channel email

# Live test — sends one real message
atlas test --channel email --live
```

## Credential Safety

- **Never commit credentials to source.** Use `AtlasSecretReference` types.
- **Use the credential manager.** `atlas env create` stores secrets outside the repo.
- **Sandbox uses simulators.** No real credentials needed in development.
- **Production uses Infisical/secret store.** Credentials are never in environment files.

See [SECURITY.md](../../SECURITY.md) for the full credential handling model.

## Provider Readiness States

| State | Meaning | When to Use |
|-------|---------|------------|
| `LOCAL_CONFORMANCE` | Channel contract works, no live provider | Development, sandbox |
| `PROVIDER_AUTHORIZED` | OAuth/app connected, not yet tested | Integration in progress |
| `PROVIDER_CONNECTED` | Live messages flow, error handling verified | Staging, pre-production |
| `PROVIDER_CERTIFIED` | Full lifecycle — send, delivery, receipt, retry, failure | Production |

## BYOK Model Setup

To use your own model provider instead of Atlas-managed inference:

```json
// atlas.config.ts
{
  "model": {
    "mode": "byok",
    "provider": "anthropic",
    "credentialRef": "atlas.secret-ref/v1"
  }
}
```

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
atlas dev
```

## Gateway Mode

For OpenAI-compatible gateways (LiteLLM, vLLM, etc.):

```json
{
  "model": {
    "mode": "gateway",
    "url": "https://your-gateway.com/v1",
    "credentialRef": "atlas.secret-ref/v1"
  }
}
```
