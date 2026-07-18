# Hybrid Scripture Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Search the complete corpus with field-aware, diverse retrieval and support OpenAI-first semantic reranking with Gemini and deterministic fallbacks.

**Architecture:** Regenerate the search index with separate verse and section fields, rank all documents locally, diversify a broad pool to 40 candidates, and send only those compact source-backed candidates to a Cloudflare provider adapter. The server prefers OpenAI, falls back to Gemini, validates the selected ID, and leaves final chapter/verse validation in the client.

**Tech Stack:** React 19, Vite 8, Cloudflare Pages Functions, Vitest, OpenAI Responses API, Gemini GenerateContent API.

---

## File map

- `scripts/corpus/build-corpus.mjs`: emit field-separated search documents.
- `public/data/search-index.json`: regenerated production index.
- `src/services/scriptureEngine.js`: field-aware scoring and candidate diversification.
- `functions/api/providers.js`: isolated OpenAI/Gemini request and response adapters.
- `functions/api/route.js`: request validation, provider selection, and source-bound response validation.
- `tests/retrieval.test.js`: reported-query and diversity regressions.
- `tests/route-function.test.js`: boundary and provider-priority regressions.
- `.env.example`, `README.md`: Cloudflare provider configuration.

### Task 1: Field-separated search index

**Files:**
- Modify: `tests/corpus.test.js`
- Modify: `scripts/corpus/build-corpus.mjs`
- Regenerate: `public/data/search-index.json`

- [ ] **Step 1: Write the failing schema test**

Add an assertion that every production search document has non-empty `translation` and `summary` fields and that `text` is no longer required for new ranking.

- [ ] **Step 2: Verify the schema test fails**

Run: `npm test -- --run tests/corpus.test.js`

Expected: FAIL because current documents only expose `text`.

- [ ] **Step 3: Emit separate fields**

Change the search document construction to:

```js
searchDocuments.push({
  bookId: source.id,
  chapterId: chapter.id,
  verseId: verse.id,
  citation: verse.citation,
  title: `${source.title} — ${chapter.title}`,
  summary: section.summary,
  translation: verse.translation
});
```

- [ ] **Step 4: Regenerate and verify**

Run: `npm run corpus:build && npm run corpus:check && npm test -- --run tests/corpus.test.js`

Expected: corpus checks and test pass.

### Task 2: Full-corpus field-aware and diverse retrieval

**Files:**
- Modify: `tests/retrieval.test.js`
- Modify: `src/services/scriptureEngine.js`

- [ ] **Step 1: Write failing regressions**

Add a golden query asserting the reported stress/time/success question ranks `gita:2:47`, `gita:6:35`, or `gita:6:40` first and never `ramayana:6.63:41`. Add a diversity test asserting `selectDiverseCandidates(ranked, 40)` contains no more than three passages from one chapter and includes multiple books when available.

- [ ] **Step 2: Verify retrieval tests fail**

Run: `npm test -- --run tests/retrieval.test.js`

Expected: FAIL with Ramayana 6.63.41 first and missing `selectDiverseCandidates`.

- [ ] **Step 3: Implement field-aware scoring**

Score `translation` token matches at full weight, `summary` matches at reduced weight, title matches separately, and add expansions for `handle`, `stress`, `time`, `success`, `successful`, `failure`, `late`, `behind`, `effort`, and `future`. Add an intent anchor covering outcome anxiety and fear of never succeeding.

- [ ] **Step 4: Implement diversity selection**

Export `selectDiverseCandidates(ranked, limit = 40)` that keeps score order while capping chapters at three and books at eight on the first pass, then fills remaining slots from unused ranked candidates. In `routeQuery`, rank a broad pool of 120 documents and diversify it to 40.

- [ ] **Step 5: Verify retrieval tests pass**

Run: `npm test -- --run tests/retrieval.test.js`

Expected: all retrieval tests pass and the reported query resolves to a relevant Gita passage.

### Task 3: OpenAI-first provider adapter

**Files:**
- Create: `functions/api/providers.js`
- Modify: `tests/route-function.test.js`
- Modify: `functions/api/route.js`

- [ ] **Step 1: Write failing provider tests**

Mock `fetch` and assert: `OPENAI_API_KEY` chooses `https://api.openai.com/v1/responses`; Gemini is used when only `GEMINI_API_KEY` exists; no provider returns 503; invalid provider selections return 422; and 40 candidates are accepted while 41 are rejected.

- [ ] **Step 2: Verify provider tests fail**

Run: `npm test -- --run tests/route-function.test.js`

Expected: FAIL because OpenAI is unsupported and the current maximum is 12.

- [ ] **Step 3: Implement provider adapters**

Create `rerankWithOpenAI({ apiKey, model, prompt, signal })` using the Responses API with model default `gpt-5.4-nano`, low reasoning effort, and strict JSON-schema output. Create `rerankWithGemini(...)` by moving the existing Gemini request into the same module. Both return the parsed selection object.

- [ ] **Step 4: Update the Cloudflare boundary**

Accept up to 40 candidates and a 96 KiB request, keep every candidate field bounded, require `AI_RATE_LIMITER`, prefer OpenAI when configured, and fall back to Gemini if the OpenAI request fails and Gemini is available. Return a provider error only when every configured provider fails.

- [ ] **Step 5: Verify provider tests pass**

Run: `npm test -- --run tests/route-function.test.js`

Expected: all boundary and provider tests pass.

### Task 4: Configuration, integration, and production verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Verify: all changed code and generated data

- [ ] **Step 1: Document provider variables**

Add `OPENAI_API_KEY` and optional `OPENAI_MODEL` to `.env.example`. Document OpenAI-first/Gemini-fallback behavior and keep both keys server-side in Cloudflare.

- [ ] **Step 2: Run complete verification**

Run:

```bash
npm run corpus:check
npm test -- --run
npx oxlint src/services/scriptureEngine.js functions/api/route.js functions/api/providers.js tests/retrieval.test.js tests/route-function.test.js
npm run build
git diff --check
```

Expected: corpus checks pass, all tests pass, lint has no diagnostics, build exits zero, and diff check is clean.

- [ ] **Step 3: Verify the reported query in the browser**

Reload the local app, submit the exact reported question, and confirm the highlighted passage is contextually related to anxiety about time, effort, and success and is not Ramayana 6.63.41.

- [ ] **Step 4: Commit the implementation**

```bash
git add .env.example README.md scripts/corpus/build-corpus.mjs public/data/search-index.json src/services/scriptureEngine.js functions/api/route.js functions/api/providers.js tests/corpus.test.js tests/retrieval.test.js tests/route-function.test.js
git commit -m "feat: improve scripture routing and add OpenAI reranking"
```
