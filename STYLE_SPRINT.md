# Style Sprint (Cosmetic Reskin + Readability Tweak)

Date: 2026-03-11  
Status: Draft  
Scope: Visual refresh only. No feature changes, no behavior changes.

## 1) Sprint Goal
Improve visual polish and readability while preserving existing UX flows and control layout.

Primary goals:
- Introduce a cleaner, lightly themed default visual style.
- Add an optional LCARS-inspired alternate skin.
- Keep county names readable above visited municipality fills.

## 2) Non-Goals
- No changes to core functionality (map interactions, import/export/reset, search behavior).
- No major layout restructuring or control reorganization.
- No performance work in this sprint unless style changes introduce regressions.

## 3) Design Strategy

### S1. Tokenized theming (foundation)
- Move color and style values into CSS custom properties.
- Define a common token set used by existing classes/components.
- Keep current HTML/JSX structure intact.

Token categories:
- App surfaces (`--bg-page`, `--bg-panel`, `--bg-map`)
- Text (`--text-primary`, `--text-muted`)
- Borders/dividers (`--border-1`, `--border-2`)
- Map colors (`--map-municipal-fill`, `--map-visited-fill`, `--map-county-stroke`, `--map-label`)
- Controls (`--btn-bg`, `--btn-border`, `--btn-text`, `--btn-hover-bg`)
- Feedback states (`--warning-bg`, `--warning-border`, `--error-text`)

### S2. Default theme (lightweight refresh)
- Keep current grayscale map language with red visited fill.
- Add subtle color accents for header/control areas.
- Improve button hierarchy and hover/active/focus states.
- Preserve high contrast and legibility.

### S3. Optional LCARS-inspired alternate theme
- Add a second theme variant using CSS variables only.
- Keep it toggleable and easy to disable (not hard-coded default).
- Do not force structural markup changes for strict LCARS fidelity.
- Accept “LCARS-inspired” rather than exact TV interface replication.

## 4) Readability Tweak (In Scope)
Problem:
- County labels can be visually obscured by visited red fills.

Fix:
1. Ensure county labels are rendered in top paint order (after visited fills).
2. Add label halo/outline (text stroke or shadow) for contrast over red fills.

Acceptance:
- County labels remain readable regardless of visited state beneath them.
- Example problematic counties (e.g., Middlesex) stay visible at typical zoom levels.

## 5) Implementation Plan
1. Add theme tokens in `src/styles.css`.
2. Refactor existing style rules to consume tokens.
3. Introduce theme hooks/selectors:
   - Default: `data-theme="default"`
   - Optional: `data-theme="lcars"`
4. Add minimal theme switch mechanism (small UI control or config constant).
5. Apply county-label top-layer/halo tweak in map rendering and CSS.
6. Validate no behavior regressions.

## 6) Validation Checklist
- Visual:
  - Default theme looks cleaner without layout changes.
  - LCARS-inspired theme applies correctly and is reversible.
  - County labels remain readable over visited fills.
- Functional regression:
  - Pan/zoom/click/search unchanged.
  - Import/export/reset unchanged.
  - Tooltip and PNG export unchanged.
- Accessibility:
  - Focus states remain visible.
  - Text contrast remains acceptable.

## 7) Exit Criteria
- `STYLE_SPRINT.md` tasks implemented with no functional regressions.
- Theme system supports at least two selectable skins.
- County-label readability issue resolved in normal use.
- Changes documented in `README.md` (theme usage and limitations).

## 8) Risks and Mitigations
- Risk: Theme logic introduces style drift or visual inconsistency.
  - Mitigation: centralize tokens and keep component class structure stable.
- Risk: LCARS visual language conflicts with existing layout constraints.
  - Mitigation: ship as optional alternate skin with limited fidelity.
- Risk: Readability fix accidentally hides interactivity layers.
  - Mitigation: adjust SVG paint order only; preserve hit-test layer behavior.
