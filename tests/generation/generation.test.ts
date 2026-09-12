import { describe, expect, it } from 'vitest';
import type { DesignDNA, GenerationRequest, GenerationResult } from '../../packages/design-domain/src/index';
import { createGenerator, generate } from '../../packages/design-generation/src/index';
import { card, library, request } from './fixtures';

function dna(result: GenerationResult): DesignDNA {
  expect(result.status).toBe('success');
  if (result.status !== 'success') throw new Error(result.error.code + ': ' + result.error.message);
  return result.dna;
}
const split = card('split', 'layout', { eligibility: [
  { id: 'requires-image', when: { field: 'hasImage', operator: 'eq', value: false }, effect: { type: 'disable' } },
] });
const data = library([...library().packs[0]!.cards, split, card('layout-b', 'layout'),
  card('type-b', 'typography'), card('palette-b', 'palette')]);

describe('M1 complete conditional generation', () => {
  it('returns a complete versioned DNA and a discriminated success result', () => {
    const result = generate(request(), data);
    const output = dna(result);
    for (const module of ['layout', 'composition', 'typography', 'palette'] as const) {
      expect(output.cards[module]).toEqual({ id: expect.any(String), version: '0.1.0' });
      expect(output.parameters[module]).toBeTypeOf('object');
    }
    expect(Array.isArray(output.cards.details)).toBe(true);
    expect(output.cards.details.length).toBe(output.parameters.details.length);
    expect(output.cards.image).not.toBeNull();
    expect(output.engineVersion).toBe('0.1.0');
    expect(output.cardPackVersion).toBe('0.1.0');
    expect(output.cardPacks).toEqual([{ id: 'test-pack', version: '0.1.0' }]);
    expect(Object.keys(output.seeds)).toHaveLength(8);
  });
  it('returns identical complete DNA/results for 100 fresh runs and a bound generate(request)', () => {
    const req = request(); const expected = generate(req, data); dna(expected);
    const bound = createGenerator(data);
    for (let i = 0; i < 100; i++) expect(bound(req)).toEqual(expected);
  });
  it('changes downstream typography weights after each selected layout', () => {
    const lib = { ...data, compatibility: { pairs: [{ a: 'layout-a', b: 'type-a', multiplier: 4 }], tags: [] } };
    const withA = generate(request({ forcedCards: { layout: 'layout-a' } }), lib);
    const withB = generate(request({ forcedCards: { layout: 'layout-b' } }), lib);
    if (withA.status !== 'success' || withB.status !== 'success') throw new Error('Both generations must succeed');
    const weight = (result: typeof withA) => result.debug?.pools.find(pool => pool.type === 'typography')?.eligible.find(entry => entry.card.id === 'type-a')?.finalWeight;
    expect(weight(withA)).toBe(4);
    expect(weight(withB)).toBe(1);
    expect(withA.debug?.pools.map(pool => pool.type)).toEqual(['layout', 'composition', 'typography', 'image', 'palette', 'detail', 'wild']);
  });
  it('never selects an image or split layout over 100 no-image seeds', () => {
    const content = { id: 'no-image', elements: [{ id: 'title', type: 'text', role: 'TITLE', text: 'NEW FORMS' }] } as const;
    for (let seed = 0; seed < 100; seed++) {
      const output = dna(generate(request({ seed, content }), data));
      expect(output.cards.layout.id).not.toBe('split');
      expect(output.cards.image).toBeNull();
      expect(output.parameters.image).toBeNull();
    }
  });
  it('supports valid force, rejects absent/wrong-type/version/ineligible forces without substitution', () => {
    expect(dna(generate(request({ forcedCards: { layout: 'split' } }), data)).cards.layout.id).toBe('split');
    const cases: [GenerationRequest, string][] = [
      [request({ forcedCards: { layout: 'missing' } }), 'FORCED_CARD_NOT_FOUND'],
      [request({ forcedCards: { layout: { id: 'layout-a', version: '9.0.0' } } }), 'FORCED_CARD_NOT_FOUND'],
      [request({ forcedCards: { layout: 'type-a' } }), 'FORCED_CARD_INELIGIBLE'],
      [request({ forcedCards: { layout: 'split' }, content: { id: 'empty', elements: [] } }), 'FORCED_CARD_INELIGIBLE'],
      [request({ forcedCards: { image: 'image-a' }, content: { id: 'empty', elements: [] } }), 'FORCED_CARD_INELIGIBLE'],
    ];
    for (const [req, code] of cases) expect(generate(req, data)).toMatchObject({ status: 'error', error: { code } });
  });
  it('honors versioned locks and explicit force priority, with a diagnostic', () => {
    const currentDNA = dna(generate(request({ forcedCards: { layout: 'layout-a' } }), data));
    expect(dna(generate(request({ seed: 42, currentDNA, locks: { layout: true } }), data)).cards.layout).toEqual(currentDNA.cards.layout);
    const overridden = generate(request({ seed: 42, currentDNA, locks: { layout: true }, forcedCards: { layout: 'split' } }), data);
    expect(dna(overridden).cards.layout.id).toBe('split');
    expect(overridden.diagnostics).toContainEqual(expect.objectContaining({ code: 'LOCK_OVERRIDDEN_BY_FORCE', level: 'info' }));
    const missingDNA = { ...currentDNA, cards: { ...currentDNA.cards, layout: { id: 'layout-a', version: '2.0.0' } } };
    expect(generate(request({ currentDNA: missingDNA, locks: { layout: true } }), data)).toMatchObject({ status: 'error', error: { code: 'LOCKED_CARD_NOT_FOUND' } });
    const splitDNA = dna(generate(request({ forcedCards: { layout: 'split' } }), data));
    expect(generate(request({ currentDNA: splitDNA, locks: { layout: true }, content: { id: 'empty', elements: [] } }), data)).toMatchObject({ status: 'error', error: { code: 'LOCKED_CARD_INELIGIBLE' } });
  });
  it('keeps locked optional nulls and supports detail arrays and no-op data', () => {
    const lib = library([...data.packs[0]!.cards, card('no-detail', 'detail', { noOp: true })]);
    const currentDNA = dna(generate(request({ forcedCards: { detail: [], wild: null, image: null } }), lib));
    expect(currentDNA.cards.details).toEqual([]);
    const next = dna(generate(request({ seed: 10, currentDNA, locks: { detail: true, wild: true, image: true } }), lib));
    expect(next.cards.details).toEqual([]);
    expect(next.cards.wild).toBeNull(); expect(next.cards.image).toBeNull();
    expect(dna(generate(request({ forcedCards: { detail: ['no-detail'] } }), lib)).cards.details).toEqual([]);
    expect(dna(generate(request({ forcedCards: { detail: ['detail-a'] } }), lib)).cards.details.map(ref => ref.id)).toEqual(['detail-a']);
  });
  it('reports empty required pools and allows empty optional pools', () => {
    expect(generate(request(), library([]))).toMatchObject({ status: 'error', error: { code: 'NO_ELIGIBLE_LAYOUT' } });
    expect(generate(request(), library([card('layout-a', 'layout')]))).toMatchObject({ status: 'error', error: { code: 'NO_ELIGIBLE_CARD', module: 'composition' } });
    const minimal = library(data.packs[0]!.cards.filter(item => !['image', 'detail', 'wild'].includes(item.type)));
    const output = dna(generate(request(), minimal));
    expect(output.cards.image).toBeNull(); expect(output.cards.wild).toBeNull(); expect(output.cards.details).toEqual([]);
  });
  it('supports multiple explicit details and conditions each later detail on earlier choices', () => {
    const lib = { ...library([...data.packs[0]!.cards, card('detail-b', 'detail')]),
      compatibility: { pairs: [{ a: 'detail-a', b: 'detail-b', multiplier: 2 }], tags: [] } };
    const result = generate(request({ forcedCards: { detail: ['detail-a', 'detail-b'] } }), lib);
    const output = dna(result);
    expect(output.cards.details.map(ref => ref.id)).toEqual(['detail-a', 'detail-b']);
    expect(output.parameters.details).toHaveLength(2);
    if (result.status !== 'success') throw new Error('Expected DNA');
    const pools = result.debug!.pools.filter(pool => pool.type === 'detail');
    expect(pools[1]!.eligible.find(entry => entry.card.id === 'detail-b')!.compatibilityWeight).toBe(2);
    const next = dna(generate(request({ seed: 50, currentDNA: output, locks: { detail: true } }), lib));
    expect(next.cards.details).toEqual(output.cards.details);
  });
  it.each(['guided', 'production'] as const)('rejects unsupported mode %s', mode => {
    expect(generate(request({ mode }), data)).toMatchObject({ status: 'error', error: { code: 'UNSUPPORTED_MODE' } });
  });
  it.each(['module_reroll', 'local_variation', 'high_novelty', 'preserve_dna'] as const)('rejects unsupported variation %s', variationPolicy => {
    expect(generate(request({ variationPolicy }), data)).toMatchObject({ status: 'error', error: { code: 'UNSUPPORTED_VARIATION_POLICY' } });
  });
  it.each([
    { seed: undefined }, { seed: Infinity }, { seed: '' }, { content: null }, { canvas: { width: 0 } },
    { forcedCards: { layout: 5 } }, { forcedCards: { detail: ['detail-a', 'detail-a'] } },
    { locks: { layout: true } }, { options: { debug: 'yes' } }, { enabledPackIds: [2] },
  ])('rejects invalid requests without throwing: %j', patch => {
    expect(generate({ ...request(), ...patch } as unknown as GenerationRequest, data)).toMatchObject({ status: 'error', error: { code: 'INVALID_REQUEST' } });
  });
  it('does not change palette selection when typography gains parameter draws', () => {
    const changed = library(data.packs[0]!.cards.map(item => item.type !== 'typography' ? item : {
      ...item, parameters: Object.fromEntries(Array.from({ length: 40 }, (_, index) => [
        'extra-' + index, { type: 'float' as const, min: 0, max: 1, default: 0.5 },
      ])),
    }));
    for (let seed = 0; seed < 50; seed++) {
      const a = dna(generate(request({ seed }), data)); const b = dna(generate(request({ seed }), changed));
      expect(b.cards).toEqual(a.cards);
      expect(b.parameters.palette).toEqual(a.parameters.palette);
      expect(b.seeds).toEqual(a.seeds);
    }
  });
  it('excludes forbidden/zero weights across 1000 fixed seeds and prefers high weights', () => {
    const lib = { ...library([
      ...library().packs[0]!.cards.filter(item => item.type !== 'typography'),
      card('high', 'typography', { weight: 100 }), card('low', 'typography', { weight: 0.01 }),
      card('zero', 'typography', { weight: 0 }), card('forbidden', 'typography', { weight: 1000 }),
    ]), compatibility: { pairs: [{ a: 'layout-a', b: 'forbidden', multiplier: 0 }], tags: [] } };
    let high = 0; let low = 0; let wild = 0;
    for (let seed = 0; seed < 1000; seed++) {
      const output = dna(generate(request({ seed, options: {} }), lib));
      expect(['high', 'low']).toContain(output.cards.typography.id);
      if (output.cards.typography.id === 'high') high++; else low++;
      if (output.cards.wild) wild++;
    }
    expect(high).toBeGreaterThan(low);
    expect(wild).toBeGreaterThan(80); expect(wild).toBeLessThan(220);
  });
  it('rejects a forbidden forced pair and invalid rule parameter override', () => {
    const forbidden = { ...data, compatibility: { pairs: [{ a: 'layout-a', b: 'type-a', multiplier: 0 }], tags: [] } };
    expect(generate(request({ forcedCards: { layout: 'layout-a', typography: 'type-a' } }), forbidden)).toMatchObject({ status: 'error', error: { code: 'FORCED_CARD_INELIGIBLE' } });
    const bad = library(data.packs[0]!.cards.map(item => item.type !== 'layout' ? item : {
      ...item, parameters: { count: { type: 'integer' as const, min: 1, max: 2, default: 1 } },
      rules: [{ id: 'bad', when: { field: 'hasImage', operator: 'eq' as const, value: true },
        effect: { type: 'parameterOverride' as const, parameters: { count: 5 } } }],
    }));
    expect(generate(request(), bad)).toMatchObject({ status: 'error', error: { code: 'INVALID_PARAMETER_SCHEMA' } });
  });
  it('is pure and independent of input pack/card ordering', () => {
    const req = request(); const beforeRequest = JSON.stringify(req); const beforeLibrary = JSON.stringify(data);
    const result = generate(req, data);
    expect(JSON.stringify(req)).toBe(beforeRequest); expect(JSON.stringify(data)).toBe(beforeLibrary);
    expect(generate(req, library([...data.packs[0]!.cards].reverse()))).toEqual(result);
  });
});
