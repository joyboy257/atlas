import { describe, expect, it, vi } from 'vitest';
import { DeviceFlowClient } from '../src/auth/device-flow.js';

describe('DeviceFlowClient', () => {
  it('requests a device code then polls without exposing the token in request URLs', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ device_code: 'device-code-at-least-sixteen', user_code: 'CODE-1234', verification_url: 'https://app.usemirai.app/device', interval: 1, expires_at: Date.now() + 10_000 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'AUTHORIZATION_PENDING', retry_after_seconds: 1 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'secret-token-at-least-sixteen', token_type: 'Bearer', expires_in: 3600, scope: 'atlas.context.read' }), { status: 200 }));
    const client = new DeviceFlowClient({ apiBase: 'https://api.usemirai.app/', fetchImpl });
    const code = await client.requestCode('client_1', ['atlas.context.read']);
    const credential = await client.poll(code, 'client_1', { wait: async () => undefined });

    expect(credential.accessToken).toBe('secret-token-at-least-sixteen');
    expect(credential.apiBase).toBe('https://api.usemirai.app');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    for (const [url] of fetchImpl.mock.calls) expect(String(url)).not.toContain('secret-token-at-least-sixteen');
  });

  it('fails terminal device errors without retrying', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'DEVICE_CODE_EXPIRED' }), { status: 200 }));
    const client = new DeviceFlowClient({ apiBase: 'https://api.usemirai.app', fetchImpl });
    await expect(client.poll({ device_code: 'device-code-at-least-sixteen', user_code: 'CODE', verification_url: 'https://example.com', interval: 1, expires_at: Date.now() + 1000 }, 'client', { wait: async () => undefined })).rejects.toMatchObject({ code: 'AUTHENTICATION_FAILED' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each(['javascript:alert(1)', 'http://evil.example/device', 'https://user:pass@example.com/device'])('rejects unsafe verification URL %s', async (verification_url) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ device_code: 'device-code-at-least-sixteen', user_code: 'CODE-1234', verification_url, interval: 5, expires_at: Date.now() + 10_000 }), { status: 200 }));
    const client = new DeviceFlowClient({ apiBase: 'https://api.usemirai.app', fetchImpl });
    await expect(client.requestCode('client', [])).rejects.toMatchObject({ code: 'REMOTE_ERROR' });
  });

  it('rejects malformed token responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: 'short', token_type: 'bearer', expires_in: -1, scope: 7 }), { status: 200 }));
    const client = new DeviceFlowClient({ apiBase: 'https://api.usemirai.app', fetchImpl });
    await expect(client.poll({ device_code: 'device-code-at-least-sixteen', user_code: 'CODE', verification_url: 'https://example.com', interval: 1, expires_at: Date.now() + 1000 }, 'client', { wait: async () => undefined })).rejects.toMatchObject({ code: 'REMOTE_ERROR' });
  });
});
