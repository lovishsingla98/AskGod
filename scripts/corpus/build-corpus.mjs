import fs from 'node:fs/promises';
import path from 'node:path';
import Sanscript from '@indic-transliteration/sanscript';

const root = path.resolve(import.meta.dirname, '../..');
const ebookDir = path.join(root, 'data/legacy-ebooks');
const publishedEbookDir = path.join(root, 'public/data/ebooks');
const chapterRoot = path.join(root, 'public/data/chapters');
const summariesPath = path.join(root, 'public/data/summaries.json');
const sources = JSON.parse(await fs.readFile(path.join(root, 'data/sources.json'), 'utf8'));
const legacySummaries = JSON.parse(await fs.readFile(summariesPath, 'utf8'));
const legacyById = new Map(legacySummaries.map(book => [book.bookId, book]));

const clean = value => String(value ?? '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const deva = value => Sanscript.t(clean(value).replace(/[$&%]/g, ' '), 'iast', 'devanagari').replace(/\s+/g, ' ').trim();
const clip = (value, length = 260) => clean(value).length > length ? `${clean(value).slice(0, length).replace(/\s+\S*$/, '')}…` : clean(value);
const safeId = value => String(value).replace(/[^a-zA-Z0-9._-]/g, '-');

function passageThemes(verses) {
  const text = verses.map(verse => verse.translation).join(' ').toLowerCase();
  const vocabulary = {
    'action and duty': ['action', 'work', 'duty', 'karma'],
    'self-knowledge': ['self', 'atman', 'soul', 'brahman'],
    'devotion': ['devotion', 'worship', 'lord', 'god'],
    'mind and meditation': ['mind', 'meditation', 'yoga', 'thought'],
    'freedom from attachment': ['attachment', 'desire', 'renunciation', 'liberation'],
    'virtue and right conduct': ['virtue', 'truth', 'dharma', 'righteous'],
    'mortality and immortality': ['death', 'immortal', 'mortality', 'grief'],
    'knowledge and discernment': ['knowledge', 'wisdom', 'learned', 'discern']
  };
  return Object.entries(vocabulary).filter(([, terms]) => terms.some(term => text.includes(term))).map(([theme]) => theme).slice(0, 3);
}

function sectionSummary(verses) {
  const themes = passageThemes(verses);
  const representatives = [verses[0], verses[Math.floor(verses.length / 2)], verses.at(-1)]
    .filter((verse, index, array) => verse && array.findIndex(item => item.id === verse.id) === index)
    .map(verse => clip(verse.translation, 145));
  const themeLead = themes.length ? `Themes: ${themes.join(', ')}. ` : '';
  if (representatives.length === 1) return `${themeLead}${representatives[0]}`;
  return `${themeLead}The passage moves from ${representatives.map(text => `“${text}”`).join(' through ')}`;
}

function makeSections(verses, size) {
  const sections = [];
  for (let index = 0; index < verses.length; index += size) {
    const group = verses.slice(index, index + size);
    sections.push({
      id: String(sections.length + 1),
      fromVerse: group[0].citation,
      toVerse: group.at(-1).citation,
      focusVerseId: group[Math.floor(group.length / 2)].id,
      themes: passageThemes(group),
      summary: sectionSummary(group)
    });
  }
  return sections;
}

function normalizeVerse(bookId, chapterId, verse, citation = `${chapterId}.${verse.verse}`) {
  return {
    id: `${bookId}:${chapterId}:${verse.verse}`,
    citation: String(citation),
    number: String(verse.verse),
    sanskrit: clean(verse.sanskrit),
    transliteration: clean(verse.transliteration),
    translation: clean(verse.english || verse.english_alt || verse.translation),
    hindi: clean(verse.hindi)
  };
}

function parseMarkedText(text, markerPattern, chapterRange) {
  const matches = [...text.matchAll(markerPattern)];
  const result = [];
  for (let index = 0; index < matches.length; index += 1) {
    const chapter = Number(matches[index][1] || 1);
    const verse = Number(matches[index][2] || matches[index][1]);
    if (chapterRange && (chapter < chapterRange[0] || chapter > chapterRange[1])) continue;
    const previousEnd = index ? matches[index - 1].index + matches[index - 1][0].length : 0;
    let body = text.slice(previousEnd, matches[index].index);
    body = body.replace(/bhp_\d+\.\d+\.\d+\/0\s+/g, '').replace(/#.*$/gm, '').trim();
    result.push({ chapter, verse, iast: clean(body) });
  }
  return result;
}

async function repairedBooks() {
  const repaired = new Map();
  const itihasa = JSON.parse(await fs.readFile(path.join(root, 'data/raw/itihasa-selections.json'), 'utf8'));
  for (const [bookId, chapters] of [['vidura_niti', itihasa.vidura], ['yaksha_prashna', itihasa.yaksha]]) {
    repaired.set(bookId, chapters.map(source => ({
      id: String(source.chapter),
      parent: source.parva,
      title: clean(source.description) || `Section ${source.chapter}`,
      verses: source.sn.map((sanskrit, index) => normalizeVerse(bookId, String(source.chapter), {
        verse: index + 1, sanskrit, english: source.en[index]
      }))
    })));
  }

  const shiva = JSON.parse(await fs.readFile(path.join(root, 'data/raw/shiva-sutras.json'), 'utf8'));
  repaired.set('shiva_sutras', [1, 2, 3].map(section => ({
    id: String(section), title: `Section ${section}`, verses: shiva.verses.filter(item => item.section === section).map(item => normalizeVerse('shiva_sutras', String(section), item))
  })));

  const viveka = JSON.parse(await fs.readFile(path.join(root, 'data/raw/vivekachudamani.json'), 'utf8'));
  const vivekaText = viveka.sanskrit.slice(viveka.sanskrit.indexOf('# Text') + '# Text'.length).replace(/^\s*vivekacuḍāmaṇi\s*/i, '');
  const vivekaVerses = parseMarkedText(vivekaText, /\/\/\s*(\d+)\s*(?:\/\/|\.)/g).map(item => normalizeVerse('vivekachudamani', '1', {
    verse: item.verse, sanskrit: deva(item.iast), transliteration: item.iast, english: viveka.translations[item.verse]
  }));
  repaired.set('vivekachudamani', [{ id: '1', title: 'The Crest-Jewel of Discrimination', verses: vivekaVerses }]);

  const uddhava = JSON.parse(await fs.readFile(path.join(root, 'data/raw/uddhava-gita.json'), 'utf8'));
  const uddhavaMarked = parseMarkedText(uddhava.sanskrit, /\/\/\s*bhp_11\.(\d{2})\.(\d{3})\*?\s*\/\//g, [6, 29]);
  repaired.set('uddhava_gita', Array.from({ length: 24 }, (_, offset) => {
    const sourceChapter = offset + 6;
    const source = uddhava.chapters[sourceChapter];
    return {
      id: String(sourceChapter),
      parent: 'Srimad Bhagavatam, Canto 11',
      title: clean(source.title).replace(/^Chapter\s+\d+:\s*/i, ''),
      verses: uddhavaMarked.filter(item => item.chapter === sourceChapter).map(item => normalizeVerse('uddhava_gita', String(sourceChapter), {
        verse: item.verse, sanskrit: deva(item.iast), transliteration: item.iast, english: source.translations[item.verse]
      }))
    };
  }));
  return repaired;
}

const repaired = await repairedBooks();
const upanishadTranslations = JSON.parse(await fs.readFile(path.join(root, 'data/raw/upanishad-translations.json'), 'utf8'));
const catalog = { corpusVersion: sources.corpusVersion, generatedAt: sources.generatedAt, books: [] };
const summaries = [];
const searchDocuments = [];

await fs.rm(chapterRoot, { recursive: true, force: true });
await fs.mkdir(publishedEbookDir, { recursive: true });
for (const source of sources.sources) {
  const legacy = legacyById.get(source.id) || { bookId: source.id, bookName: source.title, description: source.edition, chapters: [] };
  let chapters = repaired.get(source.id);
  if (!chapters) {
    const ebook = JSON.parse(await fs.readFile(path.join(ebookDir, `${source.id}.json`), 'utf8'));
    if (source.id === 'ramayana') {
      const groups = new Map();
      for (const verse of ebook.verses) {
        const match = verse.sanskrit.match(/^\[Sarga\s+(\d+),\s*Shloka\s+(\d+)\]\s*/i);
        if (!match) throw new Error(`Unparseable Ramayana citation in kanda ${verse.chapter}`);
        const chapterId = `${verse.chapter}.${match[1]}`;
        if (!groups.has(chapterId)) groups.set(chapterId, { id: chapterId, parent: `Kanda ${verse.chapter}`, title: `Sarga ${match[1]}`, verses: [] });
        groups.get(chapterId).verses.push(normalizeVerse(source.id, chapterId, { ...verse, verse: Number(match[2]), sanskrit: verse.sanskrit.replace(match[0], '') }, `${verse.chapter}.${match[1]}.${match[2]}`));
      }
      chapters = [...groups.values()];
    } else if (source.id === 'mundaka_upanishad') {
      chapters = [];
      for (let mundaka = 1; mundaka <= 3; mundaka += 1) {
        const sourceVerses = ebook.verses.filter(verse => Number(verse.chapter) === mundaka);
        let khanda = 1;
        let previous = 0;
        for (const verse of sourceVerses) {
          if (Number(verse.verse) <= previous) khanda += 1;
          const id = `${mundaka}.${khanda}`;
          if (!chapters.some(chapter => chapter.id === id)) chapters.push({ id, parent: `Mundaka ${mundaka}`, title: `Mundaka ${mundaka}, Khanda ${khanda}`, verses: [] });
          const translation = upanishadTranslations.mundaka.translations[(mundaka - 1) * 2 + khanda - 1][verse.verse];
          chapters.at(-1).verses.push(normalizeVerse(source.id, id, { ...verse, english: translation }, `${mundaka}.${khanda}.${verse.verse}`));
          previous = Number(verse.verse);
        }
      }
    } else {
      const grouped = new Map();
      for (const verse of ebook.verses) {
        const chapterId = String(verse.chapter);
        if (!grouped.has(chapterId)) grouped.set(chapterId, { id: chapterId, title: legacy.chapters.find(item => String(item.id) === chapterId)?.name || `Chapter ${chapterId}`, verses: [] });
        let normalized = normalizeVerse(source.id, chapterId, verse);
        if (source.id === 'shvetashvatara_upanishad') {
          normalized.translation = upanishadTranslations.shvetashvatara.translations[Number(chapterId) - 1][verse.verse];
        }
        grouped.get(chapterId).verses.push(normalized);
      }
      chapters = [...grouped.values()];
      if (source.id === 'shvetashvatara_upanishad') {
        const first = chapters[0];
        first.verses.splice(13, 0, normalizeVerse(source.id, '1', {
          verse: 14,
          sanskrit: 'स्वदेहमरणिं कृत्वा प्रणवं चोत्तरारणिम्। ध्याननिर्मथनाभ्यासाद्देवं पश्येन्निगूढवत्॥',
          english: 'Making one’s own body the lower fire-stick and Om the upper fire-stick, through the practice of the friction of meditation one perceives the luminous Self hidden within.'
        }));
      }
    }
  }

  const legacyFallback = legacy.chapters[0]?.summary || legacy.description;
  const chapterItems = [];
  const summaryItems = [];
  for (const chapter of chapters) {
    if (!chapter.verses.length) throw new Error(`${source.id}/${chapter.id} has no verses.`);
    const legacyChapter = legacy.chapters.find(item => String(item.id) === String(chapter.id).split('.')[0]);
    const summary = clean(legacyChapter?.summary || legacyFallback || sectionSummary(chapter.verses));
    const sectionSize = source.id === 'ramayana' ? 12 : 20;
    const sections = makeSections(chapter.verses, sectionSize);
    const record = {
      schemaVersion: 2,
      bookId: source.id,
      bookName: source.title,
      id: chapter.id,
      title: chapter.title,
      parent: chapter.parent || '',
      summary,
      sections,
      sourceId: source.id,
      attribution: { edition: source.edition, translator: source.translator, url: source.url, rights: source.rights },
      verses: chapter.verses
    };
    const relativePath = `data/chapters/${source.id}/${safeId(chapter.id)}.json`;
    await fs.mkdir(path.dirname(path.join(root, 'public', relativePath)), { recursive: true });
    await fs.writeFile(path.join(root, 'public', relativePath), JSON.stringify(record));
    chapterItems.push({ id: chapter.id, title: chapter.title, parent: chapter.parent || '', summary, verseCount: chapter.verses.length, path: relativePath });
    summaryItems.push({ id: chapter.id, name: chapter.title, parent: chapter.parent || '', summary, sections });
    for (const [verseIndex, verse] of chapter.verses.entries()) {
      const section = sections[Math.floor(verseIndex / sectionSize)];
      searchDocuments.push({ bookId: source.id, chapterId: chapter.id, verseId: verse.id, citation: verse.citation, title: `${source.title} — ${chapter.title}`, text: `${section.summary} ${verse.translation}` });
    }
  }
  const actualVerses = chapters.reduce((sum, chapter) => sum + chapter.verses.length, 0);
  if (chapters.length !== source.expectedChapters || actualVerses !== source.expectedVerses) {
    throw new Error(`${source.id}: expected ${source.expectedChapters}/${source.expectedVerses}, built ${chapters.length}/${actualVerses}`);
  }
  catalog.books.push({ id: source.id, name: source.title, description: legacy.description || source.edition, sourceId: source.id, edition: source.edition, translator: source.translator, sourceUrl: source.url, rights: source.rights, verseCount: actualVerses, chapters: chapterItems });
  summaries.push({ bookId: source.id, bookName: source.title, description: legacy.description || source.edition, chapters: summaryItems });
  await fs.writeFile(path.join(publishedEbookDir, `${source.id}.json`), JSON.stringify({
    schemaVersion: 2,
    bookId: source.id,
    bookName: source.title,
    edition: source.edition,
    totalVerses: actualVerses,
    chapters: chapterItems,
    verses: chapters.flatMap(chapter => chapter.verses.map(verse => ({ ...verse, chapterId: chapter.id })))
  }));
}

await fs.writeFile(path.join(root, 'public/data/catalog.json'), JSON.stringify(catalog));
await fs.writeFile(path.join(root, 'public/data/search-index.json'), JSON.stringify({ corpusVersion: sources.corpusVersion, documents: searchDocuments }));
await fs.writeFile(path.join(root, 'public/data/attribution.json'), JSON.stringify(sources));
await fs.writeFile(summariesPath, JSON.stringify(summaries, null, 2));
console.log(`Built ${catalog.books.length} books, ${catalog.books.reduce((sum, book) => sum + book.chapters.length, 0)} reading chapters, and ${searchDocuments.length} searchable verses.`);
