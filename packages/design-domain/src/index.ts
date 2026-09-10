export const CONTENT_ROLES = [
  'TITLE', 'SUBTITLE', 'BODY', 'DATE', 'LOCATION', 'META', 'CTA', 'IMAGE_PRIMARY', 'LOGO',
] as const;
export type ContentRole = (typeof CONTENT_ROLES)[number];
export type ContentType = 'text' | 'image';
export type ContentElement =
  | { readonly id: string; readonly role: ContentRole; readonly type: 'text'; readonly text: string }
  | { readonly id: string; readonly role: ContentRole; readonly type: 'image'; readonly source: string; readonly alt: string };
export interface ContentDocument {
  readonly id: string;
  readonly elements: readonly ContentElement[];
}
export type Content = ContentDocument;
export interface SafeArea {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}
export interface CanvasSpec {
  readonly width: number;
  readonly height: number;
  readonly safeArea: SafeArea;
}
export type Canvas = CanvasSpec;
export const BASE_CANVAS: CanvasSpec = Object.freeze({
  width: 1080, height: 1440,
  safeArea: Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 }),
});

export type DiagnosticLevel = 'info' | 'warning' | 'error';
export interface Diagnostic {
  readonly code: string;
  readonly level: DiagnosticLevel;
  readonly message: string;
  readonly path?: string;
  readonly cardId?: string;
}
export type Diagnostics = readonly Diagnostic[];
export const CARD_TYPES = ['layout', 'typography', 'palette', 'image', 'composition', 'detail', 'wild'] as const;
export type CardType = (typeof CARD_TYPES)[number];
export type CardRiskLevel = 'low' | 'medium' | 'high';
export type CardRarity = 'common' | 'uncommon' | 'rare';
export type CardStatus = 'draft' | 'active' | 'deprecated';
export type RuleScalar = string | number | boolean | null;
export type RuleValue = RuleScalar | readonly RuleScalar[];
export type RuleContext = Readonly<Record<string, RuleValue | undefined>>;
export type RuleOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
export type RuleCondition =
  | { readonly field: string; readonly operator: 'eq' | 'neq' | 'contains'; readonly value: RuleScalar }
  | { readonly field: string; readonly operator: 'gt' | 'gte' | 'lt' | 'lte'; readonly value: number }
  | { readonly field: string; readonly operator: 'in'; readonly value: readonly RuleScalar[] };
export type RuleEffect =
  | { readonly type: 'disable' }
  | { readonly type: 'weightMultiply'; readonly factor: number }
  | { readonly type: 'parameterOverride'; readonly parameters: Readonly<Record<string, RuleValue>> };
export interface CardRule {
  readonly id: string;
  readonly when: RuleCondition;
  readonly effect: RuleEffect;
}
export type CardEligibility = readonly CardRule[];
export type CardParameter =
  | { readonly type: 'number'; readonly default: number; readonly min?: number; readonly max?: number }
  | { readonly type: 'string'; readonly default: string }
  | { readonly type: 'boolean'; readonly default: boolean };
export interface CardVariant {
  readonly id: string;
  readonly name: string;
  readonly parameters: Readonly<Record<string, RuleValue>>;
}
export interface CardDefinition {
  readonly id: string;
  readonly type: CardType;
  readonly name: string;
  readonly version: string;
  readonly status: CardStatus;
  readonly riskLevel: CardRiskLevel;
  readonly rarity: CardRarity;
  readonly weight: number;
  readonly parameters: Readonly<Record<string, CardParameter>>;
  readonly eligibility?: CardEligibility;
  readonly rules: readonly CardRule[];
  readonly variants?: readonly CardVariant[];
}
export type Card = CardDefinition;
export interface CardPack {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly cards: readonly CardDefinition[];
}
export interface RuleEvaluation {
  readonly disabled: boolean;
  readonly weight: number;
  readonly parameters: Readonly<Record<string, RuleValue>>;
  readonly matchedRuleIds: readonly string[];
}

// Reserved contracts only; DEV-001 does not perform generation.
export interface GenerationRequest {
  readonly seed: string | number;
  readonly content: Content;
  readonly canvas: CanvasSpec;
  readonly packIds: readonly string[];
}
export interface GenerationContext {
  readonly request: GenerationRequest;
  readonly contentContext: RuleContext;
}
export interface DesignDNA {
  readonly version: string;
  readonly seed: string | number;
  readonly cards: Readonly<Partial<Record<CardType, string>>>;
}
export interface ResolvedDNA {
  readonly dna: DesignDNA;
  readonly parameters: Readonly<Partial<Record<CardType, Readonly<Record<string, RuleValue>>>>>;
}
export interface GenerationResult {
  readonly dna: DesignDNA | null;
  readonly diagnostics: readonly Diagnostic[];
}
