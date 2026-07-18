import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('search discovery surface', () => {
  it('uses askgod.in as the canonical root with complete social metadata', () => {
    const html = read('index.html');

    expect(html).toContain('<link rel="canonical" href="https://askgod.in/"');
    expect(html).toContain('<meta name="description"');
    expect(html).toContain('<meta property="og:url" content="https://askgod.in/"');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image"');
    expect(html).toContain('application/ld+json');
  });

  it('publishes robots, llms, and sitemap discovery files', () => {
    expect(read('public/robots.txt')).toContain('Sitemap: https://askgod.in/sitemap-index.xml');
    expect(read('public/llms.txt')).toContain('# AskGod');
    expect(read('public/sitemap-index.xml')).toContain('https://askgod.in/sitemaps/pages.xml');
  });

  it('keeps raw corpus JSON out of search results', () => {
    const headers = read('public/_headers');
    expect(headers).toMatch(/\/data\/\*[\s\S]*X-Robots-Tag: noindex/);
  });

  it('defines a deterministic generator for book and chapter pages', () => {
    expect(existsSync(new URL('../scripts/seo/build-seo.mjs', import.meta.url))).toBe(true);
    const packageJson = JSON.parse(read('package.json'));
    expect(packageJson.scripts.build).toContain('scripts/seo/build-seo.mjs');
  });
});
