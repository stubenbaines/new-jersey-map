# Perf Baseline Runbook (Sprint Step 1)

Use this runbook to capture a consistent baseline before optimization work.

## 1) Environment
- App mode: browser (`npm run dev`) and optionally Tauri (`npm run tauri:dev`)
- Device: record machine model + OS in `baseline-notes.md`
- Browser: Chrome stable, no extensions if possible

## 2) Scenario Script (run in this exact order)
1. Fresh load at default view.
2. Pan/zoom continuously for 10 seconds.
3. Click-toggle 10 municipalities in mixed-density areas.
4. Perform 5 search selections from sidebar search.

## 3) Chrome Performance Trace
1. Open DevTools -> Performance.
2. Start recording.
3. Execute the scenario script.
4. Stop recording.
5. Save trace export as:
   - `qa/perf/baseline-chrome-performance.json`

Metrics to capture from trace:
- Longest main-thread task (ms)
- Approximate frame drops/jank notes during pan/zoom
- Any obvious hot functions/components

## 4) React Profiler Trace
1. Open React DevTools -> Profiler.
2. Start profiling.
3. Execute the same scenario script.
4. Stop profiling.
5. Export profile as:
   - `qa/perf/baseline-react-profiler.json`

Metrics to capture:
- Average commit duration (ms)
- Peak commit duration (ms)
- Components with highest render cost/frequency

## 5) Write Baseline Notes
- Fill in:
  - `qa/perf/baseline-notes.md`

## 6) Result Handoff
- After Option A changes, repeat this exact process and fill:
  - `qa/perf/results.md`
