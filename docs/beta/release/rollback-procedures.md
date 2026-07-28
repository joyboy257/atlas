# Rollback Procedures

How to safely roll back an Atlas deployment.

## Quick Reference

| Scenario | Rollback Method | RTO Target |
|----------|----------------|------------|
| Bad code deploy | `atlas deploy rollback` | < 2 min |
| Database migration failure | `atlas deploy rollback --db` | < 5 min |
| Provider outage | Switch to simulator mode | < 1 min |
| Security incident | Kill switch + rollback | < 1 min |
| Full disaster recovery | Database restore + redeploy | < 30 min |

## Deployment Model

Atlas uses immutable, versioned deployments:

```
deploy/
├── current → v3    # Symlink to active version
├── v1/              # Previous (kept for rollback)
├── v2/              # Previous (kept for rollback)
├── v3/              # Current (active)
└── v4/              # Next (being deployed)
```

Every deploy creates a new version directory. Rollback switches the symlink.
Database migrations are versioned and reversible.

## Procedure 1: Code Rollback

```bash
# 1. Check current state
atlas deploy status

# 2. Rollback to previous version
atlas deploy rollback

# 3. Verify
atlas deploy status
curl http://localhost:4001/health

# 4. Check affected agents
atlas runs list --since 5m
```

## Procedure 2: Database Migration Rollback

```bash
# 1. Check migration state
atlas deploy drift

# 2. Rollback migrations (reversible migrations only)
atlas deploy rollback --db --target <migration_id>

# 3. Verify data integrity
atlas deploy drift
atlas receipts verify --recent 50
```

**Warning:** Some migrations are irreversible (e.g., column drops). These are flagged with `--irreversible` in migration files. For irreversible migrations, restore from backup.

## Procedure 3: Provider Emergency Switch

If a provider is down or misbehaving, switch affected channels to simulator mode:

```bash
# 1. Identify affected channel
atlas deploy status --channels

# 2. Switch to simulator (no real sends, queues preserved)
atlas deploy channel-mode --set simulator --channel email

# 3. Verify queues are preserved
atlas runs list --channel email --status queued

# 4. When provider recovers, switch back
atlas deploy channel-mode --set provider --channel email
```

## Procedure 4: Kill Switch (Emergency Stop)

```bash
# Stop all agent execution immediately
atlas deploy kill-switch --enable --reason "Security incident — see INC-2026-001"

# Agents continue to accept messages but do not process or send
# Queued messages are preserved
# Human operators can still access Team Inbox

# Verify
atlas deploy status
# "KILL_SWITCH_ACTIVE: All agent execution suspended"

# Resume after incident resolution
atlas deploy kill-switch --disable --reason "INC-2026-001 resolved"
```

## Procedure 5: Full Disaster Recovery

```bash
# 1. Stop all services
docker compose -f deploy/docker-compose.sandbox.yml stop

# 2. Restore database from latest backup
pg_restore \
  --host=localhost --port=5433 --username=atlas \
  --dbname=atlas \
  --clean --if-exists \
  /backups/atlas-$(date -I).dump

# 3. Verify restore
psql --host=localhost --port=5433 --username=atlas --dbname=atlas \
  --command="SELECT COUNT(*) FROM atlas_execution_receipts;"

# 4. Restart services
docker compose -f deploy/docker-compose.sandbox.yml up -d

# 5. Verify
docker compose ps
curl http://localhost:4001/health
atlas deploy drift

# 6. Replay any missed outbox events
atlas runs replay --since-restore
```

## Rollback Safety Rules

1. **Never rollback by deleting files.** Always use the versioned deploy system.
2. **Test rollback before deploy.** `atlas deploy plan` shows what rollback looks like.
3. **Keep N-2 versions.** Never delete the previous two deployment versions.
4. **Backup before irreversible migrations.** `atlas deploy plan` flags these.
5. **Verify after every rollback.** `atlas deploy status` + health check + receipt check.
6. **Log every rollback.** Reason, who, what version, outcome.

## Rollback Verification Checklist

After any rollback:
- [ ] Health check passes on all services
- [ ] Database migrations match expected state
- [ ] No stuck queues (check `atlas runs list --status processing`)
- [ ] Receipts are consistent (check `atlas receipts verify --recent 50`)
- [ ] Active agents respond correctly
- [ ] No data loss in recent governed outcomes (check last 5 min)
