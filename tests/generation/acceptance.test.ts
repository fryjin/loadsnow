import { describe, expect, it } from 'vitest';
import { prototypeLibraryData } from '../../data/prototype-library';
import low from '../../data/test-content/case-low-no-image.json';
import medium from '../../data/test-content/case-medium-image.json';
import high from '../../data/test-content/case-high-image.json';
import longTitle from '../../data/test-content/case-long-title.json';
import cjk from '../../data/test-content/case-cjk.json';
import { loadLibrary } from '../../packages/card-library/src/index';
import { BASE_CANVAS } from '../../packages/design-domain/src/index';
import type { GenerationRequest, GenerationResult } from '../../packages/design-domain/src/index';
import { createModuleSeeds, generate, isContentDocument, isDesignDNA, moduleRandom, SAMPLING_ORDER } from '../../packages/design-generation/src/index';

const loaded = loadLibrary(prototypeLibraryData);
if (!loaded.library) throw new Error('Prototype library must load');
const library = loaded.library;
if (!isContentDocument(medium)) throw new Error('Valid content required');
const request: GenerationRequest = {
  seed: '839217', content: medium, canvas: BASE_CANVAS, mode: 'blind', variationPolicy: 'new_direction',
  enabledPackIds: ['poster-core-prototype'], options: { debug: true },
};
function success(result: GenerationResult) {
  if (result.status !== 'success') throw new Error(result.error.code + ': ' + result.error.message);
  expect(isDesignDNA(result.dna)).toBe(true);
  return result;
}

describe('M1 real-pack acceptance gates', () => {
  it('validates every content fixture and generates complete legal DNA', () => {
    for (const content of [low, medium, high, longTitle, cjk]) {
      expect(isContentDocument(content)).toBe(true);
      if (!isContentDocument(content)) throw new Error('Invalid fixture');
      success(generate({ ...request, content }, library));
    }
  });
  it('repeats the entire 27-card result 100 times and freezes the acceptance DNA', () => {
    const first = success(generate(request, library));
    for (let index = 0; index < 100; index++) expect(generate(request, library)).toEqual(first);
    expect(first.dna).toMatchSnapshot();
  });
  it('never selects L003 or image cards across 100 no-image seeds', () => {
    if (!isContentDocument(low)) throw new Error('Invalid fixture');
    for (let seed = 0; seed < 100; seed++) {
      const result = success(generate({ ...request, seed, content: low }, library));
      expect(result.dna.cards.layout.id).not.toBe('L003');
      expect(result.dna.cards.image).toBeNull();
      expect(result.dna.parameters.image).toBeNull();
    }
  });
  it('adds a typography card through injected data without changing the sampler', () => {
    const template = library.packs[0]!.cards.find(card => card.type === 'typography')!;
    const card = { ...template, id: 'T999', name: 'Acceptance typography' };
    const extended = { ...library, packs: library.packs.map(pack => ({ ...pack, cards: [...pack.cards, card] })) };
    const result = success(generate({ ...request, forcedCards: { typography: 'T999' } }, extended));
    expect(result.dna.cards.typography).toEqual({ id: 'T999', version: '0.1.0' });
    expect(result.debug?.pools.find(pool => pool.type === 'typography')?.eligible.some(entry => entry.card.id === 'T999')).toBe(true);
  });
  it('changes downstream weights using only added compatibility data', () => {
    const req = { ...request, forcedCards: { layout: 'L001' } };
    const before = success(generate(req, library));
    const extended = { ...library, compatibility: {
      ...library.compatibility, pairs: [...library.compatibility.pairs, { a: 'L001', b: 'T001', multiplier: 2 }],
    } };
    const after = success(generate(req, extended));
    const weight = (result: typeof before) => result.debug!.pools.find(pool => pool.type === 'typography')!.eligible.find(entry => entry.card.id === 'T001')!.finalWeight;
    expect(weight(after)).toBe(weight(before) * 2);
  });
  it('freezes numeric and string module seed/select vectors for replay', () => {
    for (const seed of [839217, '839217']) {
      const seeds = createModuleSeeds(seed);
      expect({ seeds, select: Object.fromEntries(SAMPLING_ORDER.map(module => [module, moduleRandom(seeds, module).fork('select').nextFloat()])) }).toMatchSnapshot();
    }
  });
});
