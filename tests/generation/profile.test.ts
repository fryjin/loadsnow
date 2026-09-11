import { describe, expect, it } from 'vitest';
import { BASE_CANVAS } from '../../packages/design-domain/src/index';
import type { ContentDocument } from '../../packages/design-domain/src/index';
import { profileContent } from '../../packages/design-generation/src/profile';

const content = (title: string, body = '', language?: string): ContentDocument => ({
  id: 'profile', ...(language ? { language } : {}), elements: [
    { id: 'title', type: 'text', role: 'TITLE', text: title },
    ...(body ? [{ id: 'body', type: 'text', role: 'BODY', text: body } as const] : []),
  ],
});
describe('Content Profiler', () => {
  it.each([[14, 'short'], [15, 'medium'], [35, 'medium'], [36, 'long'], [70, 'long'], [71, 'extreme']])(
    'classifies Latin title length %s as %s', (count, expected) => {
      expect(profileContent(content('A'.repeat(Number(count)), '', 'en'), BASE_CANVAS).titleLength).toBe(expected);
    });
  it('uses explicit CJK language thresholds and Unicode codepoints', () => {
    expect(profileContent(content('新しいデザインの形', '', 'ja'), BASE_CANVAS)).toMatchObject({ language: 'ja', titleLength: 'medium' });
    expect(profileContent(content('界'.repeat(19), '', 'zh-CN'), BASE_CANVAS).titleLength).toBe('long');
    expect(profileContent(content('🙂'.repeat(14)), BASE_CANVAS)).toMatchObject({ language: 'unknown', titleLength: 'short' });
  });
  it('classifies absent and long body and transparent density', () => {
    expect(profileContent(content('NEW FORMS'), BASE_CANVAS)).toMatchObject({
      hasBody: false, bodyLength: 'none', hasImage: false, imageAspect: 'none', contentDensity: 'low',
    });
    expect(profileContent(content('A'.repeat(80), 'B'.repeat(300)), BASE_CANVAS)).toMatchObject({
      hasBody: true, bodyLength: 'long', contentDensity: 'high',
    });
    expect(profileContent(content('Title', '   '), BASE_CANVAS).hasBody).toBe(false);
  });
  it.each([[800,1200,'portrait'],[1200,800,'landscape'],[800,800,'square'],[2000,800,'wide'],[800,2000,'tall']])(
    'uses image metadata %s x %s -> %s', (width, height, aspect) => {
      const data: ContentDocument = { ...content('Title'), elements: [
        ...content('Title').elements,
        { id: 'image', type: 'image', role: 'IMAGE_PRIMARY', source: 'never-read.jpg', alt: '', width: Number(width), height: Number(height) },
      ] };
      expect(profileContent(data, BASE_CANVAS)).toMatchObject({ hasImage: true, imageAspect: aspect });
    });
  it('does not treat a logo as the primary content image', () => {
    expect(profileContent({ id: 'logo', elements: [
      { id: 'logo', type: 'image', role: 'LOGO', source: 'logo', alt: '', width: 20, height: 20 },
    ] }, BASE_CANVAS).hasImage).toBe(false);
  });
  it('scales density score against the baseline canvas area', () => {
    const data = content('A'.repeat(40), 'B'.repeat(100));
    expect(profileContent(data, BASE_CANVAS).densityScore).toBe(7);
    expect(profileContent(data, { ...BASE_CANVAS, width: 540 }).densityScore).toBe(14);
  });
});
