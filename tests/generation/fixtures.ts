import { BASE_CANVAS } from '../../packages/design-domain/src/index';
import type { CardDefinition, CardType, GenerationLibrary, GenerationRequest } from '../../packages/design-domain/src/index';

export function card(id: string, type: CardType, changes: Partial<CardDefinition> = {}): CardDefinition {
  return { id, type, name: id, version: '0.1.0', status: 'active', riskLevel: 'low', rarity: 'common',
    weight: 1, tags: [], parameters: {}, eligibility: [], rules: [], ...changes };
}
export function library(cards: readonly CardDefinition[] = [
  card('layout-a', 'layout'), card('composition-a', 'composition'), card('type-a', 'typography'),
  card('image-a', 'image'), card('palette-a', 'palette'), card('detail-a', 'detail'), card('wild-a', 'wild'),
]): GenerationLibrary {
  return { packs: [{ id: 'test-pack', name: 'Tests', version: '0.1.0', cards }], compatibility: { pairs: [], tags: [] } };
}
export function request(changes: Partial<GenerationRequest> = {}): GenerationRequest {
  return { seed: 839217, content: { id: 'test', language: 'en', elements: [
    { id: 'title', type: 'text', role: 'TITLE', text: 'NEW FORMS' },
    { id: 'image', type: 'image', role: 'IMAGE_PRIMARY', source: 'test.jpg', alt: 'Test', width: 800, height: 1200 },
  ] }, canvas: BASE_CANVAS, mode: 'blind', variationPolicy: 'new_direction',
    enabledPackIds: ['test-pack'], options: { debug: true }, ...changes };
}
