import type {
  CardPool, CardType, ContentProfile, Diagnostic, GenerationLibrary, GenerationRequest, PoolEntry, PoolExclusion, RuleContext, SelectedCards,
} from '@loadsnow/design-domain';
import { evaluateRules } from '@loadsnow/design-rules';
import { compatibilityWeight } from './compatibility';

export interface PoolInput {
  readonly type: CardType;
  readonly library: GenerationLibrary;
  readonly contentProfile: ContentProfile;
  readonly request: GenerationRequest;
  readonly selectedCards?: SelectedCards;
}

export function buildCardPool({ type, library, contentProfile, request, selectedCards = {} }: PoolInput): CardPool {
  const eligible: PoolEntry[] = [];
  const excluded: PoolExclusion[] = [];
  const diagnostics: Diagnostic[] = [];
  const selected = Object.values(selectedCards).flat();
  const context: RuleContext = {
    ...contentProfile,
    ...Object.fromEntries(Object.entries(selectedCards).map(([module, cards]) => [
      'selected.' + module, module === 'detail' ? cards.map(card => card.id) : cards[0]?.id,
    ])),
    'selected.tags': selected.flatMap(card => card.tags),
  };
  // Codepoint order makes pool order independent of JSON file/import order or locale.
  const candidates = library.packs.flatMap(pack => pack.cards.filter(card => card.type === type).map(card => ({ pack, card })))
    .sort((a, b) => a.card.id < b.card.id ? -1 : a.card.id > b.card.id ? 1 : 0);
  for (const { pack, card } of candidates) {
    const exclude = (reason: PoolExclusion['reason']) => excluded.push({ cardId: card.id, reason });
    if (card.status !== 'active') { exclude('status'); continue; }
    if (!request.enabledPackIds.includes(pack.id)) { exclude('pack'); continue; }
    const rules = evaluateRules([...(card.eligibility ?? []), ...card.rules], context);
    if (rules.disabled) { exclude('eligibility'); continue; }
    const compatibility = compatibilityWeight(card, selected, library.compatibility);
    if (compatibility.multiplier === 0) { exclude('compatibility'); continue; }
    if (selected.some(item => item.id === card.id)) { exclude('selected'); continue; }
    const finalWeight = card.weight * rules.weight * compatibility.multiplier;
    if (!Number.isFinite(finalWeight) || finalWeight < 0) {
      diagnostics.push({ code: 'INVALID_REQUEST', level: 'error', cardId: card.id, message: 'Combined card weight must be finite and nonnegative.' });
      continue;
    }
    if (finalWeight === 0) { exclude('weight'); continue; }
    eligible.push({ card, pack: { id: pack.id, version: pack.version }, baseWeight: card.weight,
      contextWeight: rules.weight, compatibilityWeight: compatibility.multiplier, finalWeight,
      parameterOverrides: rules.parameters, matchedRuleIds: rules.matchedRuleIds,
      compatibilityEffects: compatibility.effects });
  }
  return { type, eligible, excluded, diagnostics };
}
