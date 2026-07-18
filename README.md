# AskGod

AskGod routes a natural-language question to a source-backed passage from 15 Hindu scriptures, opens the complete reading chapter, and highlights the selected verse. It works fully offline with a deterministic verse-level ranker; a server-side Gemini reranker is optional.

## Corpus

The production corpus contains 15 books, 758 practical reading chapters, and 27,595 verses. Long source divisions are split at their real reading boundaries—for example, the Ramayana is Kanda → Sarga and the Mundaka Upanishad is Mundaka → Khanda. Every reading chapter has an overview plus multiple passage summaries, and every verse is represented in the search index.

Original source downloads and repair inputs live in `data/raw`; source editions, translators, rights, URLs, and expected counts are pinned in `data/sources.json`. Every consumed raw and pre-existing source snapshot is retained with a SHA-256 pin, and the corpus check also verifies representative canonical Sanskrit citations so silent source drift cannot ship. The generated artifacts are:

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

Build with `npm run build` and publish `dist` to Cloudflare Pages. The included `functions/api/route.js` is a Pages Function. Configure model keys only in Cloudflare’s server-side environment; never expose them through a `VITE_` variable. When `OPENAI_API_KEY` is present, the reranker uses OpenAI first and defaults to `gpt-5.4-nano`; `OPENAI_MODEL` can override it. `GEMINI_API_KEY` remains a fallback and `GEMINI_MODEL` optionally overrides its `gemini-2.5-flash` default. Bind a Cloudflare Rate Limiting binding named `AI_RATE_LIMITER`; remote reranking stays disabled without that binding or at least one provider key.

Every query is scored against the complete local verse index. The client sends a diverse set of up to 40 source-backed passages for semantic reranking instead of a narrow top-12 list. If the function or every configured model is unavailable, search continues with the deterministic local winner. Model output is accepted only when it selects one of the supplied candidates and an existing verse in the loaded chapter.

## Quality gates

`npm run corpus:check` verifies counts, hierarchy, summaries, non-empty Sanskrit and English, globally unique verse IDs, and complete search coverage. `npm test`, `npm run lint`, and `npm run build` are the remaining release gates.

Translations remain attributed to their respective source editions. Review `public/data/attribution.json` before redistribution or commercial use, especially entries marked source-attributed or Creative Commons NonCommercial.
