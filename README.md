# Atlas

**The Business Messaging Agent Runtime.**

Atlas is the fastest and safest route from an empty folder — or an existing agent — to a governed business outcome on every declared business messaging channel.

> **Status: Public Alpha** — Local framework and BYOK journey are open. No live-provider promises.

## Quick Start

```bash
# Requires Node.js >= 22
npx @atlas-runner/atlas init front-desk
cd front-desk
npm install
npx atlas dev
```

No account. No provider credentials. No cloud. No paid model. One command.

## What Atlas Does

Atlas gives you a **governed agent runtime** for business messaging:

- **Project contract** — Versioned `atlas.config.ts` that defines your agent's identity, model routing, and tool policy
- **Local runtime** — Full agent loop with tool proposals, policy checks, approval gates, and outcome receipts
- **Business messaging simulator** — Test channels, duplicates, failures, and approval flows locally
- **Developer workbench** — Browser-based UI for chat, trace, tool proposals, and receipts
- **Channel fabric** — One interface for all business messaging channels (email, SMS, WhatsApp, Slack, etc.)
- **Runtime protocol** — Versioned turn protocol for external runtime interop
- **BYOK / Gateway** — Bring your own model keys or connect to any OpenAI-compatible gateway

## Readiness Matrix

### Channels

| Channel | Status | Notes |
|---------|--------|-------|
| Web Chat | `LOCAL_CONFORMANCE` | Simulator-proven; no live provider |
| Email | `LOCAL_CONFORMANCE` | Simulator-proven; no live provider |
| SMS | `LOCAL_CONFORMANCE` | Simulator-proven; no live provider |
| WhatsApp Business | `LOCAL_CONFORMANCE` | Simulator-proven; no live provider |
| Facebook Messenger | `LOCAL_CONFORMANCE` | Simulator-proven; no live provider |
| Instagram Messaging | `LOCAL_CONFORMANCE` | Simulator-proven; no live provider |
| TikTok Business | `LOCAL_CONFORMANCE` | Simulator-proven; no live provider |
| Telegram | `LOCAL_CONFORMANCE` | Simulator-proven; no live provider |
| Slack | `LOCAL_CONFORMANCE` | Simulator-proven; no live provider |
| Microsoft Teams | `LOCAL_CONFORMANCE` | Simulator-proven; no live provider |
| Google Chat | `LOCAL_CONFORMANCE` | Simulator-proven; no live provider |
| Discord | `LOCAL_CONFORMANCE` | Simulator-proven; no live provider |
| GitHub | `LOCAL_CONFORMANCE` | Simulator-proven; no live provider |
| Linear | `LOCAL_CONFORMANCE` | Simulator-proven; no live provider |
| Voice | `LOCAL_CONFORMANCE` | Simulator-proven; no live provider |
| X (Twitter) | `LOCAL_CONFORMANCE` | Simulator-proven; no live provider |

### Runtimes

| Runtime | Status | Notes |
|---------|--------|-------|
| Atlas Native | `LOCAL_PROVEN` | Reference implementation |
| OpenAI Agents SDK | `LOCAL_CONFORMANCE` | Adapter proven locally |
| Eve | `LOCAL_CONFORMANCE` | Adapter proven locally |
| Generic Webhook/HTTP | `LOCAL_CONFORMANCE` | Adapter proven locally |

### Inference Modes

| Mode | Status | Notes |
|------|--------|-------|
| Managed | `IMPLEMENTING` | Local fixture mode works; hosted managed inference not yet available |
| BYOK | `LOCAL_PROVEN` | Bring your own keys works locally |
| Custom Gateway | `LOCAL_PROVEN` | OpenAI-compatible gateways work locally |

**Status labels:** `PRODUCTION_PROVEN` > `STAGING_PROVEN` > `LOCAL_PROVEN` > `LOCAL_CONFORMANCE` > `IMPLEMENTING` > `PROVIDER_BLOCKED`

## Known Limitations

- **No live provider connections.** All 16 channels pass local simulator conformance but have not been proven against real provider APIs. Provider-connected channels: 0.
- **No hosted deployment.** Atlas Cloud (managed deployment, durable execution, observability, billing) is under development. Currently local-only.
- **No npm publication yet.** The `@atlas-runner/*` packages are prepared but not yet published to the npm registry.
- **Progressive package extraction.** The SDK is being split into focused packages (`project-spec`, `sdk`, `cli`, `local-runtime`, `channel-sdk`, `runtime-adapters`, `testkit`). Currently ships as a single `@atlas-runner/atlas` package.
- **No human adoption testing.** Outside-in human testing is deferred to the beta gate per the P1 surrogate amendment.
- **Single coding-agent client tested.** Multi-client certification is deferred to the beta gate.

## Packages

| Package | Status | Description |
|---------|--------|-------------|
| `@atlas-runner/atlas` | `ALPHA` | Main package — CLI, runtime, simulator, workbench, contracts |
| `@atlas-runner/project-spec` | `EXTRACTING` | Project schema, contract types, validation |
| `@atlas-runner/sdk` | `EXTRACTING` | Pure types, runtime interfaces, channel contracts |
| `@atlas-runner/cli` | `PLANNED` | CLI command suite |
| `@atlas-runner/local-runtime` | `PLANNED` | Agent loop, simulator, dev server |
| `@atlas-runner/channel-sdk` | `PLANNED` | Channel fabric, adapters, conformance kit |
| `@atlas-runner/runtime-adapters` | `PLANNED` | Protocol, native runtime, external bridges |
| `@atlas-runner/testkit` | `PLANNED` | Conformance suites, fixtures, verification tools |

## Development

```bash
git clone https://github.com/joyboy257/atlas.git
cd atlas
npm install
npm run build
npm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup and guidelines.

## Licence

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE) for details.

## Security

See [SECURITY.md](SECURITY.md) for our security policy and disclosure process.

---

🤖 Built in public. Truthful about what works and what doesn't.
