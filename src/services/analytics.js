import posthog from 'posthog-js';

const EVENT_PROPERTIES = Object.freeze({
  question_submitted: ['input_length', 'source'],
  guidance_received: ['book_id', 'chapter_id', 'provider', 'has_hindi'],
  guidance_failed: ['stage', 'error_code'],
  library_viewed: [],
  chapter_opened: ['book_id', 'chapter_id', 'source'],
  language_changed: ['book_id', 'chapter_id', 'language', 'surface'],
  outbound_source_clicked: ['book_id', 'chapter_id', 'destination'],
});

const sanitize = value => {
  if (typeof value === 'string') return value.trim().slice(0, 80);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  return undefined;
};

export function captureProductEvent(name, properties = {}, client = posthog) {
  const allowed = EVENT_PROPERTIES[name];
  if (!allowed || typeof client?.capture !== 'function') return;
  if (client === posthog && !posthog.__loaded) return;

  const safeProperties = {};
  for (const key of allowed) {
    const value = sanitize(properties[key]);
    if (value !== undefined && value !== '') safeProperties[key] = value;
  }
  client.capture(name, safeProperties);
}
