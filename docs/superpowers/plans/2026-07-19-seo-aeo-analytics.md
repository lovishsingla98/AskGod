# AskGod SEO, AEO, and Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `askgod.in` fully discoverable, provide crawlable scripture pages, instrument the core product journey, and create a production PostHog dashboard.

**Architecture:** Keep the current Vite SPA intact and add a deterministic build-time SEO generator that emits discovery HTML, sitemaps, and answer-engine metadata from the existing validated corpus. Add a small analytics service around the existing PostHog client, then create saved PostHog insights filtered to the custom domain and attach them to a pinned dashboard.

**Tech Stack:** React 19, Vite 8, Node.js build scripts, Vitest, Cloudflare Pages, PostHog JavaScript SDK and MCP.

---

### Task 1: Search metadata and discovery files

**Files:**
- Create: `src/seo/siteMetadata.js`
- Create: `scripts/seo/build-seo.mjs`
- Create: `tests/seo-build.test.js`
- Modify: `index.html`
- Modify: `package.json`
- Modify: `public/_headers`

- [ ] **Step 1: Write failing metadata/build tests**

Assert that the production build contains the `askgod.in` canonical URL, unique title and description, Open Graph tags, JSON-LD, `robots.txt`, `llms.txt`, sitemap index, a library page, book pages, and chapter pages. Assert that raw `/data/*` responses receive `X-Robots-Tag: noindex`.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- tests/seo-build.test.js`

Expected: failures for missing canonical metadata and generated discovery files.

- [ ] **Step 3: Implement metadata and deterministic generator**

Define a single canonical site configuration:

```js
export const SITE = {
  name: 'AskGod',
  origin: 'https://askgod.in',
  title: 'AskGod — Guidance from Divine Books',
  description: 'Ask a question and explore relevant guidance from the Bhagavad Gita, Upanishads, Ramayana, Yoga Sutras, and other divine books.',
}
```

Generate HTML with escaped corpus content, canonical links, breadcrumbs, attribution, and JSON-LD. Generate a sitemap index with bounded child sitemaps, `robots.txt`, and `llms.txt`. Run the generator after `vite build` through the package build script.

- [ ] **Step 4: Run focused tests and build**

Run: `npm test -- tests/seo-build.test.js && npm run build`

Expected: all focused tests pass and `dist/` contains root plus discovery artifacts.

- [ ] **Step 5: Commit metadata and generator**

```bash
git add src/seo/siteMetadata.js scripts/seo/build-seo.mjs tests/seo-build.test.js index.html package.json public/_headers
git commit -m "feat: add crawlable SEO and AEO discovery layer"
```

### Task 2: Visible explanatory and answer content

**Files:**
- Create: `src/components/DiscoveryContent.jsx`
- Create: `src/components/DiscoveryContent.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/App.css`

- [ ] **Step 1: Write failing component tests**

Render the home view and assert that crawlable content includes a concise explanation, supported divine books, responsible-use wording, and visible FAQ answers matching the root JSON-LD.

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- src/components/DiscoveryContent.test.jsx`

Expected: failure because the discovery component does not exist.

- [ ] **Step 3: Implement the restrained below-fold content**

Add a semantic `<section>` and `<details>` FAQ elements below the primary interaction. Keep the current hero unchanged, use existing typography/colors, and avoid testimonials, ratings, medical promises, or hidden content.

- [ ] **Step 4: Run component tests**

Run: `npm test -- src/components/DiscoveryContent.test.jsx`

Expected: component test passes.

- [ ] **Step 5: Commit visible discovery content**

```bash
git add src/components/DiscoveryContent.jsx src/components/DiscoveryContent.test.jsx src/App.jsx src/App.css
git commit -m "feat: add accessible discovery content"
```

### Task 3: Privacy-conscious product analytics

**Files:**
- Create: `src/services/analytics.js`
- Create: `src/services/analytics.test.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: Write failing analytics tests**

Mock PostHog and assert bounded events for `question_submitted`, `guidance_received`, `guidance_failed`, `library_viewed`, `chapter_opened`, `language_changed`, and `outbound_book_link_clicked`. Verify that raw question and verse text are never included.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- src/services/analytics.test.js`

Expected: failure because the analytics wrapper does not exist.

- [ ] **Step 3: Implement analytics wrapper and event wiring**

Expose `captureProductEvent(name, properties)` with an explicit event allowlist and property sanitization. Wire it to successful and failed search flows, library navigation, chapter opening, language controls, and outbound purchase links.

- [ ] **Step 4: Run analytics and application tests**

Run: `npm test -- src/services/analytics.test.js && npm test`

Expected: all tests pass without transmitting user-entered text.

- [ ] **Step 5: Commit analytics instrumentation**

```bash
git add src/services/analytics.js src/services/analytics.test.js src/App.jsx
git commit -m "feat: instrument guidance product journey"
```

### Task 4: PostHog production dashboard

**External resources:**
- Current PostHog project `443384`
- Canonical event host `askgod.in`

- [ ] **Step 1: Verify event and property taxonomy**

Use PostHog schema tools to verify `$pageview`, `$web_vitals`, the newly instrumented product events, `$host`, `$device_type`, `$geoip_country_name`, and `$referring_domain`.

- [ ] **Step 2: Create the pinned dashboard**

Create `AskGod — Production Overview` with the description “Traffic, guidance engagement, answer reliability, acquisition, and experience quality for askgod.in.”

- [ ] **Step 3: Create and attach saved insights**

Create domain-filtered insights for unique visitors, pageviews, questions, guidance received, failures, question-to-guidance funnel, books opened, language use, referrers, devices, countries, and web vitals. Use a 30-day default range and appropriate daily intervals.

- [ ] **Step 4: Run the dashboard and verify tiles**

Use the dashboard run tool with blocking refresh. Confirm each tile executes; empty new-event tiles are acceptable until the instrumented deployment receives traffic.

### Task 5: Domain, quality, and deployment verification

**Files:**
- Modify if authenticated access exists: Cloudflare hostname redirect configuration

- [ ] **Step 1: Run the full local quality suite**

Run: `npm run lint && npm test && npm run corpus:check && npm run build`

Expected: zero lint/test/corpus/build failures.

- [ ] **Step 2: Validate generated HTML and links**

Check canonical URLs, JSON-LD parsing, sitemap URL counts, local discovery links, robots directives, and that no sitemap URL targets the old hostname.

- [ ] **Step 3: Configure the hostname redirect when available**

Use authenticated Cloudflare tooling to redirect only `askgod.pages.dev/*` to `https://askgod.in/$1` with a permanent status. Do not implement a host-agnostic Pages `_redirects` rule that would loop on the custom domain.

- [ ] **Step 4: Commit and push implementation**

```bash
git add -A
git commit -m "feat: make askgod.in search and analytics ready"
git push origin main
```

- [ ] **Step 5: Verify production**

Confirm `https://askgod.in/robots.txt`, sitemap files, representative book/chapter pages, canonical tags, structured data, custom-domain API behavior, and new PostHog events. Record any unavoidable Search Console ownership action for the user.
