import type { CardPack, CompatibilityData, Diagnostic, GenerationLibrary } from '@loadsnow/design-domain';
import { loadCards } from './index';
import { finite, record, text, version } from './schema';

function compatibility(value: unknown): value is CompatibilityData {
  return record(value) && Array.isArray(value.pairs) && Array.isArray(value.tags)
    && value.pairs.every(rule => record(rule) && text(rule.a) && text(rule.b) && finite(rule.multiplier) && rule.multiplier >= 0)
    && value.tags.every(rule => record(rule) && text(rule.tagA) && text(rule.tagB) && finite(rule.multiplier) && rule.multiplier >= 0);
}

export function loadLibrary(data: unknown): { readonly library: GenerationLibrary | null; readonly diagnostics: readonly Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const invalid = (path: string, message: string) => diagnostics.push({ code: 'INVALID_CARD_SCHEMA', level: 'error', path, message });
  if (!record(data) || !Array.isArray(data.packs) || !compatibility(data.compatibility)) {
    invalid('$', 'Expected packs and valid explicit-pair/tag compatibility data.');
    return { library: null, diagnostics };
  }
  const packs: CardPack[] = [];
  const packIds = new Set<string>();
  const cardIds = new Set<string>();
  for (const [index, pack] of data.packs.entries()) {
    const path = 'packs[' + index + ']';
    if (!record(pack) || !text(pack.id) || !text(pack.name) || !version(pack.version)) {
      invalid(path, 'Pack requires id, name and x.y.z version.');
      continue;
    }
    if (packIds.has(pack.id)) invalid(path, 'Duplicate pack ID: ' + pack.id);
    packIds.add(pack.id);
    const loaded = loadCards(pack.cards);
    diagnostics.push(...loaded.diagnostics.map(item => ({ ...item, path: path + '.cards' + (item.path ?? '') })));
    for (const card of loaded.cards) {
      if (cardIds.has(card.id)) invalid(path, 'Card IDs must be unique across M1 packs: ' + card.id);
      cardIds.add(card.id);
    }
    packs.push({ id: pack.id, name: pack.name, version: pack.version, cards: loaded.cards });
  }
  return { library: diagnostics.length ? null : { packs, compatibility: data.compatibility }, diagnostics };
}
