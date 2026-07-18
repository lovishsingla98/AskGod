# AskGod

AskGod routes a natural-language question to a source-backed passage from 15 Hindu scriptures, opens the complete reading chapter, and highlights the selected verse. It works fully offline with a deterministic verse-level ranker; a server-side Gemini reranker is optional.

## Corpus

The production corpus contains 15 books, 758 practical reading chapters, and 27,595 verses. Long source divisions are split at their real reading boundaries—for example, the Ramayana is Kanda → Sarga and the Mundaka Upanishad is Mundaka → Khanda. Every reading chapter has an overview plus multiple passage summaries, and every verse is represented in the search index.

Original source downloads and repair inputs live in `data/raw`; source editions, translators, rights, URLs, and expected counts are pinned in `data/sources.json`. The generated artifacts are:

- `public/data/catalog.json` — lightweight book and chapter catalog
- `public/data/chapters/<book>/<chapter>.json` — independently loadable full chapters
- `public/data/ebooks/<book>.json` — complete normalized ebooks
- `public/data/search-index.json` — verse-level retrieval index
- `public/data/summaries.json` — chapter and passage-level summaries
- `public/data/attribution.json` — published provenance manifest

## Local development

```bash
npm install
npm run corpus:check
npm test
npm run dev
```

Open `http://localhost:5173`.

To reproduce refreshed source artifacts:

```bash
npm run corpus:download
npm run corpus:build
npm run corpus:check
```

The download step requires network access. Generated results are deterministic for the pinned source endpoints and fail closed when hierarchy or counts change.

## Production deployment

Build with `npm run build` and publish `dist`. The included `api/route.js` is compatible with Vercel Functions. Configure `GEMINI_API_KEY` only in the hosting provider’s server-side environment; never expose it through a `VITE_` variable. `GEMINI_MODEL` is optional and defaults to `gemini-2.5-flash`.

If the function or model is unavailable, search continues locally. Model output is accepted only when it selects one of the source-backed candidates and an existing verse in the loaded chapter.

## Quality gates

`npm run corpus:check` verifies counts, hierarchy, summaries, non-empty Sanskrit and English, globally unique verse IDs, and complete search coverage. `npm test`, `npm run lint`, and `npm run build` are the remaining release gates.

Translations remain attributed to their respective source editions. Review `public/data/attribution.json` before redistribution or commercial use, especially entries marked source-attributed or Creative Commons NonCommercial.
