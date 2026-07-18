# AskGod Corpus and Retrieval Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace incomplete monolithic scripture data and weak keyword routing with a validated hierarchical corpus, fast deterministic retrieval, secure AI reranking, and production-ready delivery.

**Architecture:** A build-time corpus pipeline validates pinned source snapshots and emits a compact catalog, section search index, and one JSON artifact per canonical reading chapter. The browser performs deterministic retrieval, optionally sends only top candidates to a Cloudflare Pages Function for Gemini reranking, validates the response, and opens the complete selected chapter with one verse highlighted.

**Tech Stack:** React 19, Vite 8, Vitest, Node.js corpus scripts, Cloudflare Pages Functions, Gemini structured JSON, static JSON assets.

---

### Task 1: Establish test and corpus contracts

**Files:**
- Modify: `package.json`
- Create: `tests/corpus.test.js`
- Create: `src/services/corpusSchema.js`

- [ ] Add Vitest and scripts for `test`, `test:watch`, `corpus:build`, and `corpus:check`.
- [ ] Write a failing test that requires source provenance, unique stable IDs, valid hierarchy references, nonempty Sanskrit, declared translation coverage, ordered verse ranges, and a selected verse contained in its chapter.
- [ ] Run `npm test -- tests/corpus.test.js` and confirm it fails because the normalized catalog does not exist.
- [ ] Implement reusable runtime/build validators in `corpusSchema.js`.
- [ ] Run the test and confirm the schema-level fixtures pass while generated-artifact checks remain red.

### Task 2: Add provenance and deterministic build pipeline

**Files:**
- Create: `data/sources.json`
- Create: `scripts/corpus/build-corpus.mjs`
- Create: `scripts/corpus/check-corpus.mjs`
- Create: `scripts/corpus/lib/normalize.mjs`
- Create: `scripts/corpus/lib/split.mjs`
- Create: `public/data/attribution.json`

- [ ] Add failing tests for all 15 source-manifest entries and completeness expectations.
- [ ] Populate explicit source, edition, translator, URL, rights basis, hierarchy type, expected unit count, expected verse count, and translation requirements.
- [ ] Implement source normalization with stable IDs shaped as `book:parent:chapter:verse` while retaining source citations.
- [ ] Implement a checker that exits nonzero on missing books, counts, fields, duplicates, malformed ranges, or undeclared provenance.
- [ ] Run `npm run corpus:check` and capture the incomplete-corpus report before migration.

### Task 3: Normalize and split complete existing books

**Files:**
- Modify: `scripts/corpus/build-corpus.mjs`
- Create: `public/data/catalog.json`
- Create: `public/data/chapters/**`
- Create: `public/data/corpus-version.json`
- Remove after migration: `public/data/ebooks/*.json`

- [ ] Write failing tests asserting Ramayana Kandas contain Sarga reading chapters and every generated chapter can load independently.
- [ ] Parse embedded Ramayana `[Sarga N, Shloka N]` labels into Kanda → Sarga → verse hierarchy.
- [ ] Normalize the complete Gita, Yoga Sutras, Isha, Mandukya, Katha, Mundaka, Shvetashvatara, Ashtavakra, Avadhuta, and Ramayana datasets.
- [ ] Emit one chapter file per reading chapter plus a compact catalog and content-hash corpus version.
- [ ] Verify no chapter artifact exceeds the agreed performance ceiling unless its source chapter itself is larger.

### Task 4: Repair incomplete and malformed books

**Files:**
- Create: `data/raw/shiva_sutras.*`
- Create: `data/raw/vivekachudamani.*`
- Create: `data/raw/uddhava_gita.*`
- Create: `data/raw/vidura_niti.*`
- Create: `data/raw/yaksha_prashna.*`
- Modify: `data/sources.json`
- Modify: `scripts/corpus/build-corpus.mjs`

- [ ] Add failing count tests for 77 Shiva Sutras, 580 Vivekachudamani verses, Uddhava Gita source chapters 11.7–11.29, Vidura Niti Udyoga Parva sections 33–40, and canonical Yaksha Prashna source sections.
- [ ] Import pinned legally redistributable Sanskrit and English source snapshots with attribution.
- [ ] Parse each source at actual verse granularity; never treat a multi-verse section blob as one verse.
- [ ] Compare first, middle, and last citations against the declared print/source edition.
- [ ] Run completeness checks and require zero unexplained missing structural units.

### Task 5: Generate hierarchical summaries and search index

**Files:**
- Create: `data/summaries/*.json`
- Create: `scripts/corpus/build-search-index.mjs`
- Create: `public/data/search-index.json`
- Create: `tests/search-index.test.js`

- [ ] Write failing tests requiring a book overview, parent summary, chapter summary, full verse coverage, valid semantic ranges, themes, situations, aliases, and searchable text.
- [ ] Replace the single summary catalog with per-book hierarchical summaries; split long chapters into coherent verse-range sections.
- [ ] Build index documents for books, chapter sections, and small verse windows.
- [ ] Validate that summaries reference only existing verses and that each verse is searchable.
- [ ] Add snapshot tests for representative doctrinal, narrative, and mixed chapters.

### Task 6: Implement deterministic retrieval and evaluation

**Files:**
- Create: `src/services/queryNormalizer.js`
- Create: `src/services/searchEngine.js`
- Create: `src/services/routeValidator.js`
- Create: `tests/searchEngine.test.js`
- Create: `tests/fixtures/golden-queries.json`

- [ ] Write failing tests for Unicode normalization, punctuation, aliases, exact citations, spelling variants, colloquial queries, and Hinglish.
- [ ] Implement token normalization, phrase/entity boosts, life-situation expansion, BM25-style scoring, diversity-aware candidate selection, and deterministic tie-breaking.
- [ ] Write failing tests proving invented IDs and mismatched verses are rejected.
- [ ] Implement strict candidate-set validation and confidence-aware fallback.
- [ ] Run the golden-query evaluator and tune metadata/weights rather than adding query-specific hard-coded routes.

### Task 7: Add secure server-side reranking

**Files:**
- Create: `functions/api/route.js`
- Create: `functions/_middleware.js`
- Create: `tests/route-function.test.js`
- Create: `.dev.vars.example`

- [ ] Write failing tests for method, origin, content type, input limits, candidate limits, schema validation, timeout, upstream failure, and deterministic fallback response shape.
- [ ] Implement the Cloudflare Pages Function using `context.env.GEMINI_API_KEY` and a strict structured-output schema.
- [ ] Restrict the model to supplied candidate IDs and validate every returned identifier.
- [ ] Add safe cache headers and security headers without logging questions or secrets.
- [ ] Verify no API key or Gemini endpoint remains in client code or browser storage.

### Task 8: Integrate the corrected hierarchy and routing UI

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/services/scriptureEngine.js`
- Modify: `src/App.css`
- Create: `src/components/ScriptureLibrary.jsx`
- Create: `src/components/BookViewer.jsx`
- Create: `tests/App.test.jsx`

- [ ] Write failing component tests for parent/chapter navigation, full selected-chapter rendering, exact highlighted verse, attribution, and fallback warning.
- [ ] Replace summary/ebook fetches with catalog, search index, route API, and chapter artifact fetches.
- [ ] Keep the existing animated full-chapter book experience and synchronized pages.
- [ ] Remove browser API-key settings and unused state/functions.
- [ ] Add canonical citation and source/translator attribution to the result view.

### Task 9: Production documentation and final verification

**Files:**
- Modify: `README.md`
- Modify: `vite.config.js`
- Create: `public/_headers`
- Create: `docs/CORPUS.md`
- Create: `docs/DEPLOYMENT.md`

- [ ] Document local development, corpus regeneration, source policy, attribution, Cloudflare deployment, secret configuration, and update procedure.
- [ ] Add production security and caching headers.
- [ ] Run `npm run corpus:check`, `npm test`, `npm run lint`, and `npm run build` from a clean checkout.
- [ ] Serve the production build and manually verify home search, library navigation, deterministic fallback, chapter loading, highlighting, attribution, responsive layout, and direct refresh.
- [ ] Review the design requirement-by-requirement and fix every uncovered gap before completion.
