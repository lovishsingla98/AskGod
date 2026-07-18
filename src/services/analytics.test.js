import { describe, expect, it, vi } from 'vitest';
import { captureProductEvent } from './analytics.js';

describe('product analytics', () => {
  it('captures only approved events and properties', () => {
    const client = { capture: vi.fn() };

    captureProductEvent('guidance_received', {
      book_id: 'gita', chapter_id: '2', provider: 'openai', has_hindi: true,
      question: 'private question', verse_text: 'private verse', unexpected: 'drop me',
    }, client);

    expect(client.capture).toHaveBeenCalledWith('guidance_received', {
      book_id: 'gita', chapter_id: '2', provider: 'openai', has_hindi: true,
    });
  });

  it('bounds string properties and ignores unknown events', () => {
    const client = { capture: vi.fn() };
    captureProductEvent('guidance_failed', { stage: 'routing', error_code: 'x'.repeat(500) }, client);
    captureProductEvent('raw_question_saved', { question: 'secret' }, client);

    expect(client.capture).toHaveBeenCalledTimes(1);
    expect(client.capture.mock.calls[0][1].error_code).toHaveLength(80);
  });

  it('supports the complete product journey taxonomy', () => {
    const client = { capture: vi.fn() };
    for (const event of [
      'question_submitted', 'guidance_received', 'guidance_failed', 'library_viewed',
      'chapter_opened', 'language_changed', 'outbound_source_clicked',
    ]) captureProductEvent(event, {}, client);

    expect(client.capture.mock.calls.map(([event]) => event)).toHaveLength(7);
  });
});
