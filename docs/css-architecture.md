# CSS architecture

This repository is standardizing CSS ownership incrementally.

## Ownership rules

- `src/app.css` owns:
  - global design tokens
  - font-face declarations
  - resets and base element styles
  - app-shell layout and layering
  - shared utilities
- Component `<style>` blocks own:
  - component internals
  - component states and modifiers
  - component-local custom properties
  - component-level responsive behavior
- Parent components may style a child component root for placement and spacing.
- Parent components should not style a child component's internal descendants.

## Nesting rules

- Use native CSS nesting only.
- Prefer explicit descendant selectors such as `& .part` and `& > .part`.
- Keep nesting shallow.
- Order nested rules as:
  1. root declarations
  2. root self-states and pseudo-elements
  3. descendant selectors
  4. colocated `@container` or `@media`

## Declaration ordering

- Put component-local custom properties first.
- Alphabetize declarations within a block.
- Keep state, modifier, and descendant blocks grouped consistently.

## Linting rollout

Current CSS lint coverage is intentionally scoped to the component-local files standardized in this pass:

- `src/lib/components/Clock.svelte`
- `src/lib/components/Hero.svelte`
- `src/lib/components/LastUpdated.svelte`
- `src/lib/components/LottieWeatherIcon.svelte`
- `src/lib/components/SchoolMenu.svelte`
- `src/lib/components/SnowCap.svelte`
- `src/lib/components/SnowOverlay.svelte`
- `src/lib/components/SystemStatusStub.svelte`

`src/app.css` remains a documented migration target, but it is intentionally excluded from the first Stylelint rollout to avoid forcing unapproved repo-wide changes.

Expand the Stylelint target set as additional components are normalized.
