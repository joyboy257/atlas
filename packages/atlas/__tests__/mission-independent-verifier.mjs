import { readFile } from 'node:fs/promises';
import path from 'node:path';

const [root, expectedState] = process.argv.slice(2);
if (!root || !expectedState) {
  process.stderr.write('usage: verifier <root> <expected-state>\n');
  process.exit(2);
}

const missionStore = JSON.parse(
  await readFile(path.join(root, '.atlas', 'mission-store.json'), 'utf8'),
);
const runtime = JSON.parse(
  await readFile(path.join(root, '.atlas', 'runtime-state.json'), 'utf8'),
);
const missions = missionStore.missions.filter(
  (mission) => mission.spec.state === expectedState,
);
if (missionStore.missions.length !== 1 || missions.length !== 1) {
  throw new Error(`expected one Mission in ${expectedState}, found ${missionStore.missions.length}`);
}
if (runtime.messages.length !== 1 || runtime.traces.length !== 1) {
  throw new Error('expected exactly one durable runtime message and trace');
}
if (expectedState === 'COMPLETED' && runtime.outbox[0]?.state !== 'delivered') {
  throw new Error('completed Mission must have a delivered outbox record');
}
if (expectedState === 'CANCELLED' && runtime.actions.length !== 0) {
  throw new Error('cancelled Mission must not have a committed runtime Action');
}
process.stdout.write(JSON.stringify({
  missionId: missions[0].metadata.missionId,
  state: missions[0].spec.state,
  lifecycleEvents: missionStore.lifecycleEvents.filter(
    (event) => event.spec.missionId === missions[0].metadata.missionId,
  ).length,
  runtimeMessages: runtime.messages.length,
}) + '\n');
