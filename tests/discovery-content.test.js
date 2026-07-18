import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

describe('visible discovery content', () => {
  it('explains the product and its responsible scope in crawlable markup', () => {
    const componentPath = resolve(root, 'src/components/DiscoveryContent.jsx');
    expect(existsSync(componentPath)).toBe(true);
    const source = readFileSync(componentPath, 'utf8');

    expect(source).toContain('How AskGod works');
    expect(source).toContain('Bhagavad Gita');
    expect(source).toContain('not a substitute for medical, legal, or financial advice');
    expect(source).toContain('<details');
  });

  it('renders the section only on the empty home view', () => {
    const app = readFileSync(resolve(root, 'src/App.jsx'), 'utf8');
    expect(app).toContain("import DiscoveryContent from './components/DiscoveryContent'");
    expect(app).toContain('<DiscoveryContent />');
  });
});
