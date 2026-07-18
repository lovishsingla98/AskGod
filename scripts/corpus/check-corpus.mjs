import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const catalog = JSON.parse(await fs.readFile(path.join(root, 'public/data/catalog.json'), 'utf8'));
const sources = JSON.parse(await fs.readFile(path.join(root, 'data/sources.json'), 'utf8'));
const index = JSON.parse(await fs.readFile(path.join(root, 'public/data/search-index.json'), 'utf8'));
const sourceById = new Map(sources.sources.map(source => [source.id, source]));
const allVerseIds = new Set();
let chapterCount = 0;

if (catalog.books.length !== 15) throw new Error(`Expected 15 books; found ${catalog.books.length}.`);
for (const book of catalog.books) {
  const source = sourceById.get(book.id);
  if (!source) throw new Error(`${book.id}: missing provenance.`);
  let verseCount = 0;
  for (const item of book.chapters) {
    chapterCount += 1;
    const chapter = JSON.parse(await fs.readFile(path.join(root, 'public', item.path), 'utf8'));
    if (!chapter.summary || !chapter.sections.length) throw new Error(`${book.id}/${item.id}: missing layered summaries.`);
    if (chapter.verses.length !== item.verseCount) throw new Error(`${book.id}/${item.id}: catalog count mismatch.`);
    for (const verse of chapter.verses) {
      if (!verse.id || !verse.citation || !verse.sanskrit.trim() || !verse.translation.trim()) throw new Error(`${book.id}/${item.id}: incomplete verse.`);
      if (allVerseIds.has(verse.id)) throw new Error(`Duplicate verse id ${verse.id}.`);
      allVerseIds.add(verse.id);
    }
    verseCount += chapter.verses.length;
  }
  if (book.chapters.length !== source.expectedChapters || verseCount !== source.expectedVerses) {
    throw new Error(`${book.id}: expected ${source.expectedChapters}/${source.expectedVerses}, found ${book.chapters.length}/${verseCount}.`);
  }
}
if (index.documents.length !== allVerseIds.size) throw new Error('Search index does not cover every verse.');
for (const document of index.documents) if (!allVerseIds.has(document.verseId)) throw new Error(`Search document points to missing ${document.verseId}.`);
console.log(`Corpus verified: ${catalog.books.length} books, ${chapterCount} reading chapters, ${allVerseIds.size} complete verses, full search coverage.`);
