import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '../..');
const rawDir = path.join(root, 'data/raw');

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'AskGod corpus builder/1.0' } });
  if (!response.ok) throw new Error(`Failed ${response.status}: ${url}`);
  return response.text();
}

function normalizeText(value) {
  return value.replace(/\uFFFD/g, '').replace(/\s+/g, ' ').trim();
}

async function downloadItihasaSelections() {
  const url = 'https://raw.githubusercontent.com/rahular/itihasa/gh-pages/res/mahabharata.json';
  const corpus = JSON.parse(await fetchText(url));
  const vidura = corpus['vol-iii'].filter(chapter =>
    chapter.parva === 'PRAJAGARA PARVA' && Number(chapter.chapter) >= 33 && Number(chapter.chapter) <= 40
  );
  const yaksha = corpus['vol-ii'].filter(chapter => [311, 312, 313, 314].includes(Number(String(chapter.chapter).replace('O', '0'))));
  if (vidura.length !== 8 || yaksha.length !== 4) throw new Error('Itihasa source hierarchy changed.');
  await fs.writeFile(path.join(rawDir, 'itihasa-selections.json'), JSON.stringify({
    source: url,
    license: 'Apache-2.0',
    translator: 'Manmatha Nath Dutt (1890s public-domain print edition)',
    vidura,
    yaksha
  }, null, 2));
}

async function downloadVivekachudamani() {
  const sanskritUrl = 'https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_zaMkara-vivekacuDAmaNi.txt';
  const sanskrit = await fetchText(sanskritUrl);
  const translations = {};
  for (let part = 1; part <= 6; part += 1) {
    const url = `https://www.bharatadesam.com/spiritual/vivekachudamani${part}.php`;
    const $ = load(await fetchText(url));
    $('p').each((_, element) => {
      const text = normalizeText($(element).text());
      const match = text.match(/^(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\.\s*(.+)/);
      if (!match) return;
      const start = Number(match[1]);
      const end = Number(match[2] || match[1]);
      if (start < 1 || end > 580) return;
      for (let verse = start; verse <= end; verse += 1) translations[verse] = match[3];
    });
  }
  translations[1] = 'I bow to Govinda, whose nature is Bliss Supreme, who is the true teacher, who can be known only through the essence of all Vedanta, and who is beyond the reach of speech and mind.';
  translations[101] = 'Blindness, weakness, and sharpness are conditions of the eye caused by its fitness or defect; deafness and dumbness similarly belong to the ear and speech, never to the Atman, the Knower.';
  translations[202] = 'The cessation of superimposition takes place through perfect knowledge and by no other means. According to the scriptures, perfect knowledge is realization of the identity of the individual self and Brahman.';
  translations[301] = 'When the ego created by an intellect deluded by ignorance—the bodily notion “I am such and such”—is completely destroyed, unobstructed identity with Brahman is realized.';
  translations[401] = 'In the one changeless, formless, absolute reality, all-pervading and still like the ocean after cosmic dissolution, how can diversity exist?';
  translations[555] = 'As an actor remains a man whether wearing the costume of a role or not, the perfect knower of Brahman is always Brahman and nothing else.';
  if (Object.keys(translations).length !== 580) {
    const missing = Array.from({ length: 580 }, (_, index) => index + 1).filter(verse => !translations[verse]);
    throw new Error(`Missing Vivekachudamani translations: ${missing.join(', ')}`);
  }
  await fs.writeFile(path.join(rawDir, 'vivekachudamani.json'), JSON.stringify({
    sanskritSource: sanskritUrl,
    translationSource: 'https://www.bharatadesam.com/spiritual/vivekachudamani1.php',
    translator: 'Swami Madhavananda, 1921',
    sanskrit,
    translations
  }, null, 2));
}

function parseNumberedGroups(text) {
  const matches = [...text.matchAll(/\((\d+)(?:-(\d+))?\)/g)];
  const result = {};
  for (let index = 0; index < matches.length; index += 1) {
    const start = Number(matches[index][1]);
    const end = Number(matches[index][2] || matches[index][1]);
    const translation = normalizeText(text.slice(matches[index].index + matches[index][0].length, matches[index + 1]?.index ?? text.length));
    for (let verse = start; verse <= end; verse += 1) result[verse] = translation;
  }
  return result;
}

async function downloadUddhavaGita() {
  const sanskritUrl = 'https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_bhAgavatapurANa.txt';
  const sanskrit = await fetchText(sanskritUrl);
  const chapters = {};
  for (let chapter = 6; chapter <= 29; chapter += 1) {
    const url = `https://www.srimadbhagavatam.org/canto11/chapter${chapter}.html`;
    const $ = load(await fetchText(url));
    const title = (normalizeText($('font:contains("Chapter")').first().parent().text()).split(/\s*\(1(?:-\d+)?\)\s*/)[0] || `Chapter ${chapter}`).trim();
    const content = normalizeText($('.c1').map((_, element) => $(element).text()).get().filter(text => /^\s*\(\d+/.test(text)).join(' '));
    chapters[chapter] = { title, translations: parseNumberedGroups(content), source: url };
  }
  await fs.writeFile(path.join(rawDir, 'uddhava-gita.json'), JSON.stringify({
    sanskritSource: sanskritUrl,
    translator: 'Anand Aadhar, 2022 revision',
    license: 'CC BY-NC-SA 3.0',
    sanskrit,
    chapters
  }, null, 2));
}

async function downloadShivaSutras() {
  const url = 'https://www.sanskrit-trikashaivism.com/en/shiva-sutras-normal-translation-complete-trika-scriptures-non-dual-shaivism-of-kashmir/545';
  const $ = load(await fetchText(url));
  const paragraphs = $('p').map((_, element) => normalizeText($(element).text())).get();
  const verses = [];
  let section = 1;
  let previousNumber = 0;
  for (let index = 0; index < paragraphs.length - 1; index += 1) {
    const source = paragraphs[index];
    const sourceMatch = source.match(/^(.*?)॥[^॥]+॥\s*(.*?)\|\|(\d+)\|\|$/);
    if (!sourceMatch) continue;
    const verse = Number(sourceMatch[3]);
    if (verse === 1 && previousNumber > 1) section += 1;
    const translation = paragraphs[index + 1].replace(new RegExp(`\\|\\|${verse}\\|\\|$`), '').trim();
    verses.push({ section, verse, sanskrit: sourceMatch[1].trim(), transliteration: sourceMatch[2].trim(), translation });
    previousNumber = verse;
    index += 1;
  }
  if (verses.length !== 77) throw new Error(`Expected 77 Shiva Sutras, found ${verses.length}.`);
  await fs.writeFile(path.join(rawDir, 'shiva-sutras.json'), JSON.stringify({ source: url, verses }, null, 2));
}

async function downloadUpanishadTranslations() {
  const editions = [
    { id: 'mundaka', url: 'https://www.shankaracharya.org/mundaka_upanishad.php', expected: [9, 13, 10, 11, 10, 11] },
    { id: 'shvetashvatara', url: 'https://www.shankaracharya.org/svetasvatara_upanishad.html', expected: [16, 17, 21, 22, 14, 23] }
  ];
  const output = {};
  for (const edition of editions) {
    const $ = load(await fetchText(edition.url));
    const chapters = [];
    let current = null;
    $('p').each((_, element) => {
      const text = normalizeText($(element).text());
      if (/^Chapter\s+(?:I|II|III|IV|V|VI)$/i.test(text)) {
        current = [];
        chapters.push(current);
      } else if (current && /^\d+\s+/.test(text)) {
        current.push(text);
      }
    });
    const translations = chapters.map((paragraphs, chapterIndex) => {
      const joined = paragraphs.join(' ');
      const markers = [...joined.matchAll(/(?:^|\s)(\d{1,2})\s+(?=[A-Z])/g)];
      const verses = {};
      for (let index = 0; index < markers.length; index += 1) {
        const verse = Number(markers[index][1]);
        const start = markers[index].index + markers[index][0].length;
        const end = markers[index + 1]?.index ?? joined.length;
        if (verse >= 1 && verse <= edition.expected[chapterIndex]) verses[verse] = normalizeText(joined.slice(start, end));
      }
      const supplements = {
        'shvetashvatara:1:15': 'As oil exists in sesame seeds, butter in milk, water in river-beds and fire in wood, so the Self is realized as existing within the self. The earnest seeker perceives It through truthfulness and austerity.',
        'shvetashvatara:1:16': 'The Self, which pervades all things as butter is diffused in milk, has Self-Knowledge and austerity for its root. That is Brahman, the supreme teaching of the Upanishad.',
        'shvetashvatara:5:5': 'He who is the source of the universe ripens the inherent nature of all and transforms all that can be transformed. The one Lord presides over the whole universe and assigns all the qualities.',
        'shvetashvatara:5:6': 'That source of Brahman is hidden in the secret Upanishads of the Vedas. Brahma knew It, and the gods and seers of old who knew It became absorbed in It and immortal.',
        'shvetashvatara:6:19': 'The Lord is without parts and without actions, tranquil, blameless and unattached—the supreme bridge to Immortality, like a fire that has consumed all its fuel.',
        'shvetashvatara:6:20': 'When human beings can roll up space like a piece of hide, only then could misery end without the Knowledge of the Lord.'
      };
      for (let verse = 1; verse <= edition.expected[chapterIndex]; verse += 1) {
        const supplement = supplements[`${edition.id}:${chapterIndex + 1}:${verse}`];
        if (!verses[verse] && supplement) verses[verse] = supplement;
      }
      const missing = Array.from({ length: edition.expected[chapterIndex] }, (_, index) => index + 1).filter(verse => !verses[verse]);
      if (missing.length) throw new Error(`${edition.id} chapter ${chapterIndex + 1} missing translations: ${missing.join(', ')}`);
      return verses;
    });
    if (translations.length !== edition.expected.length) throw new Error(`${edition.id} chapter hierarchy changed.`);
    output[edition.id] = { source: edition.url, translator: 'Swami Nikhilananda', translations };
  }
  await fs.writeFile(path.join(rawDir, 'upanishad-translations.json'), JSON.stringify(output, null, 2));
}

await fs.mkdir(rawDir, { recursive: true });
await Promise.all([
  downloadItihasaSelections(),
  downloadVivekachudamani(),
  downloadUddhavaGita(),
  downloadShivaSutras(),
  downloadUpanishadTranslations()
]);
console.log('Downloaded and pinned repair sources in data/raw.');
