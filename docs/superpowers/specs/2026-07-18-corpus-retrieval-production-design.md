# AskGod Corpus, Retrieval, and Production Design

## Goal

Make AskGod return a scripture, canonical reading chapter, and exact highlighted verse that is immediately relatable to a user's question, while preserving the current full-chapter book experience.

## Scope

This change covers corpus normalization, completeness reporting, hierarchical summaries, deterministic retrieval, server-side AI reranking, production security, performance, testing, attribution, and deployment documentation. It does not redesign the visual identity.

## Corpus policy

Canonical Sanskrit is taken from a recognized critical or traditional edition that can legally be redistributed. English translations must come from a legally redistributable printed edition or a project that explicitly permits redistribution. Modern copyrighted translations are not copied. AI-generated text is allowed for summaries and search metadata, but never presented as the canonical verse translation.

Every book has a provenance record containing source title, editor or translator, edition, publication year, source URL, license or public-domain basis, retrieval date, expected structural units, and expected verse count. The build fails when provenance is absent or when normalized content does not match the declared structure.

## Canonical hierarchy

The normalized hierarchy is:

1. Book
2. Parent division such as Kanda, Mundaka, Parva, or Canto when applicable
3. Reading chapter such as Sarga, Valli, Adhyaya, or Mahabharata section
4. Verse or sutra

The UI opens one complete reading chapter and highlights one primary verse. For Valmiki Ramayana, a Kanda is a parent division and a Sarga is the reading chapter. Uddhava Gita uses Bhagavata Purana canto 11 chapters 7 through 29. Vidura Niti uses Udyoga Parva sections 33 through 40. Yaksha Prashna uses its source Mahabharata sections rather than artificial chunks.

Each canonical unit has a stable string ID. Source numbering is retained separately so citations do not change if internal storage changes.

## Data layout

Source data and generated runtime artifacts are separated:

- `data/sources.json`: provenance and completeness expectations.
- `data/raw/`: downloaded or manually imported source snapshots, excluded from the browser bundle.
- `scripts/corpus/`: deterministic parsers and validators.
- `public/data/catalog.json`: compact book and hierarchy catalog.
- `public/data/chapters/<book>/<chapter>.json`: one lazy-loadable reading chapter.
- `public/data/search-index.json`: compact hierarchical retrieval index.
- `public/data/attribution.json`: runtime source attribution.

Generated artifacts are reproducible from pinned source snapshots. Large monolithic ebook files are removed after migration.

## Hierarchical summaries

Every book has a neutral overview. Every parent division and reading chapter has a factual summary. Long reading chapters are split into coherent semantic sections with exact start and end verse IDs. Each summary record contains:

- narrative or doctrinal summary;
- themes and named entities;
- practical human situations;
- Sanskrit and English aliases;
- related concepts and disambiguating negative concepts;
- verse range;
- concise search text generated from the structured fields.

Summary generation is grounded only in the canonical text and translation. A validator confirms that all referenced verse IDs exist, ranges are ordered and non-overlapping, and every verse belongs to at least one searchable section. Summaries are descriptive rather than sectarian and do not claim that a verse says something absent from its translation.

## Retrieval pipeline

The routing pipeline is hierarchical and hybrid:

1. Normalize Unicode, punctuation, common spelling variants, and simple Hinglish variants.
2. Expand a small curated life-situation ontology without replacing the user's original terms.
3. Rank book, chapter-section, and verse-window documents with BM25-style lexical scoring, phrase boosts, entity boosts, and exact-citation recognition.
4. Send only the highest-ranked candidates to a Cloudflare Pages Function.
5. Gemini reranks candidates using a strict JSON schema and is forbidden from inventing IDs.
6. Validate the returned book, chapter, and verse against the candidate set.
7. Return the deterministic top candidate on timeout, quota failure, malformed output, or low confidence.
8. Load the selected chapter JSON and highlight the selected verse.

The routing response includes a concise explanation grounded in the chosen verse and a flag indicating deterministic fallback. Query-result caching uses a normalized-query hash and corpus version.

## Server boundary and security

Gemini calls move from the browser to a Cloudflare Pages Function. The API key exists only as a server environment secret. The client settings modal and local-storage API key are removed.

The function applies origin checks, input-length limits, schema validation, timeouts, bounded retries, per-IP rate limiting where supported, safe error responses, and cache headers. Browser security headers include a restrictive Content Security Policy, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.

## Performance

The initial page loads only the application shell, catalog, and compact search index. Chapter files are loaded on demand and cached. Static JSON is precompressible and immutable filenames or a corpus version provide safe cache invalidation. The 13 MB Ramayana monolith is replaced by Sarga-level files. Search runs synchronously only for the small index; if profiling shows main-thread delay, it moves to a Web Worker without changing the retrieval API.

## UI behavior

The current home, library, animated book, synchronized pages, and exact highlighted verse remain. Library navigation understands parent divisions and reading chapters. The result header displays the canonical citation and source/translator attribution is accessible from the book view. Errors distinguish unavailable AI reranking from unavailable scripture data.

## Quality gates

Automated tests cover:

- source manifest and license metadata;
- declared and actual book/chapter/verse counts;
- stable unique IDs and valid hierarchy links;
- nonempty Sanskrit and translation requirements declared per source;
- summary range coverage;
- exact citation parsing;
- normalization and BM25 ranking;
- strict AI response validation and deterministic fallback;
- chapter loading and highlighted-verse rendering;
- production build, lint, and security headers.

A versioned golden-query set covers anxiety, grief, work, relationships, ethics, meditation, purpose, death, anger, addiction, self-worth, named events, quotations, misspellings, colloquial English, and Hinglish. It records acceptable books, chapters, and verses rather than forcing one interpretation where multiple scriptures are legitimately relevant.

## Delivery order

1. Establish tests, provenance, normalized hierarchy, split artifacts, and completeness reporting.
2. Build hierarchical summaries, retrieval index, golden-query evaluation, and deterministic routing.
3. Add server-side reranking, integrate the UI, add production headers and documentation, then verify the deployed build locally.

Each stage leaves a working application and cannot weaken the deterministic fallback.
