# Rotating Deity Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a barely visible, respectful five-deity background rotation to the empty home screen without reducing readability or mobile performance.

**Architecture:** Store five optimized WebP assets under the public asset tree. Render a home-only decorative layer from `App.jsx`, drive one active index with a ten-second interval, and let CSS handle crossfades, opacity, responsive cropping, stacking, and reduced motion.

**Tech Stack:** React 19, CSS, Vitest, built-in image generation, WebP optimization with `cwebp`, Vite.

---

### Task 1: Create production assets

**Files:**
- Create: `public/assets/deities/krishna.webp`
- Create: `public/assets/deities/shiva.webp`
- Create: `public/assets/deities/rama.webp`
- Create: `public/assets/deities/ganesha.webp`
- Create: `public/assets/deities/durga.webp`

- [ ] Generate five respectful landscape devotional portraits with consistent dark, cinematic lighting and no text or watermark.
- [ ] Inspect each image for subject accuracy and respectful presentation.
- [ ] Convert each final asset with `cwebp -q 76 -resize 1600 0 <input> -o <output>`.
- [ ] Run `identify public/assets/deities/*.webp` and `du -h public/assets/deities/*.webp` to verify valid dimensions and production weight.

### Task 2: Specify rotating behavior with tests

**Files:**
- Create: `tests/deity-background.test.js`
- Modify: `src/App.jsx`
- Modify: `src/App.css`

- [ ] Add a source-level test asserting all five asset paths, the home-only `deity-background` layer, a 10,000 ms rotation, `aria-hidden`, and reduced-motion handling.
- [ ] Add CSS assertions for inactive/active crossfade states, pointer-event suppression, low opacity, mobile treatment, and the reduced-motion media query.
- [ ] Run `npm test -- tests/deity-background.test.js` and confirm failure because the component and styles do not exist.

### Task 3: Implement the home background

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/App.css`

- [ ] Define the five asset paths and a `deityBackgroundIndex` state.
- [ ] Add an effect that skips rotation for reduced-motion users and otherwise advances the index every 10,000 ms with cleanup.
- [ ] Render all five decorative images only when `currentView === 'home'`, no result is open, and loading is false.
- [ ] Add CSS for full-viewport positioning, active crossfade, dark veil, slow scale drift, mobile cropping, and reduced-motion behavior.
- [ ] Run `npm test -- tests/deity-background.test.js` and confirm it passes.

### Task 4: Verify and deploy

**Files:**
- Verify the entire project and production deployment.

- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.
- [ ] Inspect the empty home page at desktop and 390×844 viewports, including a forced active-index switch.
- [ ] Commit on `codex/deity-background`, merge into `main`, verify again, and push `main`.
- [ ] Confirm Cloudflare serves the new asset bundle and all five WebP files.
