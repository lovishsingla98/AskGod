export function validateCatalog(catalog) {
  const errors = [];
  const bookIds = new Set();

  if (!catalog || !Array.isArray(catalog.books)) return ['Catalog must contain books.'];
  for (const book of catalog.books) {
    if (!book.id || bookIds.has(book.id)) errors.push(`Invalid or duplicate book id: ${book.id || '(missing)'}`);
    bookIds.add(book.id);
    if (!book.name || !book.description) errors.push(`${book.id}: missing name or description`);
    if (!book.sourceId) errors.push(`${book.id}: missing sourceId`);
    if (!Array.isArray(book.chapters) || book.chapters.length === 0) errors.push(`${book.id}: has no reading chapters`);
    const chapterIds = new Set();
    for (const chapter of book.chapters || []) {
      if (!chapter.id || chapterIds.has(chapter.id)) errors.push(`${book.id}: invalid or duplicate chapter ${chapter.id}`);
      chapterIds.add(chapter.id);
      if (!chapter.path || !chapter.title || !Number.isInteger(chapter.verseCount) || chapter.verseCount < 1) {
        errors.push(`${book.id}/${chapter.id}: incomplete chapter metadata`);
      }
    }
  }
  return errors;
}

export function validateChapter(chapter) {
  const errors = [];
  const verseIds = new Set();
  if (!chapter?.id || !Array.isArray(chapter.verses) || chapter.verses.length === 0) {
    return ['Chapter must have an id and verses.'];
  }
  for (const verse of chapter.verses) {
    if (!verse.id || verseIds.has(verse.id)) errors.push(`Invalid or duplicate verse id: ${verse.id || '(missing)'}`);
    verseIds.add(verse.id);
    if (!verse.citation || !String(verse.sanskrit || '').trim()) errors.push(`${verse.id}: missing citation or Sanskrit`);
    if (!String(verse.translation || '').trim()) errors.push(`${verse.id}: missing English translation`);
  }
  return errors;
}

export function validateRoute(route, candidates, chapter) {
  if (!route || !Array.isArray(candidates)) return false;
  const allowed = candidates.some(candidate =>
    candidate.bookId === route.bookId &&
    candidate.chapterId === route.chapterId &&
    candidate.verseId === route.verseId
  );
  return allowed && chapter?.verses?.some(verse => verse.id === route.verseId);
}
