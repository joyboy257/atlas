import { spawn } from 'node:child_process';
import { normalizeVerificationUrl } from '../urls.js';

export async function openBrowser(url: string): Promise<boolean> {
  const safeUrl = normalizeVerificationUrl(url);
  const command = process.platform === 'darwin' ? '/usr/bin/open' : process.platform === 'win32' ? 'rundll32.exe' : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', safeUrl] : [safeUrl];
  return new Promise((resolve) => {
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('spawn', () => { child.unref(); resolve(true); });
  });
}
