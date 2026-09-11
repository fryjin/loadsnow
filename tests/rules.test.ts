import { describe, expect, it } from 'vitest';
import type { CardRule, RuleCondition, RuleContext } from '../packages/design-domain/src/index';
import { evaluateRule, evaluateRules } from '../packages/design-rules/src/index';

const rule = (when: RuleCondition): CardRule => ({ id: 'test', when, effect: { type: 'disable' } });

describe('declarative rules', () => {
  const cases: [RuleCondition, RuleContext, RuleContext][] = [
    [{ field: 'x', operator: 'eq', value: false }, { x: false }, { x: true }],
    [{ field: 'x', operator: 'neq', value: 'a' }, { x: 'b' }, { x: 'a' }],
    [{ field: 'x', operator: 'gt', value: 2 }, { x: 3 }, { x: 2 }],
    [{ field: 'x', operator: 'gte', value: 2 }, { x: 2 }, { x: 1 }],
    [{ field: 'x', operator: 'lt', value: 2 }, { x: 1 }, { x: 2 }],
    [{ field: 'x', operator: 'lte', value: 2 }, { x: 2 }, { x: 3 }],
    [{ field: 'x', operator: 'contains', value: 'a' }, { x: ['a', 'b'] }, { x: ['b'] }],
    [{ field: 'x', operator: 'in', value: ['a', 'b'] }, { x: 'b' }, { x: 'c' }],
  ];
  it.each(cases)('evaluates %j with matching and nonmatching values', (when, yes, no) => {
    expect(evaluateRule(rule(when), yes)).toEqual({ type: 'disable' });
    expect(evaluateRule(rule(when), no)).toBeNull();
  });
  it('supports string contains without coercing types', () => {
    expect(evaluateRule(rule({ field: 'x', operator: 'contains', value: 'abc' }), { x: 'zabc' })).not.toBeNull();
    expect(evaluateRule(rule({ field: 'x', operator: 'gt', value: 2 }), { x: '3' })).toBeNull();
    expect(evaluateRule(rule({ field: 'x', operator: 'eq', value: 3 }), { x: '3' })).toBeNull();
    expect(evaluateRule(rule({ field: 'x', operator: 'contains', value: 3 }), { x: '123' })).toBeNull();
  });
  it('fails closed on missing and inherited context fields', () => {
    for (const [when] of cases) expect(evaluateRule(rule(when), {})).toBeNull();
    expect(evaluateRule(rule({ field: 'toString', operator: 'neq', value: null }), {})).toBeNull();
    expect(evaluateRule(rule({ field: 'x', operator: 'neq', value: false }), { x: undefined })).toBeNull();
  });
  it('folds all effects in data order without mutating inputs', () => {
    const when = Object.freeze({ field: 'active', operator: 'eq', value: true } as const);
    const rules = Object.freeze([
      { id: 'off', when, effect: { type: 'disable' } },
      { id: 'weight-1', when, effect: { type: 'weightMultiply', factor: 0.3 } },
      { id: 'weight-2', when, effect: { type: 'weightMultiply', factor: 2 } },
      { id: 'parameter-1', when, effect: { type: 'parameterOverride', parameters: { size: 12 } } },
      { id: 'parameter-2', when, effect: { type: 'parameterOverride', parameters: { size: 24 } } },
    ] as const);
    const base = Object.freeze({ weight: 10, parameters: Object.freeze({ size: 8, family: 'sans' }) });
    const context = Object.freeze({ active: true });
    expect(evaluateRules(rules, context, base)).toEqual({
      disabled: true, weight: 6, parameters: { size: 24, family: 'sans' },
      matchedRuleIds: rules.map(item => item.id),
    });
    expect(base.parameters.size).toBe(8);
    expect(evaluateRules(rules, { active: false }, base)).toEqual({
      disabled: false, weight: 10, parameters: { size: 8, family: 'sans' }, matchedRuleIds: [],
    });
  });
});
