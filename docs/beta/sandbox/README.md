# Atlas Beta Sandbox

The Atlas Beta Sandbox provides a local hosted-experience preview of the full
Atlas stack. It is the bridge between the zero-credential local runtime and the
full Atlas Cloud production environment.

## Status

**PREPARING — not yet live.** The sandbox infrastructure is built and documented.
It awaits the hosted flagship proof (ATLAS-P3-010b) before the beta gate opens.

## What Works Today

- Docker Compose stack (API, worker, PostgreSQL, Redis, OTEL collector)
- All 16 channels in simulator mode (LOCAL_CONFORMANCE)
- Local-fixture model (deterministic, zero credentials)
- Health check endpoints
- Tenant-isolated database with RLS

## What's Blocked

These are documented, wired, but not yet proven end-to-end:

| Capability | Status | Blocker |
|-----------|--------|---------|
| Real email provider (Resend/SendGrid) | Wired, not tested | P3-010b |
| Real SMS provider (Twilio) | Wired, not tested | P3-010b |
| Real WhatsApp provider (Meta) | Wired, not tested | P3-010b |
| Managed inference mode | Wired, not tested | P3-010b |
| BYOK mode (Anthropic/OpenAI) | Wired, tested locally | — |
| Gateway mode (OpenAI-compatible) | Wired, tested locally | — |
| Cross-runtime execution (OpenAI/Eve/webhook) | Wired, not tested | P3-010b |
| Staging deployment on VPS | Docker build verified, not deployed | P3-010b |

## Sandbox vs Local Runtime

| | Local Runtime (`atlas dev`) | Sandbox (`docker compose`) |
|---|---|---|
| **Startup** | `atlas dev` | `docker compose up -d` |
| **Infrastructure** | In-memory | PostgreSQL + Redis |
| **Persistence** | None | Durable (volumes) |
| **Tenant isolation** | N/A (single user) | RLS enforced |
| **Channels** | Simulator only | Simulator (provider ready) |
| **Observability** | Console logs | OTEL traces, Jaeger UI |
| **Purpose** | Develop agents | Preview hosted experience |

## Quick Start

```bash
cp deploy/env/sandbox.env.example deploy/env/sandbox.env
docker compose -f deploy/docker-compose.sandbox.yml up -d
curl http://localhost:4001/health
```

## Next Steps (Beta Gate)

When P3-010b is resolved:

1. Deploy sandbox to mirai-vps staging
2. Connect one real provider (email first)
3. Execute cross-runtime governed outcome
4. Verify tenant isolation with real data
5. Open beta sandbox to early adopters

See [P4-006 Beta Release Plan](../release/beta-release-checklist.md).
