import { startAtlasDevServer } from './dev-server.js';

const channelMode = process.env.ATLAS_CHANNEL_MODE ?? 'simulator';
const modelMode = process.env.ATLAS_MODEL_MODE ?? 'local-fixture';

if (channelMode !== 'simulator') {
  throw new Error(`Atlas sandbox requires ATLAS_CHANNEL_MODE=simulator; received ${channelMode}`);
}
if (modelMode !== 'local-fixture') {
  throw new Error(`Atlas sandbox requires ATLAS_MODEL_MODE=local-fixture; received ${modelMode}`);
}

const port = parsePort(process.env.PORT ?? '4001');
const host = process.env.ATLAS_HOST ?? '0.0.0.0';
const projectRoot = process.env.ATLAS_PROJECT_ROOT ?? '/app/project';
const server = await startAtlasDevServer({
  port,
  host,
  deployment: 'sandbox',
  projectRoot,
});

process.stdout.write(JSON.stringify({
  service: 'atlas-sandbox',
  url: server.url,
  health_url: `${server.url}/health`,
  workbench_url: `${server.url}/`,
  channel_mode: channelMode,
  model_mode: modelMode,
  project_hash: server.identity?.project_hash ?? null,
}) + '\n');

await new Promise<void>((resolve) => {
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    void server.close().finally(resolve);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
});

function parsePort(value: string): number {
  if (!/^[0-9]+$/.test(value)) throw new Error(`PORT must be an integer; received ${value}`);
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error(`PORT must be between 1 and 65535; received ${value}`);
  return port;
}
