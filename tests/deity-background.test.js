import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

describe('rotating deity background', () => {
  it('defines five optimized deity assets and renders them only on the empty home state', () => {
    const source = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
    for (const deity of ['krishna', 'shiva', 'rama', 'ganesha', 'durga']) {
      expect(source).toContain(`/assets/deities/${deity}.webp`);
      expect(fs.existsSync(path.join(root, `public/assets/deities/${deity}.webp`))).toBe(true);
    }
    expect(source).toContain("currentView === 'home' && !result && !loading");
    expect(source).toContain('className="deity-background"');
    expect(source).toContain('aria-hidden="true"');
  });

  it('rotates every ten seconds but stays static for reduced-motion users', () => {
    const source = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
    expect(source).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(source).toContain('10_000');
    expect(source).toContain('clearInterval');
  });

  it('keeps the imagery decorative, barely visible, responsive, and motion-safe', () => {
    const css = fs.readFileSync(path.join(root, 'src/App.css'), 'utf8');
    expect(css).toContain('.deity-background');
    expect(css).toContain('pointer-events: none');
    expect(css).toMatch(/\.deity-background-image\.active\s*\{[^}]*opacity:\s*0\.0[4-6]/s);
    expect(css).toMatch(/@media \(max-width: 800px\)[\s\S]*\.deity-background-image/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.deity-background-image/);
  });
});
