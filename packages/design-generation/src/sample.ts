import type {
  CardDefinition, CardPool, CardRef, CardSelection, CardType, ContentProfile, DesignDNA, DesignSeeds,
  Diagnostic, GenerationError, GenerationLibrary, GenerationRequest, PoolEntry, ResolvedParameters,
} from '@loadsnow/design-domain';
import { buildCardPool } from './pool';
import { resolveParameters } from './parameters';
import { moduleRandom, SAMPLING_ORDER } from './seeds';

type SampleResult =
  | { readonly status: 'success'; readonly cards: DesignDNA['cards']; readonly parameters: DesignDNA['parameters']; readonly pools: readonly CardPool[]; readonly diagnostics: readonly Diagnostic[] }
  | { readonly status: 'error'; readonly error: GenerationError; readonly diagnostics: readonly Diagnostic[] };
const reference = (card: CardDefinition): CardRef => ({ id: card.id, version: card.version });

function lockedSelections(request: GenerationRequest, module: CardType): readonly CardSelection[] {
  const cards = request.currentDNA!.cards;
  if (module === 'detail') return cards.details;
  const card = cards[module];
  return card ? [card] : [];
}

/** Greedy conditional sampling in the frozen order. No retries, search or silent substitutions. */
export function sampleCards(request: GenerationRequest, library: GenerationLibrary, contentProfile: ContentProfile, seeds: DesignSeeds): SampleResult {
  const selected: Partial<Record<CardType, CardDefinition[]>> = {};
  const resolved: Partial<Record<CardType, ResolvedParameters[]>> = {};
  const pools: CardPool[] = [];
  const diagnostics: Diagnostic[] = [];
  const allCards = library.packs.flatMap(pack => pack.cards);
  const fail = (error: GenerationError): SampleResult => ({ status: 'error', error, diagnostics: [
    ...diagnostics, { code: error.code, level: 'error', message: error.message, ...(error.cardId ? { cardId: error.cardId } : {}) },
  ] });
  for (const module of SAMPLING_ORDER) {
    selected[module] = []; resolved[module] = [];
    const stream = moduleRandom(seeds, module);
    const forced = request.forcedCards !== undefined && Object.hasOwn(request.forcedCards, module);
    const locked = Boolean(request.locks?.[module]);
    let explicit: readonly CardSelection[] | undefined;
    if (forced) {
      const value = request.forcedCards![module];
      explicit = module === 'detail' ? value as readonly CardSelection[] : value === null ? [] : [value as CardSelection];
      if (locked) diagnostics.push({ code: 'LOCK_OVERRIDDEN_BY_FORCE', level: 'info', message: 'Explicit force overrides the ' + module + ' lock.' });
    } else if (locked) explicit = lockedSelections(request, module);
    let pool = buildCardPool({ type: module, library, request, contentProfile, selectedCards: selected });
    pools.push(pool);
    diagnostics.push(...pool.diagnostics);
    if (pool.diagnostics.some(item => item.level === 'error')) return fail({ code: 'INVALID_REQUEST', module, message: 'Invalid combined weight in ' + module + ' pool.' });
    const optional = module === 'image' || module === 'detail' || module === 'wild';
    let count = 1;
    if (explicit !== undefined) count = explicit.length;
    else if (module === 'image' && !contentProfile.hasImage) count = 0;
    else if (module === 'detail') count = stream.fork('count').nextInt(0, 1);
    else if (module === 'wild') count = stream.fork('chance').nextFloat() < 0.15 ? 1 : 0;
    for (let index = 0; index < count; index++) {
      if (index > 0) {
        pool = buildCardPool({ type: module, library, request, contentProfile, selectedCards: selected });
        pools.push(pool); diagnostics.push(...pool.diagnostics);
        if (pool.diagnostics.some(item => item.level === 'error')) return fail({ code: 'INVALID_REQUEST', module, message: 'Invalid combined detail weight.' });
      }
      let entry: PoolEntry | undefined;
      if (explicit !== undefined) {
        const choice = explicit[index]!;
        const id = typeof choice === 'string' ? choice : choice.id;
        const card = allCards.find(item => item.id === id && (typeof choice === 'string' || item.version === choice.version));
        if (!card) return fail({ code: forced ? 'FORCED_CARD_NOT_FOUND' : 'LOCKED_CARD_NOT_FOUND', module, cardId: id, message: 'Requested card/version does not exist: ' + id });
        entry = pool.eligible.find(item => item.card.id === card.id && item.card.type === module);
        if (!entry || (module === 'image' && !contentProfile.hasImage)) return fail({
          code: forced ? 'FORCED_CARD_INELIGIBLE' : 'LOCKED_CARD_INELIGIBLE', module, cardId: id,
          message: 'Requested card does not satisfy type, status, pack, eligibility, compatibility or positive weight: ' + id,
        });
      } else {
        if (pool.eligible.length === 0) {
          if (optional) break;
          return fail({ code: module === 'layout' ? 'NO_ELIGIBLE_LAYOUT' : 'NO_ELIGIBLE_CARD', module, message: 'No eligible ' + module + ' card.' });
        }
        const selectionStream = stream.fork(module === 'detail' ? 'select:' + index : 'select');
        entry = selectionStream.weightedPick(pool.eligible.map(candidate => ({ value: candidate, weight: candidate.finalWeight })));
      }
      if (entry.card.noOp) {
        if (count > 1) return fail({ code: forced ? 'FORCED_CARD_INELIGIBLE' : 'LOCKED_CARD_INELIGIBLE', module, cardId: entry.card.id, message: 'A no-detail card cannot be combined with other details.' });
        continue;
      }
      const parameterStream = stream.fork(module === 'detail' ? 'params:' + index : 'params');
      const parameters = resolveParameters(entry.card, entry.parameterOverrides, parameterStream);
      if (parameters.status === 'error') return fail({ ...parameters.error, module });
      selected[module]!.push(entry.card); resolved[module]!.push(parameters.parameters);
    }
  }
  // Required modules return an error at their empty pool, so these four entries exist.
  const cards: DesignDNA['cards'] = {
    layout: reference(selected.layout![0]!), composition: reference(selected.composition![0]!),
    typography: reference(selected.typography![0]!), palette: reference(selected.palette![0]!),
    image: selected.image![0] ? reference(selected.image![0]) : null,
    details: selected.detail!.map(reference), wild: selected.wild![0] ? reference(selected.wild![0]) : null,
  };
  const parameters: DesignDNA['parameters'] = {
    layout: resolved.layout![0]!, composition: resolved.composition![0]!, typography: resolved.typography![0]!,
    palette: resolved.palette![0]!, image: resolved.image![0] ?? null,
    details: resolved.detail!, wild: resolved.wild![0] ?? null,
  };
  return { status: 'success', cards, parameters, pools, diagnostics };
}
