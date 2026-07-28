import { describe, expect, it } from 'vitest';
import {
  ATLAS_V1_CHANNEL_PROFILES,
  atlasChannelProfile,
  createAtlasV1ChannelAdapters,
} from '../src/channel-adapters.js';
import { runAtlasChannelConformance, runAtlasChannelProgramme } from '../src/channel-conformance.js';

describe('Atlas simultaneous channel programme', () => {
  it('declares the exact bounded sixteen-channel catalog with truthful readiness', () => {
    const ids = ATLAS_V1_CHANNEL_PROFILES.map((profile) => profile.metadata.id);
    expect(ids).toEqual([
      'CH-WEB', 'CH-EMAIL', 'CH-SMS', 'CH-VOICE', 'CH-X', 'CH-WA', 'CH-MSG', 'CH-IG',
      'CH-TT', 'CH-TG', 'CH-SLACK', 'CH-TEAMS', 'CH-GCHAT', 'CH-DISCORD', 'CH-GH', 'CH-LINEAR',
    ]);
    expect(new Set(ids).size).toBe(16);
    expect(ATLAS_V1_CHANNEL_PROFILES.every((profile) => profile.metadata.readiness === 'LOCAL_CONFORMANCE')).toBe(true);
    expect(ATLAS_V1_CHANNEL_PROFILES.every((profile) => profile.metadata.liveProviderProven === false)).toBe(true);
    expect(atlasChannelProfile('CH-TT').metadata.providerBlockedReason).toContain('provider authorisation');
  });

  it('runs the same adversarial conformance suite across all sixteen adapters', async () => {
    const programme = await runAtlasChannelProgramme(
      createAtlasV1ChannelAdapters({ clock: () => '2026-07-26T02:00:00.000Z' }),
    );

    expect(programme.verdict).toBe('PASS');
    expect(programme.summary).toEqual({
      total: 16,
      passed: 16,
      failed: 0,
      localConformance: 16,
      providerConnected: 0,
      liveProviderProven: 0,
    });
    expect(programme.channels.every((channel) => channel.passed === channel.total)).toBe(true);
    expect(programme.channels.every((channel) => channel.total >= 18)).toBe(true);
  });

  it('keeps capability differences explicit instead of flattening providers', () => {
    expect(atlasChannelProfile('CH-SMS').capabilities).toMatchObject({
      media: [],
      readReceipts: false,
      providerLimits: { payloadLimits: { textBytes: 1600, attachments: 0 } },
    });
    expect(atlasChannelProfile('CH-WA').capabilities).toMatchObject({
      readReceipts: true,
      interactive: ['button', 'list'],
      proactive: { supported: true, templatePolicy: 'approved-template', windowPolicy: '24-hour-window' },
    });
    expect(atlasChannelProfile('CH-GH').capabilities.surfaces).toContain('work-object');
    expect(atlasChannelProfile('CH-X').capabilities.proactive.supported).toBe(false);
  });

  it('certifies a single channel independently without promoting remote claims', async () => {
    const result = await runAtlasChannelConformance(createAtlasV1ChannelAdapters()[0]!);
    expect(result).toMatchObject({
      channelId: 'CH-WEB',
      verdict: 'PASS',
      readiness: 'LOCAL_CONFORMANCE',
      liveProviderProven: false,
      claims: {
        localConformance: true,
        sandboxProven: false,
        providerConnected: false,
        liveProviderProven: false,
      },
    });
  });
});
