import { loadLibrary } from '@loadsnow/card-library';
import type { GenerationLibrary, GenerationRequest, GenerationResult } from '@loadsnow/design-domain';
import { profileContent } from './profile';
import { validateRequest } from './request';
import { sampleCards } from './sample';
import { createModuleSeeds, DNA_VERSION, ENGINE_VERSION } from './seeds';

export function generate(request: GenerationRequest, library: GenerationLibrary): GenerationResult {
  const error = validateRequest(request);
  if (error) return { status: 'error', error, diagnostics: [{ code: error.code, level: 'error', message: error.message }] };
  const loaded = loadLibrary(library);
  if (!loaded.library) return { status: 'error', error: { code: 'INVALID_REQUEST', message: 'The supplied Card Library is invalid.' }, diagnostics: loaded.diagnostics };
  const contentProfile = profileContent(request.content, request.canvas);
  const seeds = createModuleSeeds(request.seed);
  const result = sampleCards(request, loaded.library, contentProfile, seeds);
  if (result.status === 'error') return result;
  const cardPacks = loaded.library.packs.filter(pack => request.enabledPackIds.includes(pack.id))
    .map(pack => ({ id: pack.id, version: pack.version })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return {
    status: 'success',
    dna: { version: DNA_VERSION, cards: result.cards, parameters: result.parameters, seeds, engineVersion: ENGINE_VERSION,
      cardPackVersion: cardPacks.length === 1 ? cardPacks[0]!.version : cardPacks.map(pack => pack.id + '@' + pack.version).join(','),
      cardPacks },
    context: { request, contentProfile }, diagnostics: result.diagnostics,
    ...(request.options?.debug ? { debug: { pools: result.pools } } : {}),
  };
}

/** Bind library data at the application boundary for the generate(request) API. */
export function createGenerator(library: GenerationLibrary): (request: GenerationRequest) => GenerationResult {
  return request => generate(request, library);
}
