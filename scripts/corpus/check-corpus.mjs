import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../..');
const catalog = JSON.parse(await fs.readFile(path.join(root, 'public/data/catalog.json'), 'utf8'));
const sources = JSON.parse(await fs.readFile(path.join(root, 'data/sources.json'), 'utf8'));
const index = JSON.parse(await fs.readFile(path.join(root, 'public/data/search-index.json'), 'utf8'));
const sourceById = new Map(sources.sources.map(source => [source.id, source]));
const snapshotDir = path.join(root, 'data/legacy-ebooks');
const snapshotHashes = JSON.parse(await fs.readFile(path.join(snapshotDir, 'SHA256SUMS.json'), 'utf8'));
const allVerseIds = new Set();
let chapterCount = 0;

if (catalog.books.length !== 15) throw new Error(`Expected 15 books; found ${catalog.books.length}.`);
for (const [filename, expectedHash] of Object.entries(snapshotHashes)) {
  const content = await fs.readFile(path.join(snapshotDir, filename));
  const actualHash = crypto.createHash('sha256').update(content).digest('hex');
  if (actualHash !== expectedHash) throw new Error(`${filename}: immutable source snapshot hash mismatch.`);
}
for (const book of catalog.books) {
  const source = sourceById.get(book.id);
  if (!source) throw new Error(`${book.id}: missing provenance.`);
  let verseCount = 0;
  for (const item of book.chapters) {
    chapterCount += 1;
    const chapter = JSON.parse(await fs.readFile(path.join(root, 'public', item.path), 'utf8'));
    if (!chapter.summary || !chapter.sections.length) throw new Error(`${book.id}/${item.id}: missing layered summaries.`);
    if (chapter.verses.length > 50 && chapter.sections.length < 3) throw new Error(`${book.id}/${item.id}: long chapter needs multiple passage summaries.`);
    if (chapter.sections.some(section => section.summary.length < 60 || !section.fromVerse || !section.toVerse || !section.focusVerseId)) {
      throw new Error(`${book.id}/${item.id}: incomplete passage summary.`);
    }
    if (!chapter.attribution?.edition || !chapter.attribution?.translator || !chapter.attribution?.url || !chapter.attribution?.rights) {
      throw new Error(`${book.id}/${item.id}: missing reading attribution.`);
    }
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
const canonicalChecks = [
  ['gita:2:47', 'कर्मण्येवाधिकारस्ते'],
  ['mandukya_upanishad:1:7', 'नान्तःप्रज्ञं'],
  ['ramayana:1.1:1', 'तपस्स्वाध्यायनिरतं'],
  ['yaksha_prashna:313:104', 'अहन्यहनि भूतानि']
];
for (const [verseId, expectedSanskrit] of canonicalChecks) {
  const document = index.documents.find(item => item.verseId === verseId);
  if (!document) throw new Error(`Missing canonical check verse ${verseId}.`);
  const chapterPath = catalog.books.find(book => book.id === verseId.split(':')[0]).chapters.find(chapter => chapter.id === document.chapterId).path;
  const chapter = JSON.parse(await fs.readFile(path.join(root, 'public', chapterPath), 'utf8'));
  if (!chapter.verses.find(verse => verse.id === verseId)?.sanskrit.includes(expectedSanskrit)) throw new Error(`${verseId}: canonical Sanskrit check failed.`);
}
console.log(`Corpus verified: ${catalog.books.length} books, ${chapterCount} reading chapters, ${allVerseIds.size} complete verses, full search coverage.`);
