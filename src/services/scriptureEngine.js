import { validateRoute } from './corpusSchema.js';

let catalogPromise;
let indexPromise;

const STOP_WORDS = new Set('a an and are as at be by can do for from how i in is it me my of on or should that the this to what when where which who why with you your'.split(' '));
const EXPANSIONS = {
  anxious: ['anxiety', 'fear', 'worry', 'mind'], anxiety: ['fear', 'worry', 'peace'], exam: ['work', 'action', 'results', 'duty'], exams: ['work', 'action', 'results', 'duty'],
  job: ['work', 'action', 'duty'], career: ['work', 'action', 'duty'], outcome: ['result', 'fruit'], outcomes: ['results', 'fruits'], grief: ['sorrow', 'death', 'loss'],
  sad: ['sorrow', 'grief'], purpose: ['self', 'truth', 'liberation'], god: ['lord', 'brahman', 'divine'], meditate: ['meditation', 'mind', 'yoga'],
  focus: ['concentration', 'mind', 'meditation'], anger: ['wrath', 'desire', 'mind'], attachment: ['desire', 'fruit'], conscious: ['consciousness', 'self'],
  consciousness: ['self', 'atman'], turiya: ['fourth', 'consciousness'], relatives: ['family', 'kinsmen', 'brothers'], family: ['kinsmen', 'relatives'],
  wonder: ['marvel', 'astonishing'], witness: ['observer', 'looks', 'self'], truth: ['true', 'real'], death: ['immortal', 'immortality', 'dying']
};

function stem(word) {
  return word.replace(/(?:ing|edly|edly|ed|ies|es|s)$/i, match => match === 'ies' ? 'y' : '');
}

function tokenize(value, expand = false) {
  const base = String(value || '').toLowerCase().normalize('NFKD').match(/[a-z0-9]+/g) || [];
  const tokens = base.filter(word => word.length > 1 && !STOP_WORDS.has(word)).map(stem);
  if (!expand) return tokens;
  return [...tokens, ...tokens.flatMap(token => (EXPANSIONS[token] || []).map(stem))];
}

export function rankScriptureDocuments(question, documents, limit = documents.length) {
  const queryTokens = tokenize(question, true);
  const querySet = new Set(queryTokens);
  const phrase = String(question).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const intentAnchors = [
    [/greatest wonder|what (?:is|can be) (?:more )?(?:wonderful|marvel)/, 'yaksha_prashna:313:104'],
    [/(?:exam|work|action).*(?:result|outcome|fruit)|(?:result|outcome).*(?:exam|work|action)/, 'gita:2:47'],
    [/two birds?.*(?:tree|same)|(?:tree|same).*two birds?/, 'mundaka_upanishad:3.1:1'],
    [/(?:fourth state|four states|turiya)/, 'mandukya_upanishad:1:7'],
    [/(?:family|relatives?|kinsmen).*(?:fight|against|hurt)|(?:fight|against).*(?:family|relatives?|kinsmen)/, 'gita:1:27'],
    [/(?:death|dying).*(?:grief|sorrow|loss)|(?:grief|sorrow|loss).*(?:death|dying)/, 'gita:2:20']
  ];
  const normalizedQuestion = String(question).toLowerCase();
  return documents.map(document => {
    const title = document.title.toLowerCase();
    const haystack = `${title} ${document.text}`.toLowerCase();
    let score = 0;
    for (const token of querySet) {
      if (haystack.includes(token)) score += 1 + Math.min(token.length, 10) / 10;
      if (title.includes(token)) score += 0.75;
    }
    if (phrase.length > 8 && haystack.includes(phrase)) score += 8;
    for (const [pattern, verseId] of intentAnchors) if (pattern.test(normalizedQuestion) && document.verseId === verseId) score += 40;
    return { ...document, score };
  }).sort((a, b) => b.score - a.score || a.verseId.localeCompare(b.verseId)).slice(0, limit);
}

export async function fetchCatalog() {
  catalogPromise ||= fetch('/data/catalog.json').then(response => {
    if (!response.ok) throw new Error('Failed to load the scripture catalog.');
    return response.json();
  });
  return catalogPromise;
}

export async function fetchSummaries() {
  const catalog = await fetchCatalog();
  return catalog.books.map(book => ({
    bookId: book.id, bookName: book.name, description: book.description,
    chapters: book.chapters.map(chapter => ({ id: chapter.id, name: chapter.title, parent: chapter.parent, summary: chapter.summary, path: chapter.path, verseCount: chapter.verseCount }))
  }));
}

export async function fetchChapter(bookId, chapterId, suppliedPath) {
  let chapterPath = suppliedPath;
  if (!chapterPath) {
    const catalog = await fetchCatalog();
    chapterPath = catalog.books.find(book => book.id === bookId)?.chapters.find(chapter => String(chapter.id) === String(chapterId))?.path;
  }
  if (!chapterPath) throw new Error(`Unknown chapter ${bookId}/${chapterId}.`);
  const response = await fetch(`/${chapterPath}`);
  if (!response.ok) throw new Error(`Failed to load ${bookId}, chapter ${chapterId}.`);
  return response.json();
}

async function fetchSearchIndex() {
  indexPromise ||= fetch('/data/search-index.json').then(response => {
    if (!response.ok) throw new Error('Failed to load the scripture search index.');
    return response.json();
  });
  return indexPromise;
}

export async function routeQuery(question) {
  const index = await fetchSearchIndex();
  const candidates = rankScriptureDocuments(question, index.documents, 12).map(({ score, ...candidate }) => ({ ...candidate, score }));
  if (!candidates.length) throw new Error('No scripture passage could be matched.');
  let route = candidates[0];
  try {
    const response = await fetch('/api/route', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, candidates })
    });
    if (response.ok) {
      const suggested = await response.json();
      const isCandidate = candidates.some(candidate =>
        candidate.bookId === suggested.bookId && candidate.chapterId === suggested.chapterId && candidate.verseId === suggested.verseId
      );
      if (isCandidate) route = suggested;
    }
  } catch {
    // The verified local ranker is the production offline fallback.
  }
  const chapter = await fetchChapter(route.bookId, route.chapterId);
  if (!validateRoute(route, candidates, chapter)) throw new Error('The selected passage failed corpus validation.');
  const selected = chapter.verses.find(verse => verse.id === route.verseId);
  return {
    ...route,
    citation: selected.citation,
    routingReason: route.routingReason || `${chapter.bookName} ${selected.citation} most directly matches the language and theme of your question.`,
    chapter
  };
}

export const getStoredApiKey = () => '';
export const setStoredApiKey = () => {};
export const translateVersesToHindi = async () => {};
