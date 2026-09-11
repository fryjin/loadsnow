import { describe, expect, it } from 'vitest';
import { loadLibrary } from '../../packages/card-library/src/index';
import { prototypeLibraryData } from '../../data/prototype-library';
import caseLowNoImage from '../../data/test-content/case-low-no-image.json';
import caseMediumImage from '../../data/test-content/case-medium-image.json';
import caseHighImage from '../../data/test-content/case-high-image.json';
import caseLongTitle from '../../data/test-content/case-long-title.json';
import caseCjk from '../../data/test-content/case-cjk.json';

const expectedIds = [
  'L001', 'L002', 'L003', 'L005', 'L013',
  'T001', 'T003', 'T004', 'T006', 'T009',
  'P001', 'P002', 'P003', 'P004', 'P011',
  'I001', 'I003', 'I004', 'I005',
  'C001', 'C002', 'C008',
  'D001', 'D002', 'D004',
  'W001', 'W002',
];

const loaded = loadLibrary(prototypeLibraryData);

describe('M1 prototype seed data', () => {
  it('loads the complete 27-card prototype pack without diagnostics', () => {
    expect(loaded.diagnostics).toEqual([]);
    expect(loaded.library?.packs).toHaveLength(1);
    expect(loaded.library?.packs[0]).toMatchObject({
      id: 'poster-core-prototype',
      name: 'Poster Core Prototype',
      version: '0.1.0',
    });

    const cards = loaded.library?.packs[0]?.cards ?? [];
    expect(cards.map(card => card.id).sort()).toEqual([...expectedIds].sort());
    expect(cards.every(card => card.status === 'active' && card.version === '0.1.0')).toBe(true);
    expect(cards.every(card => card.tags.length > 0)).toBe(true);

    const counts = Object.fromEntries(
      ['layout', 'typography', 'palette', 'image', 'composition', 'detail', 'wild']
        .map(type => [type, cards.filter(card => card.type === type).length]),
    );
    expect(counts).toEqual({ layout: 5, typography: 5, palette: 5, image: 4, composition: 3, detail: 3, wild: 2 });
  });

  it('contains the required rules and all four sampling parameter types', () => {
    const cards = loaded.library?.packs[0]?.cards ?? [];
    const byId = new Map(cards.map(card => [card.id, card]));

    expect(byId.get('L002')?.rules[0]).toEqual({
      id: 'high-density-weight',
      when: { field: 'contentDensity', operator: 'eq', value: 'high' },
      effect: { type: 'weightMultiply', factor: 0.3 },
    });
    expect(byId.get('L003')?.eligibility).toContainEqual({
      id: 'requires-image',
      when: { field: 'hasImage', operator: 'eq', value: false },
      effect: { type: 'disable' },
    });
    for (const image of cards.filter(card => card.type === 'image')) {
      expect([...(image.eligibility ?? []), ...image.rules]).toContainEqual({
        id: 'requires-image',
        when: { field: 'hasImage', operator: 'eq', value: false },
        effect: { type: 'disable' },
      });
    }
    expect(byId.get('D001')).toMatchObject({ noOp: true, parameters: {}, tags: expect.arrayContaining(['no-detail']) });

    const parameterTypes = new Set(cards.flatMap(card => Object.values(card.parameters).map(parameter => parameter.type)));
    expect(parameterTypes).toEqual(new Set(['integer', 'float', 'boolean', 'enum']));
  });

  it('contains the required pair and tag compatibility multipliers', () => {
    expect(loaded.library?.compatibility.pairs).toEqual(expect.arrayContaining([
      { a: 'L003', b: 'I004', multiplier: 1.4 },
      { a: 'L005', b: 'T003', multiplier: 1.3 },
      { a: 'L005', b: 'W002', multiplier: 1.3 },
      { a: 'L001', b: 'T006', multiplier: 1.2 },
      { a: 'L013', b: 'I005', multiplier: 1.25 },
      { a: 'L002', b: 'T009', multiplier: 0.4 },
      { a: 'L005', b: 'T009', multiplier: 0.4 },
    ]));
    expect(loaded.library?.compatibility.tags).toContainEqual({ tagA: 'minimal', tagB: 'dense', multiplier: 0.3 });
  });

  it('provides low, medium, high, long-title and Japanese content cases', () => {
    expect(caseLowNoImage).toMatchObject({ id: 'case-low-no-image', language: 'en' });
    expect(caseLowNoImage.elements).toHaveLength(1);
    expect(caseLowNoImage.elements[0]).toMatchObject({ type: 'text', role: 'TITLE' });

    expect(caseMediumImage).toMatchObject({ id: 'case-medium-image', language: 'en' });
    expect(caseMediumImage.elements).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'text', role: 'TITLE', text: 'NEW FORMS' }),
      expect.objectContaining({ type: 'text', role: 'SUBTITLE', text: 'Contemporary Design Exhibition' }),
      expect.objectContaining({ type: 'text', role: 'BODY', text: 'Short body copy' }),
      expect.objectContaining({ type: 'text', role: 'DATE', text: 'October 12–18' }),
      expect.objectContaining({ type: 'text', role: 'LOCATION', text: 'Seoul' }),
      expect.objectContaining({ type: 'image', role: 'IMAGE_PRIMARY', width: 800, height: 1200 }),
    ]));

    expect(caseHighImage).toMatchObject({ id: 'case-high-image', language: 'en' });
    const highBody = caseHighImage.elements.find(element => element.role === 'BODY');
    expect(highBody && 'text' in highBody ? highBody.text.length : 0).toBeGreaterThan(240);
    expect(caseHighImage.elements.map(element => element.role)).toEqual(expect.arrayContaining([
      'TITLE', 'SUBTITLE', 'BODY', 'DATE', 'LOCATION', 'META', 'IMAGE_PRIMARY',
    ]));

    expect(caseLongTitle).toMatchObject({ id: 'case-long-title', language: 'en' });
    const longTitle = caseLongTitle.elements.find(element => element.role === 'TITLE');
    expect(longTitle && 'text' in longTitle ? longTitle.text.length : 0).toBeGreaterThan(70);

    expect(caseCjk).toMatchObject({ id: 'case-cjk', language: 'ja' });
    expect(caseCjk.elements.some(element => element.type === 'text' && /[\u3000-\u9fff]/u.test(element.text))).toBe(true);
  });
});
