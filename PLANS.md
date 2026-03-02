# Plan & Milestones

## Implementation assumptions
- Stack: React + TypeScript + SVG + D3 utilities (`d3-zoom`, `d3-geo`, `topojson-client`).
- Desktop-first browser target: current Chrome, Safari, Firefox.
- Data checked into repo under `src/data/` before interaction milestones begin.
- Raw source inputs are provided in GeoJSON:
  - `data/raw/nj_municipalities.geojson`
  - `data/raw/nj_counties.geojson`

## Milestone 0 — Foundation decisions + project scaffold
Exit criteria:
- App scaffold committed and runs locally.
- Base layout exists: header, sidebar, map panel.
- Shared constants file created for visual tokens and thresholds.
- Basic state model established (`visitedIds`, `selectedId`, `transform`, label prefs).

Verification:
- `npm run dev` starts app and renders scaffold with placeholder map region.

## Milestone 1 — Data pipeline and map geometry
Tasks:
- Add scripts to ingest raw GeoJSON and produce TopoJSON assets.
- Load TopoJSON into app and render municipality polygons + county boundaries.
- Add county labels via centroids (acceptable if approximate).

Exit criteria:
- App renders all municipalities and county lines from processed data.
- Map fits viewport on initial load.
- County labels visible at full-state view.

Verification:
- Manual check for full NJ coverage and expected municipality count.
- Regeneration script produces deterministic output.
- Preserve source attribution/license notes in README.

## Milestone 2 — Pan/zoom and map controls
Tasks:
- Wire pan/zoom interactions with bounded min/max zoom.
- Implement `Zoom In`, `Zoom Out`, `Reset View`.
- Keep strokes non-scaling and readable.

Exit criteria:
- Wheel/trackpad zoom and click-drag pan work reliably.
- Reset consistently restores full-state fit.
- Current zoom `k` available in React state.

Verification:
- Manual interaction test on mouse + trackpad.
- Confirm stroke widths remain visually stable across zoom levels.

## Milestone 3 — Visited toggling and persistence
Tasks:
- Add click-to-toggle visited behavior.
- Add selected municipality highlight layer.
- Persist state to `localStorage` with versioned key (`nj-visits:v1`).
- Persist and restore last map transform (`x`, `y`, `k`) in MVP.

Exit criteria:
- Click toggles visited fill state.
- Selected municipality updates on click.
- Refresh restores visited data correctly.
- Refresh restores prior pan/zoom transform when persisted value is present.

Verification:
- Manual refresh test after toggling multiple municipalities.
- Validate malformed storage fallback (app recovers to defaults).
- Validate malformed transform fallback (app resets to fit view).

## Milestone 4 — Search, results, and hover tooltip
Tasks:
- Build normalized search index for municipality/county names.
- Add results list with keyboard navigation.
- Selecting result toggles visited, sets selected, and recenters map.
- Add hover tooltip with municipality/county text.

Exit criteria:
- Partial case-insensitive search returns expected matches.
- Keyboard search flow works (`Arrow`, `Enter`, `Esc`).
- Tooltip appears consistently on municipality hover.

Verification:
- Manual checks for duplicate municipality names across counties.
- Validate selection behavior from both click and search paths.

## Milestone 5 — Label gating and UI toggle
Tasks:
- Keep county labels always visible.
- Gate municipality labels by zoom threshold constant.
- Add `Show municipality labels` override toggle.

Exit criteria:
- Municipality labels appear automatically above threshold.
- Override toggle forces labels on below threshold.
- No severe rendering slowdown at statewide view.

Verification:
- Manual threshold checks near boundary values (just below/above `k`).
- Performance sanity check during pan at full label visibility.

## Milestone 6 — PNG export (current viewport)
Tasks:
- Implement export pipeline from current SVG view to PNG.
- Ensure output includes transform, fills, and visible labels.
- Trigger browser download with date-stamped filename.

Exit criteria:
- PNG export reflects exactly what user sees in map viewport.
- Export works in current Chrome, Safari, Firefox desktop.

Verification:
- Manual compare of exported image vs on-screen state in each browser.

## Milestone 7 — Hardening and release prep
Tasks:
- Add empty/error states for data load and storage parse failures.
- Add accessibility pass for controls and search list.
- Add concise README sections: run app, data regeneration, known limitations.

Exit criteria:
- No critical runtime errors in normal flows.
- Core interactions are keyboard accessible.
- Documentation supports clean setup on a fresh machine.

Verification:
- Run lint/typecheck/tests (as configured).
- End-to-end manual smoke test:
  - toggle municipalities
  - reload and verify persistence
  - search and navigate
  - export PNG

## Milestone 8 — Label UX refinement
Tasks:
- Implement municipality label text normalization for display-only labels:
  - remove trailing `Borough`
  - replace trailing `Township` with `TWP`
- Add compact label formatting:
  - reduce municipality label font size slightly
  - allow two-line wrapping with SVG `tspan`
  - avoid labels that require 3+ lines
- Add border-aware placement:
  - detect municipalities near the NJ outer border
  - place labels with outward offsets and side-aware anchors
- Add density management:
  - introduce zoom-tiered municipality label density in dense regions
  - add lightweight collision suppression (grid/bbox overlap filtering)
- Add small documented hot-spot overrides for dense counties (Camden/Hudson/Essex).

Exit criteria:
- Camden County is visibly more readable at default municipality-label zoom than Milestone 5 behavior.
- `Borough` is removed and `Township` is abbreviated to `TWP` in municipality labels.
- Border municipalities (for example Atlantic City, Wildwood) can render outward-facing labels.
- Search, tooltip, visited state, and export behavior remain functionally correct.
- No severe pan/zoom performance regression with municipality labels visible.

Verification:
- Manual visual comparisons before/after in dense regions (Camden, Hudson, Essex).
- Manual checks for display-name normalization correctness on representative municipalities.
- Manual checks that tooltip/search still use canonical municipality names.
- Manual export comparison to confirm label rendering in PNG matches on-screen state.
- Performance sanity check while panning at label-heavy zoom levels.

## Risk register
- Data property instability:
  - Mitigation: lock stable source ID mapping and document it in pipeline script.
- SVG export inconsistency across browsers:
  - Mitigation: test export implementation in all target browsers early (Milestone 6).
- Label clutter/perf when forced on:
  - Mitigation: keep simple font sizing rules and allow quick toggle off.

## Definition of done (MVP)
- All milestones 0-7 complete.
- Acceptance checks pass.
- README documents setup + data regeneration + feature scope.
