import { describe, expect, it } from 'vitest';
import { isCardParameter, isParameterValue, loadCards, loadLibrary } from '../../packages/card-library/src/index';
import { card, library } from './fixtures';

describe('M1 parameter and library schemas', () => {
  it.each([
    { type: 'integer', min: 3, max: 5, default: 4, distribution: 'uniform' },
    { type: 'float', min: 0.8, max: 1.2, default: 1, distribution: 'uniform' },
    { type: 'boolean', default: false, probability: 0.25 },
    { type: 'enum', values: ['a', 2, true], default: 'a' },
    { type: 'enum', values: [0.4, 0.5], default: 0.5, distribution: 'weighted', weights: [0, 1] },
  ])('accepts sampled parameter %j', parameter => {
    expect(isCardParameter(parameter)).toBe(true);
    expect(loadCards([{ ...card('new', 'layout'), parameters: { x: parameter } }]).cards).toHaveLength(1);
  });
  it.each([
    { type: 'number', default: 4 }, { type: 'string', default: 'old' },
    { type: 'integer', min: 1.5, max: 5, default: 4 },
    { type: 'integer', min: 0, max: 2 ** 32, default: 1 },
    { type: 'float', min: 2, max: 1, default: 1 },
    { type: 'float', min: 0, max: Infinity, default: 1 },
    { type: 'float', min: 0, max: 2, default: 3 },
    { type: 'float', min: 0, max: 2, default: 1, distribution: 'normal' },
    { type: 'boolean', default: true, probability: -1 },
    { type: 'boolean', default: true, probability: 1.1 },
    { type: 'boolean', default: true, probability: NaN },
    { type: 'enum', values: [], default: 'a' },
    { type: 'enum', values: ['a'], default: 'b' },
    { type: 'enum', values: [null], default: null },
    { type: 'enum', values: ['a'], default: 'a', distribution: 'weighted', weights: [] },
    { type: 'enum', values: ['a'], default: 'a', distribution: 'weighted', weights: [-1] },
    { type: 'enum', values: ['a'], default: 'a', distribution: 'weighted', weights: [0] },
    { type: 'enum', values: ['a'], default: 'a', distribution: 'weighted', weights: [Infinity] },
    { type: 'enum', values: ['a'], default: 'a', weights: [1] },
  ])('rejects invalid parameter %j at the Card Loader', parameter => {
    expect(isCardParameter(parameter)).toBe(false);
    const result = loadCards([{ ...card('bad', 'layout'), parameters: { x: parameter } }]);
    expect(result.cards).toHaveLength(0);
    expect(result.diagnostics[0]?.code).toBe('INVALID_CARD_SCHEMA');
  });
  it('validates concrete override values against the parameter definition', () => {
    expect(isParameterValue({ type: 'integer', min: 1, max: 3, default: 2 }, 2)).toBe(true);
    expect(isParameterValue({ type: 'integer', min: 1, max: 3, default: 2 }, 2.5)).toBe(false);
    expect(isParameterValue({ type: 'enum', values: ['a'], default: 'a' }, 'b')).toBe(false);
    expect(isParameterValue({ type: 'boolean', default: false }, false)).toBe(true);
  });
  it('keeps active/draft/deprecated cards in the library', () => {
    const result = loadLibrary(library(['active', 'draft', 'deprecated'].map(status =>
      card(status, 'layout', { status: status as 'active' | 'draft' | 'deprecated' }))));
    expect(result.diagnostics).toEqual([]);
    expect(result.library?.packs[0]?.cards).toHaveLength(3);
  });
  it('rejects malformed compatibility, duplicate packs and ambiguous card ids', () => {
    const base = library();
    for (const multiplier of [-1, Infinity, NaN]) {
      const result = loadLibrary({ ...base, compatibility: { pairs: [{ a: 'a', b: 'b', multiplier }], tags: [] } });
      expect(result.library).toBeNull();
      expect(result.diagnostics.length).toBeGreaterThan(0);
    }
    expect(loadLibrary({ ...base, packs: [base.packs[0], base.packs[0]] }).library).toBeNull();
    expect(loadLibrary({ ...base, packs: [base.packs[0], { ...base.packs[0], id: 'other' }] }).library).toBeNull();
  });
  it('requires tags and only permits noOp on detail cards', () => {
    expect(loadCards([{ ...card('bad', 'layout'), tags: 1 }]).cards).toHaveLength(0);
    expect(loadCards([card('bad', 'layout', { noOp: true })]).cards).toHaveLength(0);
    expect(loadCards([card('empty-detail', 'detail', { noOp: true })]).cards).toHaveLength(1);
  });
});
