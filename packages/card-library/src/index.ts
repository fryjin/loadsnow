import { CARD_TYPES } from '@loadsnow/design-domain';
import type { CardDefinition, Diagnostic } from '@loadsnow/design-domain';

export interface CardLibraryResult {
  readonly cards: readonly CardDefinition[];
  readonly diagnostics: readonly Diagnostic[];
}

function record(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const scalar = (value: unknown): boolean =>
  value === null || typeof value === 'string' || typeof value === 'boolean' || finite(value);
const ruleValue = (value: unknown): boolean =>
  scalar(value) || (Array.isArray(value) && value.every(scalar));
const valueMap = (value: unknown): boolean =>
  record(value) && Object.entries(value).every(([key, item]) => text(key) && ruleValue(item));

function parameter(value: unknown): boolean {
  if (!record(value)) return false;
  switch (value.type) {
    case 'string': return typeof value.default === 'string';
    case 'boolean': return typeof value.default === 'boolean';
    case 'number':
      return finite(value.default)
        && (value.min === undefined || (finite(value.min) && value.default >= value.min))
        && (value.max === undefined || (finite(value.max) && value.default <= value.max));
    default: return false;
  }
}

function condition(value: unknown): boolean {
  if (!record(value) || !text(value.field)) return false;
  switch (value.operator) {
    case 'eq': case 'neq': case 'contains': return scalar(value.value);
    case 'gt': case 'gte': case 'lt': case 'lte': return finite(value.value);
    case 'in': return Array.isArray(value.value) && value.value.every(scalar);
    default: return false;
  }
}

function effect(value: unknown): boolean {
  if (!record(value)) return false;
  switch (value.type) {
    case 'disable': return true;
    case 'weightMultiply': return finite(value.factor) && value.factor >= 0;
    case 'parameterOverride': return valueMap(value.parameters);
    default: return false;
  }
}

function rules(value: unknown): boolean {
  return Array.isArray(value) && value.every(item =>
    record(item) && text(item.id) && condition(item.when) && effect(item.effect));
}

function isCard(value: unknown): value is CardDefinition {
  if (!record(value)) return false;
  return text(value.id)
    && CARD_TYPES.some(type => type === value.type)
    && text(value.name)
    && text(value.version) && /^\d+\.\d+\.\d+$/.test(value.version)
    && ['draft', 'active', 'deprecated'].some(status => status === value.status)
    && ['low', 'medium', 'high'].some(risk => risk === value.riskLevel)
    && ['common', 'uncommon', 'rare'].some(rarity => rarity === value.rarity)
    && finite(value.weight) && value.weight >= 0
    && record(value.parameters)
    && Object.entries(value.parameters).every(([key, item]) => text(key) && parameter(item))
    && rules(value.rules)
    && (value.eligibility === undefined || rules(value.eligibility))
    && (value.variants === undefined || (Array.isArray(value.variants) && value.variants.every(item =>
      record(item) && text(item.id) && text(item.name) && valueMap(item.parameters))));
}

/** Accepts already-parsed data. File/network access belongs to the caller. */
export function loadCards(data: unknown): CardLibraryResult {
  const cards: CardDefinition[] = [];
  const diagnostics: Diagnostic[] = [];
  if (!Array.isArray(data)) {
    return {
      cards,
      diagnostics: [{ code: 'INVALID_CARD_SCHEMA', level: 'error', path: '$', message: 'Expected an array of card definitions.' }],
    };
  }
  const ids = new Set<string>();
  data.forEach((candidate: unknown, index) => {
    const path = '[' + index + ']';
    if (!isCard(candidate)) {
      diagnostics.push({
        code: 'INVALID_CARD_SCHEMA', level: 'error', path,
        message: 'Expected valid id, type, name, x.y.z version, status, riskLevel, rarity, weight, parameters and rules; eligibility and variants must also be valid when present.',
        ...(record(candidate) && text(candidate.id) ? { cardId: candidate.id } : {}),
      });
    } else if (ids.has(candidate.id)) {
      diagnostics.push({
        code: 'INVALID_CARD_SCHEMA', level: 'error', path, cardId: candidate.id,
        message: 'Duplicate card id: ' + candidate.id,
      });
    } else {
      ids.add(candidate.id);
      cards.push(candidate);
    }
  });
  return { cards, diagnostics };
}
