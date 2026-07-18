# Hybrid Scripture Routing and OpenAI Provider Design

## Goal

Return a passage that is contextually related to the user's whole question, not merely a verse containing one overlapping word. The system must search the complete 27,595-verse corpus, remain source-bound, and support OpenAI without making the browser aware of any model API key.

## Retrieval architecture

The browser continues to download the static search index and searches every verse. Each search document will expose separate `summary` and `translation` fields so the ranker can weight the exact verse substantially more than surrounding section prose.

The deterministic ranker will:

- normalize phrases and expand common real-world intents such as handling anxiety, fear of lost time, success, failure, career, effort, and results;
- score exact verse text, title, section summary, phrase matches, and curated intent anchors independently;
- reject zero-signal candidates;
- retrieve a broad pool from the full corpus;
- produce a diverse final set of 40 passages, limiting repeated verses from the same chapter and preventing one large book from crowding out the rest;
- preserve strong intent anchors such as Bhagavad Gita 2.47 for outcome anxiety and 6.35/6.40 for restless-mind and failed-effort concerns.

The candidate count is a quality target, not a corpus-search limit: every indexed verse is scored. Forty compact, diverse candidates give the semantic reranker enough breadth without sending the full corpus on every request.

## Provider architecture

The Cloudflare Pages Function remains the only component allowed to call model providers.

- If `OPENAI_API_KEY` exists, call the OpenAI Responses API and default to `gpt-5.6-terra`; allow `OPENAI_MODEL` to override it.
- Otherwise, if `GEMINI_API_KEY` exists, use the existing Gemini API and optional `GEMINI_MODEL` override.
- Require the existing `AI_RATE_LIMITER` binding for either provider.
- Ask the model to select exactly one supplied candidate and return `bookId`, `chapterId`, `verseId`, and a short `routingReason`.
- Validate the returned identifier against the supplied candidate set. Provider errors, invalid JSON, timeouts, or invalid selections fall back to the deterministic local winner.

The request boundary will accept at most 40 candidates and a 96 KiB JSON body. Candidate fields remain length-bounded. These are abuse and reliability bounds, not relevance shortcuts.

## Data flow

1. Search all corpus documents locally.
2. Build a broad ranked pool, then diversify it to 40 candidates.
3. POST those candidates to `/api/route`.
4. Cloudflare chooses OpenAI first, Gemini second.
5. The model selects only from supplied source-backed IDs.
6. The client loads the cited chapter and verifies that the selected verse exists before rendering the full chapter with that verse highlighted.
7. If any remote step fails, use the highest-ranked local candidate.

## Accuracy regression

The exact question about stress, time passing, and fear of never becoming successful must rank a relevant Bhagavad Gita passage ahead of Ramayana 6.63.41. Tests will also cover candidate diversity, provider priority, Gemini fallback, request limits, and invalid model selections.

## Configuration

Cloudflare production secrets and variables:

- `OPENAI_API_KEY` — optional until the user adds it; preferred when present.
- `OPENAI_MODEL` — optional, defaults to `gpt-5.6-terra`.
- `GEMINI_API_KEY` — existing fallback provider secret.
- `GEMINI_MODEL` — optional Gemini override.
- `AI_RATE_LIMITER` — required binding for remote reranking.

The browser receives none of these secrets.

## Verification

- Retrieval and API boundary tests pass.
- Corpus regeneration produces field-separated search documents.
- Corpus integrity checks pass.
- Lint and production build pass.
- Browser query verification shows a relevant Gita result for the reported failure case.

## Official OpenAI basis

OpenAI's current model guidance recommends GPT-5.6 Terra as the balance of intelligence and cost and supports the Responses API. The adapter uses the server-side Responses endpoint and a strict, source-bound JSON contract: <https://developers.openai.com/api/docs/models>.
