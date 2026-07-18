const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['bookId', 'chapterId', 'verseId', 'routingReason'],
  properties: {
    bookId: { type: 'string' },
    chapterId: { type: 'string' },
    verseId: { type: 'string' },
    routingReason: { type: 'string' }
  }
};

const parseJson = value => JSON.parse(String(value || '').trim());

export async function rerankWithOpenAI({ apiKey, model = 'gpt-5.4-nano', prompt, signal }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      input: prompt,
      reasoning: { effort: 'low' },
      max_output_tokens: 300,
      text: { format: { type: 'json_schema', name: 'scripture_route', strict: true, schema: responseSchema } }
    }),
    signal
  });
  if (!response.ok) throw new Error(`OPENAI_${response.status}`);
  const payload = await response.json();
  const outputText = payload.output_text || payload.output
    ?.flatMap(item => item.content || [])
    .find(item => item.type === 'output_text')?.text;
  return parseJson(outputText);
}

export async function rerankWithGemini({ apiKey, model = 'gemini-2.5-flash', prompt, signal }) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
    }),
    signal
  });
  if (!response.ok) throw new Error(`GEMINI_${response.status}`);
  const payload = await response.json();
  return parseJson(payload.candidates?.[0]?.content?.parts?.[0]?.text);
}
