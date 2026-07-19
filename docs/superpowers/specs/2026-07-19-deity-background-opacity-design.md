# Deity Background Opacity Adjustment

## Objective

Make the rotating deity background images slightly more visible without reducing foreground readability or changing the existing visual behavior.

## Design

- Change `.deity-background-image.active` opacity from `0.055` to `0.07`.
- Preserve the existing background veil, saturation, contrast, scale, crossfade timing, rotation interval, layout, and responsive behavior.
- Apply the same value at every viewport size; no mobile-specific override is needed.

## Verification

- Confirm the stylesheet contains the approved `0.07` active-image opacity.
- Run the existing test suite, linter, and production build.
- Verify the deployed asset contains the updated value and the homepage remains available.
