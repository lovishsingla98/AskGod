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
  if (contentLength > 32_768) return json({ error: 'Request too large' }, 413);
  if (!env.GEMINI_API_KEY || !env.AI_RATE_LIMITER) return json({ error: 'Semantic reranker is not configured' }, 503);

  const clientAddress = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rate = await env.AI_RATE_LIMITER.limit({ key: clientAddress });
  if (!rate.success) return json({ error: 'Rate limit exceeded' }, 429);

  let body;
  try {
    body = await readBoundedJson(request, 32_768);
  } catch (error) {
    if (error.message === 'TOO_LARGE') return json({ error: 'Request too large' }, 413);
    if (error.message === 'CONTENT_TYPE') return json({ error: 'Content-Type must be application/json' }, 415);
    return json({ error: 'Invalid JSON' }, 400);
  }
  const question = body?.question;
  const candidates = body?.candidates;
  if (!boundedString(question, 1000) || !Array.isArray(candidates) || candidates.length < 1 || candidates.length > 12) {
    return json({ error: 'Invalid question or candidate count' }, 400);
  }
  const validCandidates = candidates.every(candidate =>
    boundedString(candidate.bookId, 80) && boundedString(candidate.chapterId, 80) &&
    boundedString(candidate.verseId, 160) && boundedString(candidate.citation, 80) &&
    boundedString(candidate.title, 240) && boundedString(candidate.text, 1600)
  );
  if (!validCandidates) return json({ error: 'Invalid candidate schema' }, 400);

  const allowed = new Set(candidates.map(item => `${item.bookId}|${item.chapterId}|${item.verseId}`));
  const prompt = `Select the single passage that most directly and compassionately addresses the question. Use only the supplied candidates. Return JSON with bookId, chapterId, verseId, and a one-sentence routingReason.\n\nQuestion: ${question.trim()}\n\nCandidates:\n${candidates.map(item => JSON.stringify(item)).join('\n')}`;
  try {
    const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!upstream.ok) return json({ error: 'Semantic reranker unavailable' }, 502);
    const payload = await upstream.json();
    const selected = JSON.parse(payload.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
    if (!allowed.has(`${selected.bookId}|${selected.chapterId}|${selected.verseId}`) || !boundedString(selected.routingReason, 400)) {
      return json({ error: 'Invalid reranker selection' }, 422);
    }
    return json({ bookId: selected.bookId, chapterId: selected.chapterId, verseId: selected.verseId, routingReason: selected.routingReason });
  } catch {
    return json({ error: 'Semantic reranker failed' }, 502);
  }
}

export function onRequest() {
  return json({ error: 'Method not allowed' }, 405);
}
