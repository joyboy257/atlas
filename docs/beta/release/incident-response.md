# Incident Response Runbook

**Status:** PREPARING — not yet tested with live infrastructure

## Severity Levels

| Level | Definition | Response Time | Example |
|-------|-----------|---------------|---------|
| **SEV1** | Service down, data loss, security breach | Immediate (any hour) | Database corruption, RCE, PII leak |
| **SEV2** | Major feature broken, provider outage | < 1 hour | Email delivery failing, agent execution stuck |
| **SEV3** | Minor feature degraded, non-critical | < 4 hours | Slow responses, UI glitch |
| **SEV4** | Cosmetic, future concern | Next business day | Docs typo, non-blocking warning |

## Incident Commander Checklist

### 1. Declare (SEV1/SEV2)

```bash
# Who: First person to detect the issue
# Action: Declare in incident channel

# SEV1: @here INCIDENT: Atlas [service] is [symptom]. Declaring SEV1.
#        Incident doc: [link]
#        I am IC. Need: [on-call engineer, DBA if data issue]
```

### 2. Assess

- [ ] What service(s) are affected?
- [ ] What's the blast radius? (all tenants, one tenant, one channel)
- [ ] When did it start? (check deploy history: `atlas deploy status`)
- [ ] Is there a recent deploy? (likely cause — consider rollback)
- [ ] Are there provider outages? (check provider status pages)

### 3. Mitigate

```bash
# Option A: Kill switch (stops all agent execution)
atlas deploy kill-switch --enable --reason "INC-$(date +%s): [brief description]"

# Option B: Rollback (if caused by recent deploy)
atlas deploy rollback

# Option C: Channel switch (provider outage)
atlas deploy channel-mode --set simulator --channel <affected-channel>

# Option D: Tenant isolation (single tenant issue)
atlas deploy tenant-disable --tenant-id <id> --reason "Investigating incident"
```

### 4. Communicate

- [ ] Incident channel: initial assessment within 5 min
- [ ] Status page: update if user-facing (SEV1/SEV2)
- [ ] Affected tenants: direct notification if data exposure possible
- [ ] Stakeholders: CEO/CTO for SEV1

### 5. Investigate

```bash
# Gather evidence
atlas logs show --trace-id <id> --last 15m
atlas runs list --status failed --since 30m
atlas receipts verify --recent 100
docker compose logs --tail=500 atlas-api atlas-worker

# Check infrastructure
docker compose ps
df -h  # Disk space
free -m  # Memory
```

### 6. Resolve

- [ ] Root cause identified
- [ ] Fix deployed and verified
- [ ] Kill switch disabled (if used)
- [ ] All services healthy
- [ ] Receipts verified clean
- [ ] Affected messages replayed/recovered

### 7. Post-Incident

- [ ] **Postmortem written within 24h (SEV1), 48h (SEV2)**
  - Timeline of events
  - Root cause
  - What went well
  - What went wrong
  - Action items (with owners and deadlines)
- [ ] Action items tracked in GitHub issues
- [ ] Runbook updated if new procedures were discovered

## Common Incidents & Responses

### Database Connection Pool Exhaustion

**Symptom:** API returns 503, logs show "too many clients"  
**Response:**
```bash
# Check connections
psql --host=localhost --port=5433 --username=atlas --dbname=atlas \
  --command="SELECT count(*) FROM pg_stat_activity;"

# Restart API (drains connections)
docker compose restart atlas-api
```

**Prevention:** Connection pool max = 20 per service, idle timeout = 10s.

### Redis Memory Pressure

**Symptom:** Worker slows down, queue depth grows  
**Response:**
```bash
# Check memory
docker compose exec redis redis-cli INFO memory | grep used_memory_human

# Flush idempotency cache (safe — only caches dedup keys)
docker compose exec redis redis-cli KEYS "idempotency:*" | wc -l

# Restart if needed (queues are persisted in PostgreSQL outbox)
docker compose restart redis
```

### Provider Outage (e.g., Twilio down)

**Symptom:** Channel sender logs provider errors, outbox events accumulating  
**Response:**
```bash
# Switch to simulator (queues preserved, no sends lost)
atlas deploy channel-mode --set simulator --channel sms

# Monitor queue
watch -n 5 'atlas runs list --channel sms --status queued | wc -l'

# When provider recovers:
atlas deploy channel-mode --set provider --channel sms
# Outbox relay will drain accumulated events with idempotency safety
```

### Credential Leak

**Symptom:** Secret found in git history, logs, or environment  
**Response (SEV1):**
```bash
# 1. Rotate compromised credential immediately
#    (e.g., generate new API key in provider dashboard)

# 2. Update credential in Atlas
atlas env create --key <COMPROMISED_KEY> --force

# 3. Revoke old credential at provider
#    (do this AFTER updating Atlas to avoid downtime)

# 4. Scan for exposure
gitleaks detect --source . --verbose

# 5. Audit recent access
atlas logs show --filter credential --last 24h

# 6. Notify if credential was actively exploited
```

## Escalation Path

```
Level 1: On-call engineer (first responder)
    ↓ can't resolve in 15 min
Level 2: Atlas team lead + SRE
    ↓ can't resolve in 30 min (SEV1) / 2 hours (SEV2)
Level 3: CTO + external provider support
```

## Testing the Runbook

This runbook should be tested before beta launch:

1. **Tabletop exercise:** Walk through a SEV1 scenario with the team
2. **Kill switch drill:** Activate and deactivate in sandbox
3. **Rollback drill:** Deploy, then rollback, verify no data loss
4. **Provider failover drill:** Switch channel to simulator and back
5. **Restore drill:** Restore database from backup, verify integrity

## Contact Information

**Beta security contact:** Listed in [SECURITY.md](../../SECURITY.md)  
**Provider status pages:**
- Resend: https://status.resend.com
- Twilio: https://status.twilio.com
- Meta (WhatsApp/Messenger): https://metastatus.com
