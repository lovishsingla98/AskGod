import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(import.meta.dirname, '../src/App.jsx'), 'utf8');

describe('analytics wiring', () => {
  it('tracks the complete guidance journey with the submitted question', () => {
    for (const event of ['question_submitted', 'guidance_received', 'guidance_failed']) {
      expect(source).toContain(`captureProductEvent('${event}'`);
    }
    expect(source).toMatch(/captureProductEvent\('question_submitted',[\s\S]*question_text:\s*activeQuery\.trim\(\)/);
  });

  it('tracks library, chapter, language, and source actions', () => {
    for (const event of ['library_viewed', 'chapter_opened', 'language_changed', 'outbound_source_clicked']) {
      expect(source).toContain(`captureProductEvent('${event}'`);
    }
  });
});
