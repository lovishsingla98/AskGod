# Rotating Deity Background Design

## Visual thesis

Respectful, realistic devotional portraits emerge almost imperceptibly from AskGod's existing black-and-gold atmosphere, adding sacred presence without competing with the question or search box.

## Content plan

The existing header, hero copy, search, and quick prompts remain unchanged. A decorative full-viewport layer appears only on the empty home state and rotates through Krishna, Shiva, Rama, Ganesha, and Durga. Each image contains no text, logo, watermark, or UI.

## Interaction thesis

- Crossfade sequentially every ten seconds with a slow, restrained scale drift.
- Keep perceived image visibility around 4–6% under a dark readability veil.
- If `prefers-reduced-motion: reduce` is active, show the first image statically and do not start the rotation timer.

## Implementation

Five generated landscape assets are compressed to WebP and stored in `public/assets/deities/`. `App.jsx` owns the small rotation index and renders the decorative layers only when the empty home view is active. `App.css` positions the imagery behind all content, maintains contrast, adapts cropping on mobile, and disables transitions for reduced motion.

## Production constraints

- The layer is `aria-hidden` and cannot intercept pointer input.
- Images use `object-fit: cover`; the first image is eager and later images are lazy.
- The current foreground stacking order remains intact.
- Total optimized asset weight should remain reasonable for a landing page; individual WebP files target well below 500 KB where visual quality permits.
