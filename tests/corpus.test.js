import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { validateCatalog, validateChapter, validateRoute } from '../src/services/corpusSchema.js';

const root = path.resolve(import.meta.dirname, '..');

describe('normalized scripture corpus', () => {
  it('publishes a valid 15-book catalog with provenance', () => {
    const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/data/catalog.json'), 'utf8'));
    const sources = JSON.parse(fs.readFileSync(path.join(root, 'data/sources.json'), 'utf8'));
    expect(catalog.books).toHaveLength(15);
    expect(sources.sources).toHaveLength(15);
    expect(validateCatalog(catalog)).toEqual([]);
    for (const source of sources.sources) {
      expect(source).toMatchObject({ id: expect.any(String), title: expect.any(String), url: expect.any(String), rights: expect.any(String) });
    }
  });

  it('publishes independently valid reading chapters', () => {
    const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/data/catalog.json'), 'utf8'));
    for (const book of catalog.books) {
      for (const item of book.chapters) {
        const chapter = JSON.parse(fs.readFileSync(path.join(root, 'public', item.path), 'utf8'));
        expect(validateChapter(chapter), `${book.id}/${item.id}`).toEqual([]);
      }
    }
  });

  it('accepts only a candidate verse present in the loaded chapter', () => {
    const chapter = { verses: [{ id: 'gita:2:47' }] };
    const candidates = [{ bookId: 'gita', chapterId: '2', verseId: 'gita:2:47' }];
    expect(validateRoute({ ...candidates[0] }, candidates, chapter)).toBe(true);
    expect(validateRoute({ bookId: 'gita', chapterId: '2', verseId: 'gita:2:99' }, candidates, chapter)).toBe(false);
  });

  it('indexes exact verse text separately from surrounding section context', () => {
    const documents = JSON.parse(fs.readFileSync(path.join(root, 'public/data/search-index.json'), 'utf8')).documents;
    expect(documents.length).toBeGreaterThan(25_000);
    for (const document of documents) {
      expect(document.translation, document.verseId).toEqual(expect.any(String));
      expect(document.translation.trim().length, document.verseId).toBeGreaterThan(0);
      expect(document.summary, document.verseId).toEqual(expect.any(String));
    }
  });
});
