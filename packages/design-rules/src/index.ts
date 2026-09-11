import type {
  CardRule, RuleContext, RuleEffect, RuleEvaluation, RuleValue,
} from '@loadsnow/design-domain';

/** Flat, own-property predicates. Missing fields never match, including neq. */
export function evaluateRule(rule: CardRule, context: RuleContext): RuleEffect | null {
  const { field, operator, value } = rule.when;
  if (!Object.hasOwn(context, field)) return null;
  const actual = context[field];
  if (actual === undefined) return null;
  let matched: boolean;
  switch (operator) {
    case 'eq': matched = actual === value; break;
    case 'neq': matched = actual !== value; break;
    case 'gt': matched = typeof actual === 'number' && actual > value; break;
    case 'gte': matched = typeof actual === 'number' && actual >= value; break;
    case 'lt': matched = typeof actual === 'number' && actual < value; break;
    case 'lte': matched = typeof actual === 'number' && actual <= value; break;
    case 'contains':
      matched = typeof actual === 'string'
        ? typeof value === 'string' && actual.includes(value)
        : Array.isArray(actual) && actual.includes(value);
      break;
    case 'in': matched = value.some(item => item === actual); break;
  }
  return matched ? rule.effect : null;
}

/** Effects compose in data order. Disabled is sticky; the last parameter override wins. */
export function evaluateRules(
  rules: readonly CardRule[],
  context: RuleContext,
  base: { readonly weight: number; readonly parameters: Readonly<Record<string, RuleValue>> } = { weight: 1, parameters: {} },
): RuleEvaluation {
  let disabled = false;
  let weight = base.weight;
  let parameters = { ...base.parameters };
  const matchedRuleIds: string[] = [];
  for (const rule of rules) {
    const effect = evaluateRule(rule, context);
    if (!effect) continue;
    matchedRuleIds.push(rule.id);
    switch (effect.type) {
      case 'disable': disabled = true; break;
      case 'weightMultiply': weight *= effect.factor; break;
      case 'parameterOverride': parameters = { ...parameters, ...effect.parameters }; break;
    }
  }
  return { disabled, weight, parameters, matchedRuleIds };
}
