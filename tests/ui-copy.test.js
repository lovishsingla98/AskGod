import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('home hero copy', () => {
  it('uses the approved divine-books message', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, '../src/App.jsx'), 'utf8');
    expect(source).toContain('Feeling anxious, stressed, or struggling with financial or relationship problems?');
    expect(source).toContain('Ask God and let Him answer through His divine books.');
    expect(source).toContain('Solution to all your problems, only if you believe in him.');
  });
});
