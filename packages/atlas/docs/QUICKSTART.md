# Quickstart: governed front desk

## 1. Create the project

```bash
npx @mirai/atlas@latest init front-desk
cd front-desk
```

Before public package approval, use the supplied local tarball instead of `@latest`:

```bash
npm install --ignore-scripts /absolute/path/to/mirai-atlas-0.1.0-preview.0.tgz
node node_modules/@mirai/atlas/bin/atlas.js init front-desk --atlas-dependency file:/absolute/path/to/mirai-atlas-0.1.0-preview.0.tgz
cd front-desk
```

The scaffold refuses unsafe occupied directories unless `--existing` is explicit. It never resets or cleans Git. Its mutation and rollback record is `.atlas/adoption-report.json`.

## 2. Verify without changing business state

```bash
atlas doctor --json
atlas test --json
atlas capabilities --json
atlas explain project --json
```

`atlas test` runs the First Agent Loop in a disposable sandbox. It does not create the project's real `.atlas/runtime-state.json`.

## 3. Run the workbench

```bash
atlas dev
```

Open the printed workbench URL. Send:

> Can I move booking BK-100 to Friday?

The page must show:

1. approved knowledge evidence;
2. the `front-desk.bookings.reschedule` tool proposal;
3. a high-risk policy decision;
4. a real pending approval;
5. one exactly-once committed booking change after approval;
6. a separate simulated provider delivery;
7. trace events and receipts for every transition.

## 4. Exercise failure paths

Use the workbench to reject or take over the conversation. Use **Transient failure** to create retry state. Use `atlas replay --json` to run deterministic duplicate and receipt proof without touching real state.

## What this proves

The default local journey needs no Atlas account, provider credential, cloud service, or paid model. The fixture model and provider are explicitly simulated, while policy, approval, idempotency, action, delivery, traces, and receipts use the real local Atlas contracts.

It does not prove hosted staging, production, public package availability, or live messaging-provider behavior.
