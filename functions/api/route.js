import { rerankWithGemini, rerankWithOpenAI } from './providers.js';

const MAXIMUM_BODY_BYTES = 98_304;
const MAXIMUM_CANDIDATES = 40;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

const boundedString = (value, maximum) => typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;

async function readBoundedJson(request, maximumBytes) {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new Error('CONTENT_TYPE');
  if (!request.body) throw new Error('INVALID_JSON');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximumBytes) {
      await reader.cancel();
      throw new Error('TOO_LARGE');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('INVALID_JSON');
  }
}

export async function onRequestPost({ request, env }) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== requestUrl.origin) return json({ error: 'Origin not allowed' }, 403);
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAXIMUM_BODY_BYTES) return json({ error: 'Request too large' }, 413);
  if ((!env.OPENAI_API_KEY && !env.GEMINI_API_KEY) || !env.AI_RATE_LIMITER) return json({ error: 'Semantic reranker is not configured' }, 503);

  const clientAddress = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rate = await env.AI_RATE_LIMITER.limit({ key: clientAddress });
  if (!rate.success) return json({ error: 'Rate limit exceeded' }, 429);

  let body;
  try {
    body = await readBoundedJson(request, MAXIMUM_BODY_BYTES);
  } catch (error) {
    if (error.message === 'TOO_LARGE') return json({ error: 'Request too large' }, 413);
    if (error.message === 'CONTENT_TYPE') return json({ error: 'Content-Type must be application/json' }, 415);
    return json({ error: 'Invalid JSON' }, 400);
  }
  const question = body?.question;
  const candidates = body?.candidates;
  if (!boundedString(question, 1000) || !Array.isArray(candidates) || candidates.length < 1 || candidates.length > MAXIMUM_CANDIDATES) {
    return json({ error: 'Invalid question or candidate count' }, 400);
  }
  const validCandidates = candidates.every(candidate =>
    boundedString(candidate.bookId, 80) && boundedString(candidate.chapterId, 80) &&
    boundedString(candidate.verseId, 160) && boundedString(candidate.citation, 80) &&
    boundedString(candidate.title, 240) && boundedString(candidate.translation || candidate.text, 1600) &&
    (!candidate.summary || boundedString(candidate.summary, 1200))
  );
  if (!validCandidates) return json({ error: 'Invalid candidate schema' }, 400);

  const allowed = new Set(candidates.map(item => `${item.bookId}|${item.chapterId}|${item.verseId}`));
  const prompt = `Select the single passage that most directly and compassionately addresses the user's complete concern, not merely one overlapping word. Prefer practical contextual relevance. Use only the supplied candidates. Return bookId, chapterId, verseId, and a one-sentence routingReason.\n\nQuestion: ${question.trim()}\n\nCandidates:\n${candidates.map(item => JSON.stringify(item)).join('\n')}`;
  const providers = [];
  if (env.OPENAI_API_KEY) providers.push(() => rerankWithOpenAI({ apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL, prompt, signal: AbortSignal.timeout(12_000) }));
  if (env.GEMINI_API_KEY) providers.push(() => rerankWithGemini({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL, prompt, signal: AbortSignal.timeout(12_000) }));
  let invalidSelection = false;
  for (const rerank of providers) {
    try {
      const selected = await rerank();
      if (!allowed.has(`${selected.bookId}|${selected.chapterId}|${selected.verseId}`) || !boundedString(selected.routingReason, 400)) {
        invalidSelection = true;
        continue;
      }
      return json({ bookId: selected.bookId, chapterId: selected.chapterId, verseId: selected.verseId, routingReason: selected.routingReason });
    } catch {
      // Try the next configured provider; the client retains a deterministic local fallback.
    }
  }
  return json({ error: invalidSelection ? 'Invalid reranker selection' : 'Semantic reranker failed' }, invalidSelection ? 422 : 502);
}

export function onRequest() {
  return json({ error: 'Method not allowed' }, 405);
}
