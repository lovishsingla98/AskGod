# Home Hero and Mobile Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved home-page message and deliver a polished phone layout for all primary views.

**Architecture:** Keep the React structure and existing desktop styles. Change only hero markup and add focused mobile CSS overrides at the end of the stylesheet so the desktop design remains stable and mobile behavior is easy to audit.

**Tech Stack:** React 19, CSS media queries, Vitest, Vite, in-app browser verification.

---

### Task 1: Approved hero message

**Files:**
- Modify: `src/App.jsx`
- Test: `tests/ui-copy.test.js`

- [ ] Add a test that reads `src/App.jsx` and asserts all three approved sentences are present.
- [ ] Run `npm test -- --run tests/ui-copy.test.js` and verify it fails.
- [ ] Replace the existing hero heading and subtitle with the approved heading, divine-books supporting line, and belief line.
- [ ] Run the focused test and verify it passes.

### Task 2: Phone layout

**Files:**
- Modify: `src/App.css`

- [ ] Add mobile overrides for header, main spacing, hero typography, search bar, quick tags, result header, stacked reader panels, library grid/cards, footer, and overflow containment at 800px and 480px.
- [ ] Run `npm run lint`, `npm test`, and `npm run build`; all must pass.
- [ ] Verify at phone width that the page has no horizontal overflow, the hero is legible, controls have usable touch sizes, and routed chapters retain the highlighted verse.
- [ ] Verify desktop width still renders the existing composition.

### Task 3: Release

**Files:**
- Modify: implementation and test files above

- [ ] Run `git diff --check` and the complete validation suite.
- [ ] Commit the verified change with `feat: improve home hero and mobile layout`.
