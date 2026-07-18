# Whole-Question Relevance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the reported anxiety/time/success question surface Gita 2.40 for semantic comparison and remove duplicated verse citations in the reader.

**Architecture:** Keep the existing hybrid pipeline. Correct the deterministic intent anchor that constructs candidates, add explicit whole-question selection criteria to the server prompt, and normalize citation prefixes at `fetchChapter`, the shared data boundary used by search and library reading.

**Tech Stack:** React 19, Cloudflare Pages Functions, Vitest, Vite.

---

### Task 1: Retrieval regression

**Files:**
- Modify: `tests/retrieval.test.js`
- Modify: `src/services/scriptureEngine.js`

- [ ] Add a test asserting the exact reported question ranks `gita:2:40` first and includes it in the diverse candidate set.
- [ ] Run `npm test -- tests/retrieval.test.js` and confirm the assertion fails with the current `gita:2:47` anchor.
- [ ] Replace the incorrect anxiety/time/success anchor target with `gita:2:40`.
- [ ] Re-run `npm test -- tests/retrieval.test.js` and confirm it passes.

### Task 2: Whole-question reranker criteria

**Files:**
- Modify: `tests/route-function.test.js`
- Modify: `functions/api/route.js`

- [ ] Add a test that captures the OpenAI request and asserts its prompt requires distinct concern coverage, direct reassurance, and avoidance of fame bias.
- [ ] Run `npm test -- tests/route-function.test.js` and confirm the prompt assertion fails.
- [ ] Update the reranker prompt with those criteria without changing its response schema.
- [ ] Re-run `npm test -- tests/route-function.test.js` and confirm it passes.

### Task 3: Citation normalization

**Files:**
- Modify: `tests/retrieval.test.js`
- Modify: `src/services/scriptureEngine.js`

- [ ] Add tests for English `2.47`, Hindi `।।2.47।।`, and text that does not begin with an exact citation.
- [ ] Run `npm test -- tests/retrieval.test.js` and confirm the missing normalizer fails.
- [ ] Export `stripLeadingCitation` and apply it to `translation` and `hindi` in `fetchChapter`.
- [ ] Re-run the retrieval tests and confirm they pass.

### Task 4: Verification and delivery

**Files:**
- Verify all modified files and generated build output.

- [ ] Run `npm test`, `npm run lint`, `npm run build`, `npm run corpus:check`, and `git diff --check`.
- [ ] Commit the implementation on `codex/relevance-roi`.
- [ ] Merge into `main`, run the full verification again, push `main`, and send the exact production question through the deployed route.
