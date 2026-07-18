# Whole-Question Relevance Design

## Goal

Improve the highest-value failure mode in scripture selection: a famous, related verse winning even when another supplied verse answers the user's complete emotional concern more directly. Remove duplicated citation prefixes from rendered translations at the same time.

## Root cause

The local retriever explicitly boosts Gita 2.47 for questions combining anxiety with time or success. Candidate diversity then limits Gita chapter 2 to three passages, excluding 2.40 before the OpenAI reranker can compare it. Separately, several source translations already begin with their citation while the reader prints the citation independently.

## Design

- Change the narrow anxiety/time/success intent anchor from Gita 2.47 to Gita 2.40, whose text directly reassures that sincere effort is not wasted. This guarantees 2.40 reaches the semantic reranker without hard-coding the final API selection.
- Strengthen the reranker instruction to identify all distinct concerns, prefer passages covering the least-addressed concern, and favor direct reassurance over fame or generic thematic overlap.
- Normalize English and Hindi translation strings when a chapter is loaded, removing only an exact leading copy of that verse's citation. Preserve the source files and all other text.
- Add deterministic regressions for the exact user question, candidate inclusion, reranker criteria, and citation normalization.

## Success criteria

- Gita 2.40 is the strongest local candidate for the reported question and remains in the diverse 40-candidate set.
- The OpenAI prompt explicitly asks for whole-question facet coverage and direct reassurance.
- `2.47 But...` renders as `But...` beside the separately displayed `2.47.` label; Hindi `।।2.47।।` is similarly cleaned.
- Existing retrieval goldens, API boundary tests, corpus checks, lint, and build continue to pass.
