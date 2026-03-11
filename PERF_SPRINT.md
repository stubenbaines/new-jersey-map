# Performance Enhancement Sprint

Date: 2026-03-04  
Status: Draft  
Scope: Post-MVP optimization pass for interaction smoothness and render latency.

## 1) Sprint Goal
Improve perceived responsiveness of the map UI without changing product behavior.

Primary focus:
- Pan/zoom smoothness
- Click/search toggle responsiveness
- Initial render cost after data load

## 2) Success Metrics
Target metrics on a typical laptop (desktop browser and Tauri shell):
- Pan/zoom interaction: near-60fps feel in normal usage.
- Municipality toggle and search-select update: under 100ms perceived delay.
- Initial map render after data load: under 1s on warm run.
- No functional regressions in import/export/reset/search/tooltip behavior.

## 3) Constraints and Principles
- Keep behavior identical; this sprint is performance-only.
- Baseline before optimization.
- Make one optimization batch at a time and re-measure.
- Keep or revert based on measured impact.

## 4) Baseline Measurement Plan (Required First)
Run and record before any perf code changes:
1. Chrome DevTools Performance trace:
   - full-state load
   - 10 seconds pan/zoom
   - 10 municipality toggles
   - 5 search selections
2. React Profiler trace for same interaction set.
3. Capture:
   - Longest main-thread task
   - Average/peak React commit duration
   - Interaction latency notes (manual)

Artifacts to save:
- `qa/perf/baseline-chrome-performance.json` (if exported)
- `qa/perf/baseline-react-profiler.json` (if exported)
- `qa/perf/baseline-notes.md`

## 5) Option A (Primary Sprint Scope) — Runtime Quick Wins
This is the default implementation path for the sprint.

### A1. Precompute geometry path strings once
- Compute municipality and county `d` path strings once per data load (not per render).
- Store in memoized structures keyed by ID.
- Ensure hover/toggle/selection updates do not trigger path regeneration.

Expected win:
- Lower CPU cost on state updates and transform changes.

### A2. Separate static and dynamic render layers
- Static layers:
  - municipality outlines/base shapes
  - county boundaries
  - county labels
- Dynamic layers:
  - visited fills
  - selected municipality outline
  - hover tooltip
- Minimize rerenders in static layers when visited/selected state changes.

Expected win:
- Fewer React updates and smaller DOM diff work during interaction.

### A3. Stabilize props/callbacks and derived data
- Use `useMemo`/`useCallback` for expensive derived structures and handlers passed deep.
- Avoid new object/function identities unless dependencies changed.

Expected win:
- Reduced avoidable child rerenders.

### A4. Throttle hover tooltip updates
- Update tooltip position with `requestAnimationFrame` cadence.
- Keep hover text behavior identical.

Expected win:
- Smoother pointer movement and less event-driven re-render pressure.

### A5. Optional micro-optimizations (only if traces show need)
- Replace some per-render `.filter/.map` hot paths with pre-indexed lookup maps.
- Minimize string allocations inside tight interaction loops.

## 6) Option B (Fallback) — Build-Time Pre-Generated Assets
Only pursue if Option A gains are insufficient.

### B1. Build task to emit pre-generated SVG/path assets
- Add script to generate fixed projected path data at build time.
- App reads precomputed geometry instead of computing projection/path math at runtime.

### B2. Use pre-generated static SVG layer
- Render static map layer from pre-generated asset.
- Keep interactive layer for hit targets/visited state on top.

Risks:
- More build complexity.
- Harder to evolve projection/data pipeline.
- Still does not remove DOM paint cost of many path elements.

## 7) Execution Plan
1. Capture baseline traces and notes.
2. Implement A1 + A2.
3. Re-measure and compare.
4. Implement A3 + A4 if needed.
5. Re-measure and compare.
6. Decide go/no-go on Option B using measurable thresholds.

## 8) Exit Criteria
- At least 20-30% improvement in one or more primary hot paths from baseline
  or a clear qualitative jump in smoothness with no regressions.
- Measurements and conclusions documented in:
  - `qa/perf/results.md`
- Decision recorded:
  - `Option A sufficient` OR `Proceed to Option B`.

## 9) Non-Goals
- No feature additions.
- No visual redesign.
- No backend/data model changes unrelated to performance.

## 10) Risks and Mitigations
- Risk: Optimizing wrong area.
  - Mitigation: profiling-first approach with concrete traces.
- Risk: Regressions in interaction behavior.
  - Mitigation: existing manual smoke test after each optimization batch.
- Risk: Premature move to Option B.
  - Mitigation: Option B only after Option A measured shortfall.
