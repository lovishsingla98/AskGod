import { describe, expect, it } from 'vitest';
import { onRequestPost } from '../functions/api/route.js';

const request = (body, headers = {}) => new Request('https://askgod.pages.dev/api/route', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://askgod.pages.dev', ...headers },
  body: JSON.stringify(body)
});

describe('Cloudflare semantic reranker boundary', () => {
  it('rejects cross-origin and oversized requests before model access', async () => {
    const foreign = request({}, { Origin: 'https://example.com' });
    expect((await onRequestPost({ request: foreign, env: {} })).status).toBe(403);
    const oversized = request({}, { 'Content-Length': '32769' });
    expect((await onRequestPost({ request: oversized, env: {} })).status).toBe(413);
  });

  it('fails closed without both secret and rate-limit binding', async () => {
    expect((await onRequestPost({ request: request({}), env: { GEMINI_API_KEY: 'server-secret' } })).status).toBe(503);
  });

  it('enforces bounded candidate fields before calling the model', async () => {
    const env = { GEMINI_API_KEY: 'server-secret', AI_RATE_LIMITER: { limit: async () => ({ success: true }) } };
    const response = await onRequestPost({ request: request({ question: 'Help', candidates: [{ bookId: 'x'.repeat(81) }] }), env });
    expect(response.status).toBe(400);
  });
});
