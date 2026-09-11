import { describe, expect, it } from 'vitest';
import { compatibilityWeight } from '../../packages/design-generation/src/compatibility';
import { buildCardPool } from '../../packages/design-generation/src/pool';
import { profileContent } from '../../packages/design-generation/src/profile';
import { card, library, request } from './fixtures';

describe('Compatibility and conditional card pools', () => {
  const layout = card('layout-a', 'layout', { tags: ['minimal'] });
  const typography = card('type-a', 'typography', { tags: ['dense'] });
  it('applies symmetric pair/tag multipliers once per rule per selected pair', () => {
    const data = { pairs: [{ a: 'layout-a', b: 'type-a', multiplier: 1.2 }],
      tags: [{ tagA: 'minimal', tagB: 'dense', multiplier: 0.5 }] };
    expect(compatibilityWeight(typography, [layout], data).multiplier).toBe(0.6);
    expect(compatibilityWeight(layout, [typography], data).multiplier).toBe(0.6);
    expect(compatibilityWeight(typography, [layout], data).effects).toHaveLength(2);
    expect(compatibilityWeight(typography, [], data).multiplier).toBe(1);
  });
  it('makes any zero compatibility rule forbidden', () => {
    expect(compatibilityWeight(typography, [layout], {
      pairs: [{ a: 'layout-a', b: 'type-a', multiplier: 0 }],
      tags: [{ tagA: 'minimal', tagB: 'dense', multiplier: 2 }],
    }).multiplier).toBe(0);
  });
  it('filters type then status and enabled packs without changing the loader library', () => {
    const data = library([
      layout, card('active', 'typography'), card('draft', 'typography', { status: 'draft' }),
      card('old', 'typography', { status: 'deprecated' }),
    ]);
    const req = request();
    const pool = buildCardPool({ type: 'typography', library: data, request: req, contentProfile: profileContent(req.content, req.canvas) });
    expect(pool.eligible.map(entry => entry.card.id)).toEqual(['active']);
    expect(pool.excluded).toEqual([{ cardId: 'draft', reason: 'status' }, { cardId: 'old', reason: 'status' }]);
    expect(data.packs[0]?.cards).toHaveLength(4);
    expect(buildCardPool({ type: 'typography', library: data, request: { ...req, enabledPackIds: [] }, contentProfile: profileContent(req.content, req.canvas) }).eligible).toEqual([]);
  });
  it('combines base, context, compatibility and overrides before sampling', () => {
    const candidate = card('type-a', 'typography', { weight: 10, rules: [
      { id: 'weight', when: { field: 'hasImage', operator: 'eq', value: true }, effect: { type: 'weightMultiply', factor: 0.3 } },
      { id: 'override', when: { field: 'selected.layout', operator: 'eq', value: 'layout-a' }, effect: { type: 'parameterOverride', parameters: { emphasis: 2 } } },
    ] });
    const data = { ...library([candidate]), compatibility: { pairs: [{ a: 'layout-a', b: 'type-a', multiplier: 2 }], tags: [] } };
    const req = request();
    const pool = buildCardPool({ type: 'typography', library: data, request: req,
      contentProfile: profileContent(req.content, req.canvas), selectedCards: { layout: [layout] } });
    expect(pool.eligible[0]).toMatchObject({ baseWeight: 10, contextWeight: 0.3, compatibilityWeight: 2, finalWeight: 6, parameterOverrides: { emphasis: 2 } });
  });
  it('re-evaluates downstream eligibility from selected cards', () => {
    const candidate = card('type-a', 'typography', { eligibility: [
      { id: 'block', when: { field: 'selected.layout', operator: 'eq', value: 'layout-a' }, effect: { type: 'disable' } },
    ] });
    const data = library([candidate]); const req = request();
    const args = { type: 'typography' as const, library: data, request: req, contentProfile: profileContent(req.content, req.canvas) };
    expect(buildCardPool(args).eligible).toHaveLength(1);
    expect(buildCardPool({ ...args, selectedCards: { layout: [layout] } }).eligible).toHaveLength(0);
  });
  it('excludes zero final weight and forbidden cards from the weighted pool', () => {
    const data = { ...library([typography, card('zero', 'typography', { weight: 0 })]),
      compatibility: { pairs: [{ a: 'layout-a', b: 'type-a', multiplier: 0 }], tags: [] } };
    const req = request();
    const pool = buildCardPool({ type: 'typography', library: data, request: req, contentProfile: profileContent(req.content, req.canvas), selectedCards: { layout: [layout] } });
    expect(pool.eligible).toHaveLength(0);
    expect(pool.excluded.map(item => item.reason)).toEqual(['compatibility', 'weight']);
  });
});
