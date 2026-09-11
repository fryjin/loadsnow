import { describe, expect, it } from 'vitest';
import { loadCards } from '../packages/card-library/src/index';
import { evaluateRules } from '../packages/design-rules/src/index';
import layoutLeft from '../data/cards/L001.json';
import layoutCenter from '../data/cards/L002.json';
import layoutSplit from '../data/cards/L003.json';
import neutral from '../data/cards/T001.json';
import impact from '../data/cards/T003.json';
import mono from '../data/cards/P001.json';
import cream from '../data/cards/P003.json';
import withoutImage from '../data/test-content/without-image.json';
import withImage from '../data/test-content/with-image.json';

const data = [layoutLeft, layoutCenter, layoutSplit, neutral, impact, mono, cream];

describe('card loading and business acceptance', () => {
  it('loads the seven valid data cards with a 3/2/2 distribution', () => {
    const result = loadCards(data);
    expect(result.diagnostics).toEqual([]);
    expect(result.cards).toHaveLength(7);
    for (const [type, count] of [['layout', 3], ['typography', 2], ['palette', 2]] as const) {
      expect(result.cards.filter(card => card.type === type)).toHaveLength(count);
    }
  });
  it.each(['id', 'type', 'name', 'version', 'status', 'parameters', 'rules'])('rejects a missing required %s', field => {
    const invalid: Record<string, unknown> = { ...layoutLeft };
    delete invalid[field];
    const result = loadCards([invalid]);
    expect(result.cards).toEqual([]);
    expect(result.diagnostics).toEqual([expect.objectContaining({ code: 'INVALID_CARD_SCHEMA', level: 'error', path: '[0]' })]);
  });
  it.each([
    null, [], 'bad', { ...layoutLeft, type: 'renderer' }, { ...layoutLeft, name: '' },
    { ...layoutLeft, version: 1 }, { ...layoutLeft, status: 'unknown' },
    { ...layoutLeft, weight: -1 }, { ...layoutLeft, weight: Infinity },
    { ...layoutLeft, parameters: { x: { type: 'number', default: 'wrong' } } },
    { ...layoutLeft, parameters: { x: { type: 'number', default: 5, min: 8 } } },
    { ...layoutLeft, parameters: { x: { type: 'number', default: 5, max: 2 } } },
    { ...layoutLeft, parameters: { x: { type: 'boolean', default: 'true' } } },
    { ...layoutLeft, rules: [{ id: 'bad', when: { field: 'x', operator: 'eval', value: true }, effect: { type: 'disable' } }] },
    { ...layoutLeft, rules: [{ id: 'bad', when: { field: 'x', operator: 'gt', value: '2' }, effect: { type: 'disable' } }] },
    { ...layoutLeft, rules: [{ id: 'bad', when: { field: 'x', operator: 'in', value: 'a' }, effect: { type: 'disable' } }] },
    { ...layoutCenter, rules: [{ ...layoutCenter.rules[0], effect: { type: 'weightMultiply', factor: -0.3 } }] },
    { ...layoutSplit, eligibility: [{ ...layoutSplit.eligibility[0], effect: { type: 'execute' } }] },
    { ...layoutLeft, variants: [{ id: 'bad', name: 'Bad', parameters: { x: { nested: true } } }] },
  ])('rejects malformed card %# with diagnostics', invalid => {
    const result = loadCards([invalid]);
    expect(result.cards).toEqual([]);
    expect(result.diagnostics[0]?.code).toBe('INVALID_CARD_SCHEMA');
  });
  it('rejects malformed roots and duplicate card ids without losing valid cards', () => {
    expect(loadCards({ cards: data }).diagnostics[0]?.code).toBe('INVALID_CARD_SCHEMA');
    const result = loadCards([layoutLeft, { ...layoutCenter, rules: null }, layoutLeft, layoutSplit]);
    expect(result.cards.map(card => card.id)).toEqual(['L001', 'L003']);
    expect(result.diagnostics).toHaveLength(2);
  });
  it('disables L003 without an image and enables it with an image', () => {
    const card = loadCards([layoutSplit]).cards[0]!;
    for (let i = 0; i < 100; i++) {
      expect(evaluateRules(card.eligibility ?? [], withoutImage).disabled).toBe(true);
    }
    expect(evaluateRules(card.eligibility ?? [], withImage).disabled).toBe(false);
  });
  it('changes eligibility using card data alone, including a different card id', () => {
    const edited = {
      ...layoutSplit, id: 'CUSTOM_SPLIT',
      eligibility: [{ ...layoutSplit.eligibility[0], when: { field: 'hasImage', operator: 'eq', value: true } }],
    };
    const card = loadCards([edited]).cards[0]!;
    expect(evaluateRules(card.eligibility ?? [], withoutImage).disabled).toBe(false);
    expect(evaluateRules(card.eligibility ?? [], withImage).disabled).toBe(true);
  });
  it('multiplies L002 weight by 0.3 only for high density', () => {
    const card = loadCards([layoutCenter]).cards[0]!;
    for (const density of ['low', 'medium', 'high']) {
      expect(evaluateRules(card.rules, { contentDensity: density }).weight).toBe(density === 'high' ? 0.3 : 1);
    }
  });
  it('accepts and evaluates parameter overrides loaded from JSON', () => {
    const card = loadCards([{
      ...layoutLeft,
      rules: [{ id: 'override', when: { field: 'x', operator: 'eq', value: true }, effect: { type: 'parameterOverride', parameters: { alignment: 'right' } } }],
    }]).cards[0]!;
    expect(evaluateRules(card.rules, { x: true }).parameters).toEqual({ alignment: 'right' });
  });
});
