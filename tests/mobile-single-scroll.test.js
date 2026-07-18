import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('mobile reader scrolling', () => {
  it('gives vertical scrolling to the document instead of either book page', () => {
    const css = fs.readFileSync(path.resolve(import.meta.dirname, '../src/App.css'), 'utf8');
    const mobileReaderRule = css.match(
      /@media \(max-width: 800px\)[\s\S]*?\.inside-left \.parchment-content,\s*\.inside-right \.parchment-content \{([\s\S]*?)\}/,
    );

    expect(mobileReaderRule).not.toBeNull();
    expect(mobileReaderRule[1]).toMatch(/height:\s*auto/);
    expect(mobileReaderRule[1]).toMatch(/overflow-y:\s*visible/);
    expect(mobileReaderRule[1]).toMatch(/touch-action:\s*pan-y/);
  });

  it('does not run desktop page-scroll synchronization on mobile', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, '../src/App.jsx'), 'utf8');

    expect(source).toContain("window.matchMedia('(max-width: 800px)').matches");
    expect(source).toMatch(/handleLeftScroll[\s\S]*?isMobileReader\(\)[\s\S]*?return/);
    expect(source).toMatch(/handleRightScroll[\s\S]*?isMobileReader\(\)[\s\S]*?return/);
  });
});
