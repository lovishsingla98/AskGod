import { describe, expect, it } from 'vitest';
import * as scriptureEngine from '../src/services/scriptureEngine.js';
import fs from 'node:fs';
import path from 'node:path';

const documents = [
  { bookId: 'gita', chapterId: '2', verseId: 'gita:2:47', citation: '2.47', title: 'Bhagavad Gita', text: 'You have a right to action and duty, but never to the fruits or results of work.' },
  { bookId: 'mandukya_upanishad', chapterId: '1', verseId: 'mandukya_upanishad:1:7', citation: '1.7', title: 'Mandukya Upanishad', text: 'The fourth state, Turiya, is neither inward nor outward consciousness and is peace and non-dual.' },
  { bookId: 'mundaka_upanishad', chapterId: '3.1', verseId: 'mundaka_upanishad:3.1:1', citation: '3.1.1', title: 'Mundaka Upanishad', text: 'Two birds cling to the same tree. One eats the fruit while the other witnesses without eating.' }
];

const { rankScriptureDocuments } = scriptureEngine;

describe('scripture retrieval', () => {
  it('relates ordinary questions to the actual verse language', () => {
    expect(rankScriptureDocuments('How can I stop worrying about exam results?', documents)[0].verseId).toBe('gita:2:47');
    expect(rankScriptureDocuments('What are the two birds on one tree?', documents)[0].verseId).toBe('mundaka_upanishad:3.1:1');
  });

  it('returns only source-backed candidates', () => {
    const ranked = rankScriptureDocuments('What is turiya consciousness?', documents);
    expect(ranked[0]).toMatchObject({ bookId: 'mandukya_upanishad', verseId: 'mandukya_upanishad:1:7' });
    expect(ranked).toHaveLength(3);
  });

  it('keeps every advertised quick query on a directly relevant passage', () => {
    const root = path.resolve(import.meta.dirname, '..');
    const production = JSON.parse(fs.readFileSync(path.join(root, 'public/data/search-index.json'), 'utf8')).documents;
    const golden = [
      ['What is the right attitude toward work and exams?', 'gita:2:47'],
      ['How do I manage anxiety and fear about the future?', 'gita:2:56'],
      ['How do I deal with grief, loss, and the death of loved ones?', 'gita:2:20'],
      ['What are the four states of consciousness and Turiya?', 'mandukya_upanishad:1:7'],
      ['What is the greatest wonder in life?', 'yaksha_prashna:313:104']
    ];
    for (const [question, verseId] of golden) expect(rankScriptureDocuments(question, production, 1)[0].verseId, question).toBe(verseId);
  });

  it('understands anxiety about lost time, effort, and future success', () => {
    const root = path.resolve(import.meta.dirname, '..');
    const production = JSON.parse(fs.readFileSync(path.join(root, 'public/data/search-index.json'), 'utf8')).documents;
    const question = "how to handle the stress and anxiety that time is going away from me and i'll never become successful?";
    const winner = rankScriptureDocuments(question, production, 1)[0];
    expect(['gita:2:47', 'gita:6:35', 'gita:6:40']).toContain(winner.verseId);
    expect(winner.verseId).not.toBe('ramayana:6.63:41');
  });

  it('builds a broad candidate set without one chapter or book crowding it out', () => {
    expect(scriptureEngine.selectDiverseCandidates).toBeTypeOf('function');
    const ranked = Array.from({ length: 60 }, (_, index) => ({
      bookId: index < 30 ? 'ramayana' : `book-${Math.floor(index / 10)}`,
      chapterId: index < 20 ? '6.63' : String(index),
      verseId: `verse-${index}`,
      score: 100 - index
    }));
    const selected = scriptureEngine.selectDiverseCandidates(ranked, 40);
    const fromChapter = selected.filter(item => item.bookId === 'ramayana' && item.chapterId === '6.63');
    expect(selected).toHaveLength(40);
    expect(fromChapter.length).toBeLessThanOrEqual(3);
    expect(new Set(selected.map(item => item.bookId)).size).toBeGreaterThan(2);
  });
});
