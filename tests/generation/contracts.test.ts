import { expect, expectTypeOf, it } from 'vitest';
import type { CardRef, DesignDNA, GenerationResult, ResolvedParameters } from '../../packages/design-domain/src/index';
import { generate, isDesignDNA } from '../../packages/design-generation/src/index';
import { library, request } from './fixtures';

it('freezes versioned references, module cardinality and discriminated results', () => {
  const result = generate(request(), library());
  expect(result.status).toBe('success');
  if (result.status !== 'success') throw new Error('Expected DNA');
  expectTypeOf(result.dna).toEqualTypeOf<DesignDNA>();
  expectTypeOf(result.dna.cards.layout).toEqualTypeOf<CardRef>();
  expectTypeOf(result.dna.cards.details).toEqualTypeOf<readonly CardRef[]>();
  expectTypeOf(result.dna.cards.image).toEqualTypeOf<CardRef | null>();
  expectTypeOf(result.dna.cards.wild).toEqualTypeOf<CardRef | null>();
  expectTypeOf(result.dna.parameters.details).toEqualTypeOf<readonly ResolvedParameters[]>();
  expectTypeOf<Extract<GenerationResult, { status: 'error' }>>().not.toHaveProperty('dna');
  expect(isDesignDNA(result.dna)).toBe(true);
  expect(isDesignDNA({ ...result.dna, cards: { ...result.dna.cards, layout: 'layout-a' } })).toBe(false);
  expect(isDesignDNA({ ...result.dna, cards: { ...result.dna.cards, details: null } })).toBe(false);
});
