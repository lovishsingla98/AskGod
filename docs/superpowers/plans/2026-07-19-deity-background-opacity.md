# Deity Background Opacity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase the active rotating deity background opacity from `0.055` to the approved `0.07` and deploy it safely.

**Architecture:** Keep the existing background component and animation unchanged. Add a focused stylesheet regression test, then change the single CSS declaration and verify the complete production build.

**Tech Stack:** CSS, Vitest, Vite, Cloudflare Pages

---

### Task 1: Lock and apply the approved opacity

**Files:**
- Create: `tests/deity-background-style.test.js`
- Modify: `src/App.css:54-56`

- [ ] **Step 1: Write the failing regression test**

```js
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(import.meta.dirname, '../src/App.css'), 'utf8');

describe('deity background styling', () => {
  it('uses the approved subtle active-image opacity', () => {
    expect(css).toMatch(/\.deity-background-image\.active\s*\{[^}]*opacity:\s*0\.07;/s);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/deity-background-style.test.js`

Expected: FAIL because the current opacity is `0.055`.

- [ ] **Step 3: Apply the minimal CSS change**

```css
.deity-background-image.active {
  opacity: 0.07;
  transform: scale(1.045);
}
```

- [ ] **Step 4: Verify the change**

Run: `npm test -- --run && npm run lint && npm run build`

Expected: all tests pass, lint exits successfully, and Vite completes the production build.

- [ ] **Step 5: Commit and deploy**

```bash
git add src/App.css tests/deity-background-style.test.js
git commit -m "style: increase deity background visibility"
git push origin main
```

- [ ] **Step 6: Verify production**

Confirm `https://askgod.in/` returns HTTP 200 and its current CSS asset contains `.deity-background-image.active{opacity:.07`.
