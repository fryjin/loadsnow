import { CARD_TYPES, CONTENT_ROLES } from '@loadsnow/design-domain';
import type { ContentDocument, DesignDNA, GenerationError } from '@loadsnow/design-domain';

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const seed = (value: unknown) => text(value) || finite(value);
const ref = (value: unknown) => record(value) && text(value.id) && text(value.version);
const selection = (value: unknown) => text(value) || ref(value);
const scalar = (value: unknown): boolean => value === null || typeof value === 'string' || typeof value === 'boolean' || finite(value);
const parameters = (value: unknown): boolean => record(value) && Object.values(value).every(item => scalar(item) || (Array.isArray(item) && item.every(scalar)));

export function isContentDocument(value: unknown): value is ContentDocument {
  if (!record(value) || !text(value.id) || (value.language !== undefined && !text(value.language)) || !Array.isArray(value.elements)) return false;
  const ids = new Set<string>();
  return value.elements.every(element => {
    if (!record(element) || !text(element.id) || ids.has(element.id) || !CONTENT_ROLES.some(role => role === element.role)) return false;
    ids.add(element.id);
    return element.type === 'text' ? typeof element.text === 'string'
      : element.type === 'image' && text(element.source) && typeof element.alt === 'string'
        && finite(element.width) && element.width > 0 && finite(element.height) && element.height > 0;
  });
}

export function isDesignDNA(value: unknown): value is DesignDNA {
  if (!record(value) || !text(value.version) || !text(value.engineVersion) || !text(value.cardPackVersion)
    || !Array.isArray(value.cardPacks) || !value.cardPacks.every(ref)
    || !record(value.cards) || !record(value.parameters) || !record(value.seeds)) return false;
  const cards = value.cards; const params = value.parameters; const seeds = value.seeds;
  if (!seed(seeds.global) || !CARD_TYPES.every(module => seed(seeds[module]))) return false;
  if (!['layout', 'composition', 'typography', 'palette'].every(module => ref(cards[module]) && parameters(params[module]))) return false;
  if (!['image', 'wild'].every(module => cards[module] === null ? params[module] === null : ref(cards[module]) && parameters(params[module]))) return false;
  return Array.isArray(cards.details) && cards.details.every(ref) && Array.isArray(params.details)
    && params.details.every(parameters) && cards.details.length === params.details.length;
}

export function validateRequest(value: unknown): GenerationError | null {
  const invalid = (message: string): GenerationError => ({ code: 'INVALID_REQUEST', message });
  if (!record(value) || !seed(value.seed)) return invalid('An explicit nonempty string or finite numeric seed is required.');
  if (value.mode !== 'blind') return { code: 'UNSUPPORTED_MODE', message: 'M1 only supports blind mode.' };
  if (value.variationPolicy !== 'new_direction') return { code: 'UNSUPPORTED_VARIATION_POLICY', message: 'M1 only supports new_direction.' };
  if (!isContentDocument(value.content)) return invalid('Content requires valid semantic elements and positive image metadata dimensions.');
  const canvas = value.canvas;
  if (!record(canvas) || !finite(canvas.width) || canvas.width <= 0 || !finite(canvas.height) || canvas.height <= 0
    || !Number.isFinite(canvas.width * canvas.height) || !record(canvas.safeArea)) return invalid('Canvas dimensions and safeArea are required.');
  const safe = canvas.safeArea;
  if (!finite(safe.top) || !finite(safe.right) || !finite(safe.bottom) || !finite(safe.left)
    || [safe.top, safe.right, safe.bottom, safe.left].some(inset => inset < 0)
    || safe.top + safe.bottom >= canvas.height || safe.left + safe.right >= canvas.width) return invalid('Safe area must leave a positive canvas interior.');
  if (!Array.isArray(value.enabledPackIds) || !value.enabledPackIds.every(text)
    || new Set(value.enabledPackIds).size !== value.enabledPackIds.length) return invalid('enabledPackIds must be a unique string array.');
  if (value.options !== undefined && (!record(value.options) || Object.keys(value.options).some(key => key !== 'debug')
    || (value.options.debug !== undefined && typeof value.options.debug !== 'boolean'))) return invalid('Only a boolean debug option is supported.');
  if (value.currentDNA !== undefined && !isDesignDNA(value.currentDNA)) return invalid('currentDNA does not satisfy the complete versioned DNA contract.');
  if (value.locks !== undefined) {
    if (!record(value.locks) || Object.entries(value.locks).some(([key, locked]) => !CARD_TYPES.some(module => module === key) || typeof locked !== 'boolean')) return invalid('Invalid module locks.');
    if (Object.values(value.locks).some(Boolean) && !value.currentDNA) return invalid('Active locks require currentDNA.');
  }
  if (value.forcedCards !== undefined) {
    if (!record(value.forcedCards)) return invalid('forcedCards must be a module selection object.');
    for (const [module, forced] of Object.entries(value.forcedCards)) {
      if (!CARD_TYPES.some(type => type === module)) return invalid('Unknown forced module: ' + module);
      if (module === 'detail') {
        if (!Array.isArray(forced) || !forced.every(selection)) return invalid('Forced detail selection must be a CardRef/ID array.');
        const ids = forced.map(item => typeof item === 'string' ? item : item.id);
        if (new Set(ids).size !== ids.length) return invalid('Forced detail selections must not repeat a card.');
      } else if (!selection(forced) && !((module === 'image' || module === 'wild') && forced === null)) return invalid('Invalid forced selection for ' + module);
    }
  }
  return null;
}
