import type { CanvasSpec, CardDefinition, CardPack, CardType, ContentDocument, Diagnostic, RuleValue } from './index';

export type Seed = string | number;
export interface CardRef { readonly id: string; readonly version: string }
export interface PackRef { readonly id: string; readonly version: string }
export interface DesignSeeds extends Readonly<Record<CardType, Seed>> { readonly global: Seed }
export type ResolvedParameters = Readonly<Record<string, RuleValue>>;
export interface DesignDNA {
  readonly version: string;
  readonly cards: {
    readonly layout: CardRef;
    readonly composition: CardRef;
    readonly typography: CardRef;
    readonly image: CardRef | null;
    readonly palette: CardRef;
    readonly details: readonly CardRef[];
    readonly wild: CardRef | null;
  };
  readonly parameters: {
    readonly layout: ResolvedParameters;
    readonly composition: ResolvedParameters;
    readonly typography: ResolvedParameters;
    readonly image: ResolvedParameters | null;
    readonly palette: ResolvedParameters;
    readonly details: readonly ResolvedParameters[];
    readonly wild: ResolvedParameters | null;
  };
  readonly seeds: DesignSeeds;
  readonly engineVersion: string;
  readonly cardPackVersion: string;
  readonly cardPacks: readonly PackRef[];
}
export type ResolvedDNA = DesignDNA;
export type GenerationMode = 'blind' | 'guided' | 'production';
export type VariationPolicy = 'new_direction' | 'module_reroll' | 'local_variation' | 'high_novelty' | 'preserve_dna';
export type CardSelection = string | CardRef;
export interface ForcedCardSelection {
  readonly layout: CardSelection;
  readonly composition: CardSelection;
  readonly typography: CardSelection;
  readonly image: CardSelection | null;
  readonly palette: CardSelection;
  readonly detail: readonly CardSelection[];
  readonly wild: CardSelection | null;
}
export type GenerationLocks = Readonly<Partial<Record<CardType, boolean>>>;
export interface GenerationOptions { readonly debug?: boolean }
export interface GenerationRequest {
  readonly seed: Seed;
  readonly content: ContentDocument;
  readonly canvas: CanvasSpec;
  readonly mode: GenerationMode;
  readonly variationPolicy: VariationPolicy;
  readonly enabledPackIds: readonly string[];
  readonly forcedCards?: Partial<ForcedCardSelection>;
  readonly locks?: GenerationLocks;
  readonly currentDNA?: DesignDNA;
  readonly options?: GenerationOptions;
}
export type ContentLanguage = string;
export interface ContentProfile {
  readonly language: ContentLanguage;
  readonly hasImage: boolean;
  readonly hasBody: boolean;
  readonly titleLength: 'short' | 'medium' | 'long' | 'extreme';
  readonly bodyLength: 'none' | 'short' | 'medium' | 'long';
  readonly contentDensity: 'low' | 'medium' | 'high';
  readonly imageAspect: 'none' | 'portrait' | 'landscape' | 'square' | 'wide' | 'tall';
  readonly densityScore: number;
}
export interface GenerationContext { readonly request: GenerationRequest; readonly contentProfile: ContentProfile }
export interface CompatibilityPairRule { readonly a: string; readonly b: string; readonly multiplier: number }
export interface CompatibilityTagRule { readonly tagA: string; readonly tagB: string; readonly multiplier: number }
export interface CompatibilityData {
  readonly pairs: readonly CompatibilityPairRule[];
  readonly tags: readonly CompatibilityTagRule[];
}
export interface GenerationLibrary { readonly packs: readonly CardPack[]; readonly compatibility: CompatibilityData }
export interface CompatibilityEffect {
  readonly kind: 'pair' | 'tag';
  readonly ruleIndex: number;
  readonly selectedCardId: string;
  readonly multiplier: number;
}
export type SelectedCards = Readonly<Partial<Record<CardType, readonly CardDefinition[]>>>;
export interface PoolEntry {
  readonly card: CardDefinition;
  readonly pack: PackRef;
  readonly baseWeight: number;
  readonly contextWeight: number;
  readonly compatibilityWeight: number;
  readonly finalWeight: number;
  readonly parameterOverrides: ResolvedParameters;
  readonly matchedRuleIds: readonly string[];
  readonly compatibilityEffects: readonly CompatibilityEffect[];
}
export interface PoolExclusion { readonly cardId: string; readonly reason: 'status' | 'pack' | 'eligibility' | 'compatibility' | 'weight' | 'selected' }
export interface CardPool {
  readonly type: CardType;
  readonly eligible: readonly PoolEntry[];
  readonly excluded: readonly PoolExclusion[];
  readonly diagnostics: readonly Diagnostic[];
}
export interface GenerationDebug { readonly pools: readonly CardPool[] }
export type GenerationErrorCode =
  | 'INVALID_REQUEST' | 'NO_ELIGIBLE_LAYOUT' | 'NO_ELIGIBLE_CARD'
  | 'FORCED_CARD_NOT_FOUND' | 'FORCED_CARD_INELIGIBLE' | 'LOCKED_CARD_NOT_FOUND'
  | 'LOCKED_CARD_INELIGIBLE' | 'UNSUPPORTED_MODE' | 'UNSUPPORTED_VARIATION_POLICY'
  | 'INVALID_PARAMETER_SCHEMA';
export interface GenerationError {
  readonly code: GenerationErrorCode;
  readonly message: string;
  readonly module?: CardType;
  readonly cardId?: string;
}
export type GenerationResult =
  | { readonly status: 'success'; readonly dna: DesignDNA; readonly context: GenerationContext; readonly diagnostics: readonly Diagnostic[]; readonly debug?: GenerationDebug }
  | { readonly status: 'error'; readonly error: GenerationError; readonly diagnostics: readonly Diagnostic[] };
