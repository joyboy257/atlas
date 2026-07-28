import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('canonical package contract', () => {
  it('owns only the atlas binary and is provenance-ready without claiming publication', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(pkg.name).toBe('@atlas-runner/atlas');
    expect(pkg.bin).toEqual({ atlas: './bin/atlas.js' });
    expect(pkg.private).not.toBe(true);
    expect(pkg.publishConfig).toEqual({ access: 'public', provenance: true });
    expect(readFileSync(new URL('../README.md', import.meta.url), 'utf8')).toContain('BLOCKED — HUMAN AUTHORITY REQUIRED');
  });
});
