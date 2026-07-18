import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from '../functions/api/route.js';

const request = (body, headers = {}) => new Request('https://askgod.pages.dev/api/route', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://askgod.pages.dev', ...headers },
  body: JSON.stringify(body)
});

const candidate = (number = 1) => ({
  bookId: 'gita', chapterId: '2', verseId: `gita:2:${number}`, citation: `2.${number}`,
  title: 'Bhagavad Gita — Sankhya Yoga', translation: 'Act without attachment to results.', summary: 'Action, effort, and equanimity.'
});

const rateLimiter = { limit: async () => ({ success: true }) };

afterEach(() => vi.restoreAllMocks());

describe('Cloudflare semantic reranker boundary', () => {
  it('rejects cross-origin and oversized requests before model access', async () => {
    const foreign = request({}, { Origin: 'https://example.com' });
    expect((await onRequestPost({ request: foreign, env: {} })).status).toBe(403);
    const oversized = request({}, { 'Content-Length': '98305' });
    expect((await onRequestPost({ request: oversized, env: {} })).status).toBe(413);
  });

  it('fails closed without a provider secret', async () => {
    expect((await onRequestPost({ request: request({}), env: { AI_RATE_LIMITER: rateLimiter } })).status).toBe(503);
  });

  it('uses OpenAI without requiring a Pages-incompatible rate-limit binding', async () => {
    const selection = { bookId: 'gita', chapterId: '2', verseId: 'gita:2:1', routingReason: 'It directly addresses effort.' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      output: [{ content: [{ type: 'output_text', text: JSON.stringify(selection) }] }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const response = await onRequestPost({
      request: request({ question: 'How should I relate to success?', candidates: [candidate()] }, { 'CF-Connecting-IP': '203.0.113.8' }),
      env: { OPENAI_API_KEY: 'openai-secret' }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('X-AskGod-Reranker')).toBe('openai');
    expect(await response.json()).toMatchObject({ ...selection, provider: 'openai' });
  });

  it('enforces bounded candidate fields before calling the model', async () => {
    const env = { GEMINI_API_KEY: 'server-secret', AI_RATE_LIMITER: { limit: async () => ({ success: true }) } };
    const response = await onRequestPost({ request: request({ question: 'Help', candidates: [{ bookId: 'x'.repeat(81) }] }), env });
    expect(response.status).toBe(400);
  });

  it('bounds streamed bodies and requires JSON content type', async () => {
    const env = { GEMINI_API_KEY: 'server-secret', AI_RATE_LIMITER: { limit: async () => ({ success: true }) } };
    const streamed = new Request('https://askgod.pages.dev/api/route', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://askgod.pages.dev' }, body: JSON.stringify({ question: 'x'.repeat(99_000), candidates: [] })
    });
    streamed.headers.delete('Content-Length');
    expect((await onRequestPost({ request: streamed, env })).status).toBe(413);
    const plainText = new Request('https://askgod.pages.dev/api/route', {
      method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: 'https://askgod.pages.dev' }, body: '{}'
    });
    expect((await onRequestPost({ request: plainText, env })).status).toBe(415);
  });

  it('prefers OpenAI and accepts a diverse set of 40 candidates', async () => {
    const candidates = Array.from({ length: 40 }, (_, index) => candidate(index + 1));
    const selection = { bookId: 'gita', chapterId: '2', verseId: 'gita:2:1', routingReason: 'It directly addresses effort without attachment.' };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      output: [{ content: [{ type: 'output_text', text: JSON.stringify(selection) }] }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const response = await onRequestPost({
      request: request({ question: 'How should I relate to success?', candidates }),
      env: { OPENAI_API_KEY: 'openai-secret', GEMINI_API_KEY: 'gemini-secret', AI_RATE_LIMITER: rateLimiter }
    });
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/responses');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('gpt-5.4-nano');
    expect(response.headers.get('X-AskGod-Reranker')).toBe('openai');
    expect(await response.json()).toMatchObject({ ...selection, provider: 'openai' });
  });

  it('asks the reranker to cover the complete concern instead of favoring famous verses', async () => {
    const selection = { bookId: 'gita', chapterId: '2', verseId: 'gita:2:1', routingReason: 'It directly addresses the least-covered concern.' };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      output: [{ content: [{ type: 'output_text', text: JSON.stringify(selection) }] }]
    }), { status: 200 }));

    await onRequestPost({
      request: request({ question: 'I fear time is running out and I will never succeed.', candidates: [candidate()] }),
      env: { OPENAI_API_KEY: 'openai-secret', AI_RATE_LIMITER: rateLimiter }
    });

    const prompt = JSON.parse(fetchMock.mock.calls[0][1].body).input;
    expect(prompt).toContain('distinct concerns');
    expect(prompt).toContain('least-addressed concern');
    expect(prompt).toContain('famous');
  });

  it('falls back to Gemini when OpenAI is unavailable', async () => {
    const selection = { bookId: 'gita', chapterId: '2', verseId: 'gita:2:1', routingReason: 'It directly addresses effort.' };
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(selection) }] } }] }), { status: 200 }));
    const response = await onRequestPost({
      request: request({ question: 'Help with success', candidates: [candidate()] }),
      env: { OPENAI_API_KEY: 'openai-secret', GEMINI_API_KEY: 'gemini-secret', AI_RATE_LIMITER: rateLimiter }
    });
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('generativelanguage.googleapis.com');
    expect(response.headers.get('X-AskGod-Reranker')).toBe('gemini');
    expect((await response.json()).provider).toBe('gemini');
  });

  it('rejects more than 40 candidates', async () => {
    const response = await onRequestPost({
      request: request({ question: 'Help', candidates: Array.from({ length: 41 }, (_, index) => candidate(index + 1)) }),
      env: { OPENAI_API_KEY: 'openai-secret', AI_RATE_LIMITER: rateLimiter }
    });
    expect(response.status).toBe(400);
  });
});
