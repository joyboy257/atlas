# Atlas Roadmap

## Current: Public Alpha (v0.1.0-alpha)

**Goal:** Local framework and BYOK journey open without live-provider promises.

- [x] One-command project initialization (`atlas init`)
- [x] Zero-credential local runtime
- [x] Business messaging simulator (16 channels)
- [x] Developer workbench (browser UI)
- [x] BYOK and custom gateway modes
- [x] Runtime protocol and adapters
- [x] Channel fabric and conformance kit
- [x] Version-matched documentation and skills
- [ ] npm publication (`@atlas-runner/*`)
- [ ] Progressive package extraction (project-spec, sdk first)
- [ ] Runnable templates (front-desk, support, lead qualification)

## Next: Public Beta (v0.2.0-beta)

**Goal:** Hosted sandbox, managed starter inference, deploy, and proven providers.

- [ ] Atlas Cloud hosted sandbox
- [ ] Managed starter inference
- [ ] Hosted deployment
- [ ] Live provider connections (email first, then messaging channels)
- [ ] Usage and cost visibility
- [ ] Public readiness and incident surfaces
- [ ] Abuse, spend, and emergency-disable controls
- [ ] Human adoption certification (5 outside-in users)
- [ ] Multi-client coding-agent certification (3 clients)

## Later: General Availability (v1.0.0)

- [ ] All 16 channels provider-proven
- [ ] Enterprise security and governance
- [ ] Durable production execution (queues, retries, SLOs)
- [ ] Hosted observability (traces, receipts, replay, alerts)
- [ ] Team Inbox and operator workflows
- [ ] Billing and commercial readiness
- [ ] Production SLOs and incident response

## Package Extraction Roadmap

| Package | Status | Target |
|---------|--------|--------|
| `@atlas-runner/atlas` | Ships complete | Thins to re-export umbrella |
| `@atlas-runner/project-spec` | Extracting | Schema, contract types, validation |
| `@atlas-runner/sdk` | Extracting | Pure types, runtime interfaces |
| `@atlas-runner/cli` | Planned | CLI command suite |
| `@atlas-runner/local-runtime` | Planned | Agent loop, simulator, dev server |
| `@atlas-runner/channel-sdk` | Planned | Channel fabric, adapters |
| `@atlas-runner/runtime-adapters` | Planned | Protocol, native runtime, bridges |
| `@atlas-runner/testkit` | Planned | Conformance suites, fixtures |

## Channel Provider Roadmap

Channels will progress from `LOCAL_CONFORMANCE` to `PROVIDER_PROVEN` as live provider connections are established:

1. Email (Resend) — already integrated with private Mirai backend
2. Web Chat — native, no external provider needed
3. Slack
4. WhatsApp Business Cloud
5. SMS (Twilio)
6. Remaining channels

Provider connection order is subject to change based on demand and provider API availability.
