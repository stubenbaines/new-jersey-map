# Performance Results

## Run Metadata
- Date:3-11-2026
- Tester: Dennis Pierce
- Build/commit: Option A3 + A4 performance enhancements
- App mode tested: Browser

## Baseline vs Current

| Metric | Baseline | Current | Delta | Notes |
|---|---:|---:|---:|---|
| Longest main-thread task (ms) | 4874.57 | 1354.89 | -3519.68 (-72.20%) | Still massively improved vs baseline; slightly higher than A1+A2 run. |
| Avg React commit duration (ms) | 683.03 | 3.47 | -679.56 (-99.49%) | Higher than A1+A2 avg, but still very low in absolute terms. |
| Peak React commit duration (ms) | 859.70 | 1037.60 | +177.90 (+20.69%) | Outlier max is not representative; p95 is 1.3ms (vs 780.6ms baseline). |
| Pan/zoom smoothness (qualitative) |  |  |  | Zoom feels faster when using UX buttons compared to mouse, but overall smoothness was improved and acceptable |
| Click toggle latency (qualitative) |  |  |  | No detectable lag |
| Search select latency (qualitative) |  |  |  | No detectable lag |


## Changes Evaluated
- Option A3: stabilize map handlers with `useCallback`.
- Option A4: `requestAnimationFrame` throttling for tooltip move updates.
- Scenario: load -> 10s pan/zoom -> 10 toggles -> 5 search selections.

Trace files:
- `qa/perf/optionA3-A4-chrome-performance.json.gz`
- `qa/perf/optionA3-A4-react-performance.json`


## Regressions Check
- Import/export/reset: pass
- Tooltip behavior: pass
- Search behavior: pass
- Visual correctness: pass

## Decision
- [x] Option A sufficient (no Option B needed)
- [ ] Partial improvement; continue Option A work
- [ ] Proceed to Option B fallback

## Notes
- Performance across all UX interactions feels responsive and acceptable.
- Quantitative data supports stopping after Option A unless future profiling reveals new bottlenecks.
