# Performance Results

## Run Metadata
- Date:3-11-2026
- Tester: Dennis Pierce
- Build/commit: Option A1 + A2 performance enhancements
- App mode tested: Browser

## Baseline vs Current

| Metric | Baseline | Current | Delta | Notes |
|---|---:|---:|---:|---|
| Longest main-thread task (ms) | 4874.57 | 1173.30 | -3701.27 (-75.93%) | Significant reduction in worst main-thread block. |
| Avg React commit duration (ms) | 683.03 | 1.40 | -681.63 (-99.80%) | Commit count increased; average cost dropped sharply. |
| Peak React commit duration (ms) | 859.70 | 978.40 | +118.70 (+13.81%) | Outlier max remains; percentile distribution improved (p95: 780.6 -> 0.9). |
| Pan/zoom smoothness (qualitative) | Choppy | Much improved, still slightly laggy | Improved | Matches user observation. |
| Click toggle latency (qualitative) | 2-3s | Little latency / acceptable | Improved | No functional regressions. |
| Search select latency (qualitative) | ~3s | Little latency / acceptable | Improved | No functional regressions. |

## Changes Evaluated
- Option A1: precompute geometry path strings once per data load.
- Option A2: split static vs dynamic map layers; memoized layer components.
- Scenario: load -> 10s pan/zoom -> 10 toggles -> 5 search selections.

Trace files:
- `qa/perf/optionA1-A2-chrome-performance.json.gz`
- `qa/perf/optionA1-A2-react-performance.json`


## Regressions Check
- Import/export/reset: pass
- Tooltip behavior: pass
- Search behavior: pass
- Visual correctness: pass

## Decision
- [ ] Option A sufficient (no Option B needed)
- [x] Partial improvement; continue Option A work
- [ ] Proceed to Option B fallback

## Notes
- Noticeable improvement in all UX behavior. Search and click behavior feels acceptable with little latency. Zoom/pan is much improved, but is still a little laggy.
- Next recommended step: implement A3/A4 (stabilize callbacks/derived props and throttle tooltip updates via `requestAnimationFrame`) before considering Option B.
