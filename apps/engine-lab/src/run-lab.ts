import { loadLibrary } from '@loadsnow/card-library';
import { BASE_CANVAS } from '@loadsnow/design-domain';
import type { CardDefinition, ContentDocument, ContentElement, ContentProfile, GenerationResult } from '@loadsnow/design-domain';
import { generate, isContentDocument, profileContent } from '@loadsnow/design-generation';
import { prototypeLibraryData } from '../../../data/prototype-library';
import low from '../../../data/test-content/case-low-no-image.json';
import medium from '../../../data/test-content/case-medium-image.json';
import high from '../../../data/test-content/case-high-image.json';
import longTitle from '../../../data/test-content/case-long-title.json';
import cjk from '../../../data/test-content/case-cjk.json';

export const CONTENT_CASES = [low, medium, high, longTitle, cjk].map(value => {
  if (!isContentDocument(value)) throw new Error(`Invalid content fixture: ${value.id}`);
  return value;
});
export interface LabInputs {
  readonly seed: string;
  readonly caseId: string;
  readonly hasImage: boolean;
  readonly contentDensity: 'auto' | 'low' | 'medium' | 'high';
  readonly forceLayout: string;
  readonly forceTypography: string;
  readonly forcePalette: string;
}
export const DEFAULT_LAB_INPUTS: LabInputs = {
  seed: '839217', caseId: 'case-medium-image', hasImage: true, contentDensity: 'auto',
  forceLayout: '', forceTypography: '', forcePalette: '',
};
export function nextSeed(seed: string): string {
  return /^\d+$/.test(seed) ? String(BigInt(seed) + 1n) : `${seed}:next`;
}

/** Controls construct test content; the Core always computes the real profile. */
function caseContent(base: ContentDocument, inputs: LabInputs): ContentDocument {
  let elements = base.elements.filter(element => inputs.hasImage || element.type !== 'image' || element.role === 'LOGO');
  if (inputs.hasImage && !elements.some(element => element.type === 'image' && element.role !== 'LOGO')) {
    elements = [...elements, { id: 'lab-image', type: 'image', role: 'IMAGE_PRIMARY', source: 'fixture:portrait', alt: 'Portrait fixture', width: 800, height: 1200 }];
  }
  if (inputs.contentDensity !== 'auto') {
    const isCjk = /^(ja|zh|ko)(-|$)/i.test(base.language ?? '');
    const title = elements.find(element => element.role === 'TITLE' && element.type === 'text');
    const shortTitle = Array.from(title?.type === 'text' ? title.text : 'NEW FORMS').slice(0, isCjk ? 7 : 14).join('');
    const texts: ContentElement[] = [{ id: 'lab-title', role: 'TITLE', type: 'text', text: shortTitle }];
    if (inputs.contentDensity !== 'low') {
      texts.push(
        { id: 'lab-subtitle', role: 'SUBTITLE', type: 'text', text: isCjk ? '現代デザイン展' : 'Contemporary Design Exhibition' },
        { id: 'lab-body', role: 'BODY', type: 'text', text: inputs.contentDensity === 'high' ? (isCjk ? '展'.repeat(150) : 'Exhibition '.repeat(30)) : (isCjk ? '短い本文' : 'Short body copy') },
        { id: 'lab-date', role: 'DATE', type: 'text', text: 'October 12–18' },
        { id: 'lab-location', role: 'LOCATION', type: 'text', text: 'Seoul' },
      );
    }
    elements = [...texts, ...elements.filter(element => element.type === 'image')];
  }
  return { ...base, elements };
}

export function runLab(inputs: LabInputs, data: unknown = prototypeLibraryData): {
  profile: ContentProfile | null; result: GenerationResult; cards: readonly CardDefinition[];
} {
  const loaded = loadLibrary(data);
  if (!loaded.library) return {
    cards: [], profile: null,
    result: { status: 'error', error: { code: 'INVALID_REQUEST', message: 'The card library is invalid.' }, diagnostics: loaded.diagnostics },
  };
  const cards = loaded.library.packs.flatMap(pack => pack.cards);
  const base = CONTENT_CASES.find(content => content.id === inputs.caseId);
  if (!base) return {
    cards, profile: null,
    result: { status: 'error', error: { code: 'INVALID_REQUEST', message: 'Unknown content case.' }, diagnostics: [{ code: 'INVALID_REQUEST', level: 'error', message: 'Unknown content case.' }] },
  };
  const content = caseContent(base, inputs);
  const result = generate({
    seed: inputs.seed, content, canvas: BASE_CANVAS, mode: 'blind', variationPolicy: 'new_direction',
    enabledPackIds: ['poster-core-prototype'], options: { debug: true },
    forcedCards: {
      ...(inputs.forceLayout ? { layout: inputs.forceLayout } : {}),
      ...(inputs.forceTypography ? { typography: inputs.forceTypography } : {}),
      ...(inputs.forcePalette ? { palette: inputs.forcePalette } : {}),
    },
  }, loaded.library);
  return { cards, profile: profileContent(content, BASE_CANVAS), result };
}
