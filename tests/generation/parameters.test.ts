import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../../packages/design-random/src/index';
import { resolveParameters } from '../../packages/design-generation/src/parameters';
import { createModuleSeeds, moduleRandom } from '../../packages/design-generation/src/seeds';
import { card } from './fixtures';

describe('Parameter sampling and module seeds', () => {
  const sampled = card('sampled', 'layout', { parameters: {
    count: { type: 'integer', min: 3, max: 5, default: 4 },
    ratio: { type: 'float', min: 0.8, max: 1.2, default: 1 },
    flag: { type: 'boolean', default: false, probability: 0.25 },
    choice: { type: 'enum', values: ['never', 'yes', 'maybe'], default: 'yes', distribution: 'weighted', weights: [0, 3, 1] },
  } });
  it('repeats parameters and varies across fixed seeds within valid ranges', () => {
    expect(resolveParameters(sampled, {}, new SeededRandom(5))).toEqual(resolveParameters(sampled, {}, new SeededRandom(5)));
    const seen = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      const result = resolveParameters(sampled, {}, new SeededRandom(seed));
      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect([3, 4, 5]).toContain(result.parameters.count);
        expect(result.parameters.ratio).toBeGreaterThanOrEqual(0.8);
        expect(result.parameters.ratio).toBeLessThanOrEqual(1.2);
        expect(result.parameters.choice).not.toBe('never');
        seen.add(JSON.stringify(result.parameters));
      }
    }
    expect(seen.size).toBeGreaterThan(1);
  });
  it('fixes concrete overrides and keeps other parameter streams unchanged', () => {
    const before = resolveParameters(sampled, {}, new SeededRandom(1));
    const after = resolveParameters(sampled, { count: 5 }, new SeededRandom(1));
    expect(after.status).toBe('success');
    if (before.status === 'success' && after.status === 'success') {
      expect(after.parameters).toEqual({ ...before.parameters, count: 5 });
    }
    expect(resolveParameters(sampled, { count: 9 }, new SeededRandom(1)).status).toBe('error');
    expect(resolveParameters(sampled, { unknown: 5 }, new SeededRandom(1)).status).toBe('error');
  });
  it('honors boolean probability endpoints and uniform enum types', () => {
    const data = card('boolean-enum', 'layout', { parameters: {
      yes: { type: 'boolean', default: false, probability: 1 },
      no: { type: 'boolean', default: true, probability: 0 },
      value: { type: 'enum', values: [true], default: true },
    } });
    expect(resolveParameters(data, {}, new SeededRandom(0))).toEqual({ status: 'success', parameters: { yes: true, no: false, value: true } });
  });
  it('isolates modules, selection and parameters; stored seeds replay module streams', () => {
    const seeds = createModuleSeeds(839217);
    expect(createModuleSeeds(839217)).toEqual(seeds);
    const typography = moduleRandom(seeds, 'typography').fork('params');
    for (let i = 0; i < 100; i++) typography.nextFloat();
    expect(moduleRandom(seeds, 'palette').fork('select').nextFloat()).toBe(moduleRandom(createModuleSeeds(839217), 'palette').fork('select').nextFloat());
    expect(moduleRandom(seeds, 'layout').nextFloat()).toBe(new SeededRandom(seeds.layout).nextFloat());
    expect(moduleRandom(seeds, 'layout').fork('select').nextFloat()).not.toBe(moduleRandom(seeds, 'layout').fork('params').nextFloat());
  });
});
