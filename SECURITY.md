# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x (alpha) | ✅ Limited — best-effort for the latest alpha |

During the public alpha, security support is best-effort. Critical vulnerabilities will be addressed promptly.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Email security concerns to the maintainer directly. Include:
- A description of the vulnerability
- Steps to reproduce
- Affected versions
- Any potential mitigations you've identified

You will receive a response within 72 hours. We will coordinate disclosure with you.

## Security Model

Atlas implements a governed agent runtime with these security boundaries:

### Tenant Isolation
- Every business transaction is scoped to a server-derived organization ID
- Row-level security (RLS) enforced at the database layer
- Cross-tenant negatives verified in the test suite

### Credential Handling
- Secret references use typed `AtlasSecretReference` (`atlas.secret-ref/v1`)
- BYOK and gateway credentials are never logged or stored in receipts
- Synthetic credential-shaped test fixtures are explicitly labeled

### Tool Authorization
- External runtimes propose; Atlas authorizes before commit
- No external runtime may directly send, self-approve, or mutate business state
- Tool proposals go through policy checks with explicit approve/block/review outcomes

### Business Messaging
- Outbox pattern ensures at-least-once delivery with idempotency keys
- Audit trail for every committed business action
- Receipt integrity verification

### Local Runtime
- Zero-credential mode works with no account, provider keys, or cloud access
- Local dev server binds to loopback by default
- Host and Origin validation for workbench connections

## Known Security Limitations (Alpha)

- No production deployment environment — all security testing is local
- No external penetration test or security audit completed
- Provider credential lifecycle management not yet implemented
- Abuse, spam, and spend controls not yet active
- Rate limiting not yet implemented in local mode
- Secret scanning on git history is bounded (regex-based, not dedicated scanner)
- No incident response runbook or security disclosure program

## Security Best Practices for Users

1. **Never commit credentials.** Use `AtlasSecretReference` for BYOK/gateway keys.
2. **Keep Atlas updated.** Alpha releases may contain security fixes.
3. **Run local-only for now.** Do not expose the local dev server to untrusted networks.
4. **Review tool proposals.** The approval gate exists for a reason — review before accepting.
5. **Test in isolation.** Use the simulator before connecting to real providers.
