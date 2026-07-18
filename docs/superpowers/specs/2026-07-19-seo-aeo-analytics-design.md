# AskGod SEO, AEO, and Analytics Design

## Goal

Make `https://askgod.in` the canonical production website, expose useful scripture content to search and answer engines, and provide an operational PostHog dashboard for the new domain without changing the current core experience.

## Search architecture

The interactive React application remains the main experience. Build-time scripts generate crawlable HTML discovery pages from the validated local corpus: a library index, one page per book, and one page per chapter. Each page contains a unique title, description, canonical URL, breadcrumb links, source attribution, and representative chapter content.

The root document receives complete title, description, canonical, social-preview, and structured-data metadata. `robots.txt` points crawlers to a sitemap index. The sitemap covers the homepage and generated discovery pages. Raw corpus JSON is marked `noindex` to avoid duplicate search results.

## Answer-engine optimization

The homepage gains concise, visible explanatory and frequently asked question content below the primary interaction. Structured data describes the website, homepage, and visible FAQ content. An `llms.txt` file gives answer engines a plain-language description, canonical links, corpus scope, and attribution rules. Claims remain grounded in the actual product and corpus.

No fabricated testimonials, ratings, or hidden keyword content will be created. Review structured data will only be added when genuine reviews exist and can be shown to users.

## Domain behavior

All generated canonical URLs use `https://askgod.in`. The Cloudflare Pages Function continues to enforce same-origin requests dynamically, so the custom domain requires no API code exception. The old Pages hostname should redirect to the custom domain through Cloudflare account-level redirect configuration when authenticated management access is available.

## Product analytics

Client analytics will capture explicit product events for question submission, successful guidance, failures, library navigation, chapter opening, language selection, and outbound purchase links. Events contain bounded operational properties such as book identifier, chapter identifier, language, provider, and failure category; question text and verse text are not transmitted.

A pinned PostHog dashboard for `askgod.in` will contain trends and funnels for visitors, questions, successful answers, answer success rate, library activity, book and language usage, acquisition sources, devices, geography, and web vitals. All domain-specific insights filter on the verified `$host` property.

## Quality and verification

Tests validate canonical metadata, robots directives, sitemap coverage, structured data, generated page uniqueness, and analytics wiring. The production build must pass existing tests, linting, corpus validation, and link/metadata checks. After deployment, production responses and PostHog ingestion will be verified against `askgod.in`.
