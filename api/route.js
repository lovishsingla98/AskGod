const json = (response, status, body) => response.status(status).json(body);

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(response, 503, { error: 'Semantic reranker is not configured' });
  const question = String(request.body?.question || '').trim().slice(0, 1000);
  const candidates = Array.isArray(request.body?.candidates) ? request.body.candidates.slice(0, 12) : [];
  if (!question || !candidates.length) return json(response, 400, { error: 'Question and candidates are required' });
  const allowed = new Set(candidates.map(item => `${item.bookId}|${item.chapterId}|${item.verseId}`));
  const prompt = `Select the single passage that most directly and compassionately addresses the question. Use only the supplied candidates. Return JSON with bookId, chapterId, verseId, and a one-sentence routingReason.\n\nQuestion: ${question}\n\nCandidates:\n${candidates.map(item => JSON.stringify({ bookId: item.bookId, chapterId: item.chapterId, verseId: item.verseId, citation: item.citation, title: item.title, text: item.text })).join('\n')}`;
  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!upstream.ok) return json(response, 502, { error: 'Semantic reranker unavailable' });
    const payload = await upstream.json();
    const selected = JSON.parse(payload.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
    if (!allowed.has(`${selected.bookId}|${selected.chapterId}|${selected.verseId}`)) return json(response, 422, { error: 'Invalid reranker selection' });
    return json(response, 200, selected);
  } catch {
    return json(response, 502, { error: 'Semantic reranker failed' });
  }
}
