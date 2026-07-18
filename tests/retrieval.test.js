import { describe, expect, it } from 'vitest';
import { rankScriptureDocuments } from '../src/services/scriptureEngine.js';

const documents = [
  { bookId: 'gita', chapterId: '2', verseId: 'gita:2:47', citation: '2.47', title: 'Bhagavad Gita', text: 'You have a right to action and duty, but never to the fruits or results of work.' },
  { bookId: 'mandukya_upanishad', chapterId: '1', verseId: 'mandukya_upanishad:1:7', citation: '1.7', title: 'Mandukya Upanishad', text: 'The fourth state, Turiya, is neither inward nor outward consciousness and is peace and non-dual.' },
  { bookId: 'mundaka_upanishad', chapterId: '3.1', verseId: 'mundaka_upanishad:3.1:1', citation: '3.1.1', title: 'Mundaka Upanishad', text: 'Two birds cling to the same tree. One eats the fruit while the other witnesses without eating.' }
];

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
});
