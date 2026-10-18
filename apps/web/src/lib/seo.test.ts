import { describe, it, expect } from 'vitest';
import {
  configuredOrigin,
  pageMeta,
  publicPages,
  siteOrigin,
  structuredData,
} from './seo';
describe('public indexing policy', () => {
  it('does not invent a production domain', () => {
    expect(configuredOrigin({})).toBe('');
    expect(
      configuredOrigin({
        VERCEL_ENV: 'preview',
        SITE_URL: 'https://typespeed.example',
      }),
    ).toBe('');
    expect(
      configuredOrigin({
        VERCEL_ENV: 'production',
        VERCEL_PROJECT_PRODUCTION_URL: 'actual-project.vercel.app',
      }),
    ).toBe('https://actual-project.vercel.app');
  });
  it('rejects paths, credentials and non-public canonical origins', () => {
    for (const value of [
      'http://example.com',
      'https://localhost',
      'https://example.com/a',
      'https://u:p@example.com',
    ])
      expect(() => siteOrigin(value)).toThrow();
  });
  it('indexes only public pages and never adds fabricated ratings', () => {
    expect(pageMeta('/room/ABCDEF').index).toBe(false);
    expect(pageMeta('/analytics').index).toBe(false);
    expect(pageMeta('/unknown').index).toBe(false);
    expect(new Set(Object.values(publicPages).map((p) => p.title)).size).toBe(
      Object.keys(publicPages).length,
    );
    expect(
      JSON.stringify(structuredData('/', 'https://example.com')),
    ).not.toContain('aggregateRating');
  });
});
