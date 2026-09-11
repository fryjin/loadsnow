import { describe, expect, it } from 'vitest';
import { runLab } from '../apps/engine-lab/src/run-lab';

describe('Engine Lab integration', () => {
  it('repeats the same seeded output across fresh runs', () => {
    const context = { hasImage: false, contentDensity: 'high' } as const;
    const result = runLab('839217', context);
    expect(result).toEqual(runLab('839217', context));
    expect(result.deterministic).toBe(true);
    expect(result.random.floats).toHaveLength(8);
    expect(result.random).not.toEqual(runLab('different', context).random);
    expect(result.counts).toMatchObject({ total: 7, layout: 3, typography: 2, palette: 2 });
    expect(result.diagnostics).toEqual([]);
  });
  it('updates card outcomes from content controls without affecting seeded random output', () => {
    const withoutImage = runLab('839217', { hasImage: false, contentDensity: 'high' });
    const withImage = runLab('839217', { hasImage: true, contentDensity: 'low' });
    expect(withoutImage.rules.find(card => card.id === 'L003')?.disabled).toBe(true);
    expect(withImage.rules.find(card => card.id === 'L003')?.disabled).toBe(false);
    expect(withoutImage.rules.find(card => card.id === 'L002')?.weight).toBe(0.3);
    expect(withImage.rules.find(card => card.id === 'L002')?.weight).toBe(1);
    expect(withoutImage.random).toEqual(withImage.random);
  });
  it('surfaces invalid data diagnostics instead of including the bad card', () => {
    const result = runLab('839217', { hasImage: true, contentDensity: 'low' }, [{ id: 'BROKEN' }]);
    expect(result.counts.total).toBe(0);
    expect(result.diagnostics[0]?.code).toBe('INVALID_CARD_SCHEMA');
    expect(result.rules).toEqual([]);
  });
});
