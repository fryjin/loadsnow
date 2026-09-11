import { describe, expect, it } from 'vitest';
import { DEFAULT_LAB_INPUTS, nextSeed, runLab } from '../apps/engine-lab/src/run-lab';

describe('DNA Lab integration', () => {
  it('loads 27 cards and repeats complete DNA across fresh runs', () => {
    const output = runLab(DEFAULT_LAB_INPUTS);
    expect(output.cards).toHaveLength(27);
    expect(output).toEqual(runLab(DEFAULT_LAB_INPUTS));
    expect(output.result.status).toBe('success');
    if (output.result.status !== 'success') throw new Error('Expected DNA');
    expect(output.result.dna.cards.layout.version).toBe('0.1.0');
    expect(Array.isArray(output.result.dna.cards.details)).toBe(true);
    expect(output.result.debug?.pools).toHaveLength(7);
    const next = runLab({ ...DEFAULT_LAB_INPUTS, seed: nextSeed(DEFAULT_LAB_INPUTS.seed) });
    expect(next.result.status).toBe('success');
    expect(next.result).not.toEqual(output.result);
  });
  it('honors force controls and reports an ineligible split without an image', () => {
    const inputs = { ...DEFAULT_LAB_INPUTS, forceLayout: 'L003', forceTypography: 'T001', forcePalette: 'P003' };
    const output = runLab(inputs);
    expect(output.result.status).toBe('success');
    if (output.result.status !== 'success') throw new Error('Expected DNA');
    expect(output.result.dna.cards).toMatchObject({ layout: { id: 'L003' }, typography: { id: 'T001' }, palette: { id: 'P003' } });
    expect(runLab({ ...inputs, hasImage: false }).result).toMatchObject({ status: 'error', error: { code: 'FORCED_CARD_INELIGIBLE' } });
  });
  it('computes profiles from density presets, CJK content and image controls', () => {
    for (const contentDensity of ['low', 'medium', 'high'] as const) {
      expect(runLab({ ...DEFAULT_LAB_INPUTS, contentDensity }).profile?.contentDensity).toBe(contentDensity);
    }
    expect(runLab({ ...DEFAULT_LAB_INPUTS, caseId: 'case-cjk' }).profile?.language).toBe('ja');
    const output = runLab({ ...DEFAULT_LAB_INPUTS, hasImage: false });
    expect(output.profile?.hasImage).toBe(false);
    expect(output.result).toMatchObject({ status: 'success', dna: { cards: { image: null } } });
  });
  it('surfaces invalid library and missing content diagnostics', () => {
    const output = runLab(DEFAULT_LAB_INPUTS, { packs: [{ id: 'bad' }] });
    expect(output.cards).toEqual([]);
    expect(output.result.diagnostics[0]?.code).toBe('INVALID_CARD_SCHEMA');
    expect(runLab({ ...DEFAULT_LAB_INPUTS, caseId: 'missing' }).result).toMatchObject({ status: 'error', error: { code: 'INVALID_REQUEST' } });
  });
  it('advances seeds without a random or clock source', () => {
    expect(nextSeed('839217')).toBe('839218');
    expect(nextSeed('custom')).toBe('custom:next');
  });
});
