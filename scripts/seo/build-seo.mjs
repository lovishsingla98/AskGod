import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outputRoot = resolve(root, process.argv[2] || 'public');
const publicRoot = resolve(root, 'public');
const origin = 'https://askgod.in';
const siteName = 'AskGod';
const description = 'Ask a question and explore relevant guidance from the Bhagavad Gita, Upanishads, Ramayana, Yoga Sutras, and other divine books.';

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const slugPart = value => encodeURIComponent(String(value));
const absolute = path => `${origin}${path}`;

async function write(relativePath, content) {
  const destination = join(outputRoot, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, content);
}

const jsonLd = value => JSON.stringify(value).replaceAll('<', '\\u003c');

function page({ title, summary, canonicalPath, breadcrumbs, body, type = 'Article' }) {
  const canonical = absolute(canonicalPath);
  const crumbLd = breadcrumbs.map((crumb, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: crumb.name,
    item: absolute(crumb.path),
  }));
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': type,
      name: title,
      headline: title,
      description: summary,
      url: canonical,
      isPartOf: { '@type': 'WebSite', name: siteName, url: `${origin}/` },
      inLanguage: ['en', 'sa'],
    },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbLd },
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} | ${siteName}</title>
  <meta name="description" content="${escapeHtml(summary)}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${siteName}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(summary)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${origin}/assets/deities/krishna.webp">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${jsonLd(structuredData)}</script>
  <style>body{margin:0;background:#17120d;color:#f7ead1;font:18px/1.7 Georgia,serif}main{max-width:860px;margin:auto;padding:48px 24px 96px}a{color:#efb55a}nav{font:15px/1.5 system-ui,sans-serif;margin-bottom:40px}h1,h2{line-height:1.2;color:#ffd89b}.summary{font-size:1.12em;color:#ead9bc}.verse{padding:20px 0;border-top:1px solid #5d462c}.sanskrit{font-size:1.12em}.citation{color:#efb55a;font-weight:700}.source{margin-top:48px;font-size:.9em;color:#c6b79f}.cta{display:inline-block;margin:28px 0;padding:12px 18px;border:1px solid #efb55a;border-radius:999px;text-decoration:none}</style>
</head>
<body><main>
  <nav aria-label="Breadcrumb">${breadcrumbs.map(crumb => `<a href="${crumb.path}">${escapeHtml(crumb.name)}</a>`).join(' &rsaquo; ')}</nav>
  ${body}
  <a class="cta" href="/">Ask a question on AskGod</a>
</main></body></html>`;
}

const xml = values => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${values.map(value => `  <url><loc>${escapeHtml(value)}</loc></url>`).join('\n')}\n</urlset>\n`;

async function build() {
  const catalog = JSON.parse(await readFile(join(publicRoot, 'data/catalog.json'), 'utf8'));
  if (outputRoot !== publicRoot) await rm(join(outputRoot, 'books'), { recursive: true, force: true });

  const urls = [`${origin}/`, `${origin}/books/`];
  const libraryBody = `<h1>Divine Books Library</h1><p class="summary">Explore complete chapters and attributed translations from ${catalog.books.length} divine books.</p><ul>${catalog.books.map(book => `<li><a href="/books/${slugPart(book.id)}/">${escapeHtml(book.name)}</a> — ${escapeHtml(book.description)}</li>`).join('')}</ul>`;
  await write('books/index.html', page({ title: 'Divine Books Library', summary: description, canonicalPath: '/books/', breadcrumbs: [{ name: 'AskGod', path: '/' }, { name: 'Divine Books', path: '/books/' }], body: libraryBody, type: 'CollectionPage' }));

  for (const book of catalog.books) {
    const bookPath = `/books/${slugPart(book.id)}/`;
    urls.push(absolute(bookPath));
    const bookBody = `<h1>${escapeHtml(book.name)}</h1><p class="summary">${escapeHtml(book.description)}</p><h2>Chapters</h2><ol>${book.chapters.map(chapter => `<li><a href="${bookPath}chapters/${slugPart(chapter.id)}/">${escapeHtml(chapter.parent ? `${chapter.parent} — ${chapter.title}` : chapter.title)}</a> — ${escapeHtml(chapter.summary)}</li>`).join('')}</ol><p class="source">Edition: ${escapeHtml(book.edition)}. Translation: ${escapeHtml(book.translator)}. <a href="${escapeHtml(book.sourceUrl)}" rel="nofollow noreferrer">Source</a></p>`;
    await write(`books/${book.id}/index.html`, page({ title: book.name, summary: book.description, canonicalPath: bookPath, breadcrumbs: [{ name: 'AskGod', path: '/' }, { name: 'Divine Books', path: '/books/' }, { name: book.name, path: bookPath }], body: bookBody, type: 'Book' }));

    for (const chapterSummary of book.chapters) {
      const chapter = JSON.parse(await readFile(join(publicRoot, chapterSummary.path), 'utf8'));
      const chapterPath = `${bookPath}chapters/${slugPart(chapter.id)}/`;
      urls.push(absolute(chapterPath));
      const chapterTitle = chapter.parent ? `${chapter.parent} — ${chapter.title}` : chapter.title;
      const verses = chapter.verses.map(verse => `<section class="verse" id="verse-${escapeHtml(verse.number)}"><p class="citation">${escapeHtml(verse.citation)}</p>${verse.sanskrit ? `<p class="sanskrit" lang="sa">${escapeHtml(verse.sanskrit)}</p>` : ''}<p>${escapeHtml(verse.translation)}</p>${verse.hindi ? `<p lang="hi">${escapeHtml(verse.hindi)}</p>` : ''}</section>`).join('');
      const chapterBody = `<h1>${escapeHtml(book.name)}: ${escapeHtml(chapterTitle)}</h1><p class="summary">${escapeHtml(chapter.summary)}</p><h2>Chapter text</h2>${verses}<p class="source">Edition: ${escapeHtml(chapter.attribution?.edition || book.edition)}. Translation: ${escapeHtml(chapter.attribution?.translator || book.translator)}. <a href="${escapeHtml(chapter.attribution?.url || book.sourceUrl)}" rel="nofollow noreferrer">Source</a></p>`;
      await write(`books/${book.id}/chapters/${chapter.id}/index.html`, page({ title: `${book.name}: ${chapterTitle}`, summary: chapter.summary, canonicalPath: chapterPath, breadcrumbs: [{ name: 'AskGod', path: '/' }, { name: 'Divine Books', path: '/books/' }, { name: book.name, path: bookPath }, { name: chapterTitle, path: chapterPath }], body: chapterBody }));
    }
  }

  await write('sitemaps/pages.xml', xml(urls));
  await write('sitemap-index.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${origin}/sitemaps/pages.xml</loc></sitemap></sitemapindex>\n`);
  await write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /data/\n\nSitemap: ${origin}/sitemap-index.xml\n`);
  await write('llms.txt', `# AskGod\n\nAskGod helps people find relevant passages from attributed editions of Hindu divine books.\n\n## Canonical site\n- ${origin}/\n- ${origin}/books/\n- ${origin}/sitemap-index.xml\n\n## Content\nThe library includes the Bhagavad Gita, Valmiki Ramayana, principal Upanishads, Yoga Sutras, and related works. Generated chapter pages reproduce the locally validated text and source attribution. AskGod offers spiritual reflection, not medical, legal, or financial advice.\n\n## Citation policy\nWhen citing a passage, preserve its book, chapter, verse, edition, translator, and source attribution.\n`);

  console.log(`Generated ${urls.length} canonical URLs in ${outputRoot}`);
}

await build();

