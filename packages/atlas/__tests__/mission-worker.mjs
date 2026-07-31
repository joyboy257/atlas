import { createMissionLeaseStore } from '../dist/mission-leases.js';
import { AtlasLocalMissionCoordinator } from '../dist/mission-coordinator.js';

const [mode, root, ownerId, now, ttlText] = process.argv.slice(2);
const ttlMs = Number(ttlText);
const message = {
  message_id: 'msg-worker-matrix-001',
  conversation_id: 'conv-worker-matrix-001',
  customer_id: 'customer-worker-matrix-001',
  channel_id: 'local-web-chat',
  sequence: 1,
  occurred_at: '2026-07-24T08:00:00.000Z',
  text: 'Can I move booking BK-100 to Friday?',
  consent: true,
  within_messaging_window: true,
};

if (!mode || !root || !ownerId || !now || !Number.isInteger(ttlMs)) {
  process.stderr.write('invalid worker arguments\n');
  process.exit(2);
}

const leaseScope = {
  tenantId: 'tenant-a',
  organisationId: 'organisation-a',
  projectId: 'project-a',
  environmentId: 'local',
};
const coordinatorScope = {
  tenantId: 'tenant-local',
  organisationId: 'organisation-local',
  projectId: 'project-local',
  environmentId: 'local',
};

if (mode === 'hold' || mode === 'once' || mode === 'lease-hold' || mode === 'lease-once') {
  const store = createMissionLeaseStore(root);
  await store.migrate();
  const lease = await store.acquire({
    scope: leaseScope,
    missionId: 'mission-worker-1',
    ownerId,
    now,
    ttlMs,
  });
  process.stdout.write(`${JSON.stringify({ mode, ownerId, leaseId: lease.leaseId, status: lease.status })}\n`);
  if (mode === 'hold' || mode === 'lease-hold') setInterval(() => undefined, 1_000);
  else process.exit(0);
} else {

const coordinator = await AtlasLocalMissionCoordinator.open({
  root,
  scope: coordinatorScope,
  ownerId,
  clock: () => now,
  leaseTtlMs: ttlMs,
});

if (mode === 'receive') {
  const result = await coordinator.receive(message);
  process.stdout.write(`${JSON.stringify({ mode, missionId: result.missionId, status: result.status, state: result.mission.spec.state })}\n`);
  setInterval(() => undefined, 1_000);
} else if (mode === 'approve') {
  const approval = Object.values((await coordinator.snapshot()).runtime.approvals)
    .find((candidate) => candidate.status === 'pending');
  if (!approval) throw new Error('pending approval not found');
  const result = await coordinator.approve(approval.id, ownerId, 'worker checkpoint approval');
  process.stdout.write(`${JSON.stringify({ mode, missionId: result.missionId, status: result.status, state: result.mission.spec.state })}\n`);
  setInterval(() => undefined, 1_000);
} else if (mode === 'pause' || mode === 'resume' || mode === 'cancel') {
  const mission = (await coordinator.snapshot()).missionState.missions[0];
  if (!mission) throw new Error('Mission not found');
  const result = await coordinator.control(mission.metadata.missionId, mode, ownerId, `worker checkpoint ${mode}`);
  process.stdout.write(`${JSON.stringify({ mode, missionId: result.missionId, state: result.mission.spec.state })}\n`);
  setInterval(() => undefined, 1_000);
} else if (mode === 'deliver') {
  const outbox = (await coordinator.snapshot()).runtime.outbox
    .find((candidate) => candidate.state === 'queued');
  if (!outbox) throw new Error('queued outbox not found');
  const result = await coordinator.deliver(outbox.id, {
    outcome: 'delivered',
    provider_message_id: 'worker-provider-message-001',
  });
  process.stdout.write(`${JSON.stringify({ mode, missionId: result.missionId, status: result.status, state: result.mission.spec.state })}\n`);
  setInterval(() => undefined, 1_000);
} else {
  process.stderr.write(`unknown worker mode: ${mode}\n`);
  process.exit(2);
}
}
