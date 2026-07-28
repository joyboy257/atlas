# Security Review Template

**Target:** Atlas Beta (v0.2.0-beta.0)  
**Review type:** Pre-beta external-facing security review  
**Status:** PREPARING — review not yet executed

## Review Scope

- Atlas API (execution, deployment, credential management)
- Atlas Worker (outbox relay, channel senders, receipt finalizer)
- Database layer (PostgreSQL with RLS)
- Cache/queue layer (Redis)
- Channel adapters (16 channels, simulator and provider modes)
- CLI and local runtime
- Docker sandbox and deployment infrastructure

## Review Dimensions

### 1. Authentication & Authorization

- [ ] JWT token validation — expiry, signature, issuer
- [ ] Tenant identity resolution — org ID from token, no cross-tenant access
- [ ] Tool authorization — `approve`/`block`/`review` decisions enforced
- [ ] External runtime isolation — propose only, cannot commit or send
- [ ] API key scoping — BYOK keys scoped to tenant, not global

**Evidence required:**
- Cross-tenant negative test results
- Token validation test suite
- Authorization bypass attempt logs

### 2. Credential & Secret Handling

- [ ] No secrets in source code, git history, or build artifacts
- [ ] `AtlasSecretReference` used for all credential references
- [ ] Secrets redacted in logs, traces, receipts, and error messages
- [ ] Environment variable scanning before service startup
- [ ] Credential rotation path documented and tested
- [ ] Sandbox defaults explicitly labeled as dev-only

**Evidence required:**
- Secret scan results (truffleHog, gitleaks, or equivalent)
- Log output samples (verify redaction)
- Credential rotation procedure test

### 3. Tenant Isolation

- [ ] Row-level security (RLS) enforced on all tenant-scoped tables
- [ ] Organization ID derived from authenticated principal, never from request body
- [ ] Cross-tenant queries blocked at database level
- [ ] No tenant data leakage in error messages or logs
- [ ] Tenant deletion path verified (cascading, no orphan data)

**Evidence required:**
- RLS policy definitions
- Cross-tenant negative test results
- Tenant deletion test results

### 4. Input Validation & Injection

- [ ] SQL injection — parameterized queries, no string concatenation
- [ ] Command injection — no user input passed to shell
- [ ] XSS — web chat content sanitized
- [ ] Path traversal — file operations scoped to project directory
- [ ] JSON injection — parsed with safe parsers, size limits
- [ ] Rate limiting on all public endpoints

**Evidence required:**
- Input validation test suite
- Fuzzing results (if available)
- Static analysis results

### 5. Business Messaging Security

- [ ] Outbox idempotency — replay produces same result, no double-send
- [ ] Message content not logged in plaintext (PII)
- [ ] Channel-specific content validation (e.g., SMS length limits)
- [ ] Provider webhook signature verification
- [ ] Human handoff preserves conversation context securely
- [ ] Consent and opt-out enforced at messaging layer

**Evidence required:**
- Idempotency replay test results
- Webhook signature verification tests
- Content validation boundary tests

### 6. Infrastructure Security

- [ ] Docker images scanned for vulnerabilities (Trivy or equivalent)
- [ ] Container runs as non-root user
- [ ] No privileged mode or host network
- [ ] Health endpoints expose minimal information
- [ ] Database port not exposed to host network (or bound to 127.0.0.1)
- [ ] Redis not exposed to host network (or bound to 127.0.0.1)
- [ ] TLS for all external traffic (Caddy reverse proxy)
- [ ] Resource limits prevent DoS

**Evidence required:**
- Container scan results
- Dockerfile review (non-root, no privileged)
- Network exposure audit

### 7. Dependency Security

- [ ] `npm audit` passes with no HIGH or CRITICAL advisories
- [ ] All production dependencies have compatible licenses (Apache-2.0)
- [ ] No unmaintained or deprecated packages
- [ ] Dependency update process documented
- [ ] Lockfile committed and verified

**Evidence required:**
- `npm audit --audit-level=high` output (clean)
- License check output
- Dependency freshness report

### 8. API Security

- [ ] No sensitive data in URL query parameters
- [ ] Error responses don't leak stack traces or internals
- [ ] CORS configured restrictively
- [ ] Content-Type validation on all endpoints
- [ ] Request size limits enforced
- [ ] Health endpoint does not expose dependency details publicly

**Evidence required:**
- API error response samples
- CORS configuration review
- Request validation test suite

### 9. Observability Security

- [ ] Trace data does not contain PII or secrets
- [ ] Log redaction verified for all log levels
- [ ] Metrics do not expose per-tenant granularity (aggregated only)
- [ ] OTEL collector endpoint not publicly accessible
- [ ] No credentials in health check responses

**Evidence required:**
- Trace export samples (redacted)
- Log output samples at each level
- Metrics endpoint response sample

### 10. Incident Response Readiness

- [ ] Kill switch tested — can stop any deployed agent within 60 seconds
- [ ] Secret rotation tested — can rotate all credential types
- [ ] Database restore tested — can restore from backup within RTO
- [ ] Rollback tested — can revert to previous deployment
- [ ] Incident response runbook published (see incident-response.md)
- [ ] Security contact listed in SECURITY.md

**Evidence required:**
- Kill switch test log
- Secret rotation procedure test
- Database restore test timing

## Review Execution

This review has **not yet been executed**. It is a template for the pre-beta
security gate. When P3-010b is resolved and the hosted sandbox is running:

1. Assign a security reviewer (internal or external)
2. Execute all checklist items with evidence
3. File findings as GitHub issues with `security` label
4. Resolve all HIGH/CRITICAL findings before beta launch
5. Publish security review summary in `docs/beta/release/security-review-results.md`
