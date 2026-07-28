import { describe, expect, it } from 'vitest';
import { certifyAtlasP2Local } from '../src/p2-conformance.js';

describe('Atlas P2 integrated local certification', () => {
  it('certifies runtime, inference, and all declared channel lanes without inflating remote claims', async () => {
    const result = await certifyAtlasP2Local();

    expect(result.verdict).toBe('PASS');
    expect(result.runtime).toMatchObject({ passed: 4, total: 4, verdict: 'PASS' });
    expect(result.inference).toMatchObject({ passed: 4, total: 4, verdict: 'PASS' });
    expect(result.channels.summary).toEqual({
      total: 16,
      passed: 16,
      failed: 0,
      localConformance: 16,
      providerConnected: 0,
      liveProviderProven: 0,
    });
    expect(result.claims).toEqual({
      localProtocolProven: true,
      runtimeAdaptersLocalProven: true,
      inferenceModesLocalProven: true,
      channelsLocalConformance: 16,
      providerConnectedChannels: 0,
      liveProviderProvenChannels: 0,
      hostedStagingProven: false,
      productionProven: false,
    });
  });
});
