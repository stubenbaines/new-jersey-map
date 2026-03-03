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
- Basic state model established (`visitedIds`, `selectedId`, `transform`).

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

## Milestone 5 — County labels + tooltip UX
Tasks:
- Keep county labels always visible.
- Keep municipality hover tooltip behavior stable and readable.

Exit criteria:
- County labels remain visible across interactions.
- Tooltip appears reliably on hover and does not regress click/search workflows.

Verification:
- Manual hover checks in dense and sparse areas.
- Performance sanity check during pan/zoom with county labels shown.

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

## Milestone 8 — Import/export list workflow + reset
Tasks:
- Add text-area based import UI for visit list entries.
- Parse per-line `Municipality, County` and tab-delimited equivalents.
- Match rows case-insensitively against canonical municipality/county data.
- Apply matched rows to visited set (deduped).
- Capture unmatched rows and display them in the UI as import issues.
- Add export action for current visited municipalities in `Municipality, County` lines.
- Ensure export is grouped by county and alphabetically sorted.
- Add reset action that clears visited state, clears persisted storage, and resets view.
- Remove municipality on-map text labels from runtime behavior and related UI controls.

Exit criteria:
- Import accepts valid lines and updates visited state accurately.
- Unmatched rows are listed clearly and do not block successful matches.
- Export output order is deterministic (county-grouped + alphabetical).
- Reset reliably clears local state and returns full-state map view.
- Search, tooltip, and county labels remain unchanged in behavior.

Verification:
- Manual import tests:
  - valid rows only
  - mixed valid/invalid rows (for example non-canonical places)
  - duplicate entries
  - tab-delimited entries
- Manual export tests for sort/group order and line format.
- Manual reset test verifying both UI and `localStorage` are cleared.

## Milestone 9 — Map aspect ratio validation (low priority)
Tasks:
- Audit projection fit/scale and viewport dimensions for vertical distortion.
- Compare rendered map proportions against trusted source geometry bounds.
- Adjust fit logic if needed without regressing pan/zoom behavior.

Exit criteria:
- NJ map no longer appears vertically squished at default view.
- Any projection/fit changes preserve interaction behavior and export output.

Verification:
- Before/after screenshot comparison at reset view.
- Manual check of county and municipality boundary alignment after change.

## Milestone 10 — Desktop packaging feasibility spike
Tasks:
- Evaluate Electron and Tauri packaging paths for a Windows-targeted standalone app.
- Document setup complexity, bundle size/runtime footprint, update/distribution options, and maintenance overhead.
- Recommend one path with rationale and a phased adoption plan.

Exit criteria:
- Written recommendation committed to repo.
- Decision includes explicit tradeoffs and MVP impact.
- No production packaging implementation required in this milestone.

Verification:
- Review recommendation doc for completeness and technical accuracy.

## Risk register
- Data property instability:
  - Mitigation: lock stable source ID mapping and document it in pipeline script.
- SVG export inconsistency across browsers:
  - Mitigation: test export implementation in all target browsers early (Milestone 6).
- Import mismatch confusion:
  - Mitigation: show unmatched rows with clear reasons and preserve successful imports.
- Desktop packaging scope creep:
  - Mitigation: keep Milestone 10 as recommendation-only spike.

## Definition of done (MVP)
- All milestones 0-8 complete.
- Acceptance checks pass.
- README documents setup + data regeneration + feature scope.
