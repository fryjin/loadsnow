import { BASE_CANVAS } from '@loadsnow/design-domain';
import type { CanvasSpec, ContentDocument, ContentProfile } from '@loadsnow/design-domain';

export const PROFILE_RULES = {
  latin: { title: [14, 35, 70], body: [80, 240] },
  cjk: { title: [7, 18, 35], body: [40, 120] },
  titleScore: { short: 0, medium: 1, long: 2, extreme: 3 },
  bodyScore: { none: 0, short: 1, medium: 3, long: 5 },
  density: { lowMax: 3, mediumMax: 8, imageScore: 1 },
  aspect: { tallMax: 0.5, portraitMax: 0.9, squareMax: 1.1, landscapeMax: 2 },
} as const;

/** Uses semantic text and supplied image metadata only; never reads image sources. */
export function profileContent(content: ContentDocument, canvas: CanvasSpec): ContentProfile {
  const language = content.language ?? 'unknown';
  const thresholds = /^(ja|zh|ko)(-|$)/i.test(language) ? PROFILE_RULES.cjk : PROFILE_RULES.latin;
  const roleText = (role: 'TITLE' | 'BODY') => content.elements
    .flatMap(element => element.type === 'text' && element.role === role && element.text.trim() ? [element.text.trim()] : []).join(' ');
  const titleCount = Array.from(roleText('TITLE')).length;
  const bodyCount = Array.from(roleText('BODY')).length;
  const titleLength = titleCount <= thresholds.title[0] ? 'short' : titleCount <= thresholds.title[1] ? 'medium'
    : titleCount <= thresholds.title[2] ? 'long' : 'extreme';
  const bodyLength = bodyCount === 0 ? 'none' : bodyCount <= thresholds.body[0] ? 'short'
    : bodyCount <= thresholds.body[1] ? 'medium' : 'long';
  const images = content.elements.filter(element => element.type === 'image' && element.role !== 'LOGO');
  const image = images.find(element => element.role === 'IMAGE_PRIMARY') ?? images[0];
  let imageAspect: ContentProfile['imageAspect'] = 'none';
  if (image?.type === 'image') {
    const ratio = image.width / image.height;
    const bounds = PROFILE_RULES.aspect;
    imageAspect = ratio <= bounds.tallMax ? 'tall' : ratio < bounds.portraitMax ? 'portrait'
      : ratio <= bounds.squareMax ? 'square' : ratio < bounds.landscapeMax ? 'landscape' : 'wide';
  }
  const elementCount = content.elements.filter(element => element.type === 'image' || element.text.trim()).length;
  const score = elementCount + PROFILE_RULES.titleScore[titleLength] + PROFILE_RULES.bodyScore[bodyLength]
    + (image ? PROFILE_RULES.density.imageScore : 0);
  const densityScore = score * (BASE_CANVAS.width * BASE_CANVAS.height) / (canvas.width * canvas.height);
  const contentDensity = densityScore <= PROFILE_RULES.density.lowMax ? 'low'
    : densityScore <= PROFILE_RULES.density.mediumMax ? 'medium' : 'high';
  return { language, hasImage: Boolean(image), hasBody: bodyCount > 0, titleLength, bodyLength, contentDensity, imageAspect, densityScore };
}
