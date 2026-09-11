import type { CardDefinition, CompatibilityData, CompatibilityEffect } from '@loadsnow/design-domain';

/** Each symmetric rule applies once per candidate/selected pair. */
export function compatibilityWeight(candidate: CardDefinition, selected: readonly CardDefinition[], data: CompatibilityData) {
  const effects: CompatibilityEffect[] = [];
  for (const card of selected) {
    data.pairs.forEach((rule, ruleIndex) => {
      if ((rule.a === candidate.id && rule.b === card.id) || (rule.b === candidate.id && rule.a === card.id)) {
        effects.push({ kind: 'pair', ruleIndex, selectedCardId: card.id, multiplier: rule.multiplier });
      }
    });
    data.tags.forEach((rule, ruleIndex) => {
      if ((candidate.tags.includes(rule.tagA) && card.tags.includes(rule.tagB))
        || (candidate.tags.includes(rule.tagB) && card.tags.includes(rule.tagA))) {
        effects.push({ kind: 'tag', ruleIndex, selectedCardId: card.id, multiplier: rule.multiplier });
      }
    });
  }
  const multiplier = effects.some(effect => effect.multiplier === 0) ? 0
    : effects.reduce((product, effect) => product * effect.multiplier, 1);
  return { multiplier, effects };
}
