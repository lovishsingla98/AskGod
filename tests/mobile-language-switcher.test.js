import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('mobile chapter language switcher', () => {
  it('offers Sanskrit, English, and Hindi above the reader', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, '../src/App.jsx'), 'utf8');
    expect(source).toContain('mobile-reader-language');
    expect(source).toContain('Sanskrit');
    expect(source).toContain('English');
    expect(source).toContain('हिन्दी');
  });

  it('shows only the selected full-width page on mobile', () => {
    const css = fs.readFileSync(path.resolve(import.meta.dirname, '../src/App.css'), 'utf8');
    expect(css).toContain('.mobile-reader-language');
    expect(css).toMatch(/\.mobile-language-sanskrit[\s\S]*\.inside-right/);
    expect(css).toMatch(/\.mobile-language-english[\s\S]*\.inside-left/);
    expect(css).toMatch(/\.mobile-language-hindi[\s\S]*\.inside-left/);
  });
});
