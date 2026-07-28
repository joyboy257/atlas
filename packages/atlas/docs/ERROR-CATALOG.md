# Atlas error catalog

Atlas CLI JSON errors use this shape:

```json
{
  "ok": false,
  "error": {
    "code": "CONFLICT",
    "message": "Atlas scaffold conflict: atlas.config.ts already exists with different content",
    "retryable": false,
    "next_action": "Move or restore the conflicting file before retrying"
  }
}
```

Use `code` for automation and `next_action` for recovery. Do not parse prose from `message`.

## CLI and project errors

### `USAGE_ERROR`

The command, positional argument, flag, environment name, package manager, or input shape is unsupported.

Action: run `atlas --help`, use the documented command form, and retry. No project mutation should have occurred.

### `LOCAL_STATE_ERROR`

A required local file is missing, unreadable, corrupt, unsafe, or incompatible with the current project hash.

Action: run `atlas doctor --json`, preserve evidence files, and follow the failing check's `next_action`.

### `CONFLICT`

Atlas refused to overwrite occupied files, mix incompatible package versions, mutate a terminal approval/delivery, or apply a hosted action to a local-only project.

Action: inspect existing state. Use a new identifier, explicit existing-project adoption, or a supported migration instead of forcing the operation.

### `AUTHENTICATION_REQUIRED`

A hosted/cloud command needs an Atlas credential. The zero-credential local First Agent Loop does not require one.

Action: use the local command unless a hosted operation was intended. For an approved hosted operation, run the documented login flow.

### `AUTHORIZATION_FAILED`

The authenticated principal lacks the scope or authority required by a hosted operation.

Action: do not supply client-side tenant authority. Request the correct server-issued role or scope.

## Runtime and simulator errors

### `INVALID_MESSAGE`

A normalized inbound message, approval decision, delivery attempt, or callback omitted required identity/state fields or used an invalid type.

Action: compare the payload to the generated example or use the workbench instead of manual HTTP requests.

### `IDEMPOTENCY_MISMATCH`

A message ID, action idempotency key, or callback ID was reused with different normalized input.

Action: reuse the original payload exactly or issue a new identity. Never change input behind an existing idempotency key.

### `OUT_OF_ORDER_MESSAGE`

The conversation received an old sequence after a later sequence was accepted, or a message cannot yet be processed because an earlier sequence is missing.

Action: deliver the missing sequence first. The simulator can hold and drain future messages deterministically.

### `NOT_FOUND`

A referenced approval, proposal, conversation, outbox item, trace, receipt, or provider message identity does not exist in the current local authority.

Action: run `atlas inspect --json` and use an existing identifier.

### `RETRY_NOT_READY`

A transient provider failure scheduled a retry and the deterministic retry time has not arrived.

Action: wait until `next_attempt_at` or advance simulator time before retrying.

### `DELIVERY_STATE_REGRESSION`

A callback attempted to move delivery backward, such as `delivered` to `sent`, or to change a terminal rejection/failure.

Action: ignore stale callbacks and preserve the highest valid terminal state.

### `PROJECT_STATE_MISMATCH`

`.atlas/runtime-state.json` belongs to a different project hash or unsupported runtime schema.

Action: preserve the file as evidence, run `atlas doctor --json`, then migrate or create a fresh local project. Do not edit the project hash by hand.

## Provider and platform errors

### `PROVIDER_ERROR`

A hosted provider or platform request failed. This code does not apply to the deterministic local simulator unless the failure was deliberately injected.

Action: inspect retryability, provider code, and the bound trace. Do not duplicate a committed action while retrying delivery.

### `TIMEOUT`

A bounded request, poll, or local operation exceeded its deadline.

Action: inspect partial state and receipts before retrying. Reuse the original idempotency identity only with identical input.
