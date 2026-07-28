# Atlas Deployment

## Sandbox (Local Hosted Preview)

The Atlas sandbox runs the full stack locally — API, worker, PostgreSQL, Redis — using simulated providers. No credentials needed.

```bash
# 1. Set up environment
cp deploy/env/sandbox.env.example deploy/env/sandbox.env

# 2. Start the sandbox
docker compose -f deploy/docker-compose.sandbox.yml up -d

# 3. Verify
docker compose -f deploy/docker-compose.sandbox.yml ps
curl http://localhost:4001/health

# 4. Connect from Atlas CLI
atlas deploy status

# 5. Stop
docker compose -f deploy/docker-compose.sandbox.yml down
```

### Sandbox Services

| Service | Port | Description |
|---------|------|-------------|
| atlas-api | 4001 | Core API — execution, deployment, health |
| atlas-worker | — | Background worker — queues, outbox, retries |
| postgres | 5433 | Database (tenant-isolated, RLS) |
| redis | 6380 | Cache and queue backend |
| otel-collector | 4318 | OpenTelemetry traces and metrics |
| jaeger | 16686 | Trace UI (optional, profile: observability) |

### Channel Modes

| Mode | Description | Requires |
|------|-------------|----------|
| `simulator` | All 16 channels use LOCAL_CONFORMANCE simulators | Nothing |
| `provider` | Real provider connections | Provider credentials in sandbox.env |

### Model Modes

| Mode | Description | Requires |
|------|-------------|----------|
| `local-fixture` | Deterministic, free, zero-cred | Nothing |
| `managed` | Atlas-supplied inference | ATLAS_API_KEY |
| `byok` | Bring your own API keys | Provider-specific keys |
| `gateway` | OpenAI-compatible gateway | ATLAS_GATEWAY_URL |

## Staging (Atlas Cloud Preview)

Coming in beta. Staging will provide a managed sandbox with starter inference and provider connections.

## Production

Production deployment is gated behind the beta release (P4-008). See [ROADMAP.md](../ROADMAP.md).

## Architecture

```
┌──────────────────────────────────────────────┐
│                  Caddy (TLS)                  │
│                   :443 → :4001                │
├──────────────────────────────────────────────┤
│              Atlas API (:4001)                │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Execution│ │Deployment│ │Credential Mgr│  │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘  │
│       │            │              │           │
│  ┌────▼────────────▼──────────────▼───────┐  │
│  │           PostgreSQL (RLS)              │  │
│  │    ┌──────┐ ┌────────┐ ┌───────────┐   │  │
│  │    │Tenant│ │Outbox  │ │Receipts   │   │  │
│  │    │Data  │ │Events  │ │(Audit)    │   │  │
│  │    └──────┘ └────────┘ └───────────┘   │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌───────────────────────────────────────┐    │
│  │          Redis (Queue/Cache)          │    │
│  │    ┌──────────┐ ┌──────────────────┐  │    │
│  │    │Job Queue │ │Idempotency Cache │  │    │
│  │    └──────────┘ └──────────────────┘  │    │
│  └───────────────────────────────────────┘    │
├──────────────────────────────────────────────┤
│            Atlas Worker                      │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │Outbox    │ │Channel   │ │Receipt      │  │
│  │Relay     │ │Sender    │ │Finalizer    │  │
│  └──────────┘ └──────────┘ └─────────────┘  │
└──────────────────────────────────────────────┘
```

## Security Notes (Sandbox)

- **Development only.** Not hardened for internet exposure.
- All ports bind to `127.0.0.1` (loopback) — not accessible from the network.
- Default credentials are `atlas:atlas-sandbox` — change for shared machines.
- JWT secret is a hardcoded dev value — never use in production.
- No rate limiting, no abuse controls, no secret scanning in sandbox mode.

See [SECURITY.md](../SECURITY.md) for the full security model.
