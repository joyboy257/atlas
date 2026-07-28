export type CliResult<T = unknown> = Readonly<{
  ok: true;
  command: string;
  data: T;
  next_action?: Readonly<{ code: string; label: string }>;
}>;

export type CliFailure = Readonly<{
  ok: false;
  error: Readonly<{ code: string; message: string; retryable: boolean }>;
  next_action?: Readonly<{ code: string; label: string }>;
}>;

export interface OutputWriter {
  stdout(value: string): void;
  stderr(value: string): void;
}

export const processOutput: OutputWriter = {
  stdout: (value) => process.stdout.write(`${value}\n`),
  stderr: (value) => process.stderr.write(`${value}\n`),
};

export function writeResult<T>(writer: OutputWriter, result: CliResult<T>, json: boolean): void {
  if (json) {
    writer.stdout(JSON.stringify(result));
    return;
  }
  writer.stdout(`Atlas: ${result.command} complete`);
  if (result.data && typeof result.data === 'object') {
    for (const [key, value] of Object.entries(result.data)) writer.stdout(`  ${key}: ${formatValue(value)}`);
  }
  if (result.next_action) writer.stdout(`Next: ${result.next_action.label}`);
}

export function writeFailure(writer: OutputWriter, failure: CliFailure, json: boolean): void {
  const rendered = json ? JSON.stringify(failure) : `Atlas ${failure.error.code}: ${failure.error.message}${failure.next_action ? `\nNext: ${failure.next_action.label}` : ''}`;
  writer.stderr(rendered);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
