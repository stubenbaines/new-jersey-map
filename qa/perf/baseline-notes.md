# Baseline Notes

Date:3-11-2026
Tester:Dennis Pierce

## Environment
- App mode: Browser
- Device:MacBook Pro (Retina, 15-inch, Mid 2015) 16GB 2.2GHz Intel
- OS:macOS 12.7.6
- Browser + version: Chrome 145.0.7632.160
- Node version: v24.14.0

## Scenario
- Script used: load -> 10s pan/zoom -> 10 toggles -> 5 search selections
- Dataset version: `public/data/nj-geometry.json` (current repo state)

## Chrome Performance Summary
- Trace file: `baseline-chrome-performance.json.gz`
- Longest main-thread task (ms): 4874.57
- Pan/zoom smoothness notes: Pan and zoom works, but is choppy.
- Observed hot spots: Long `RunTask` blocks on main thread during interaction windows.

## React Profiler Summary
- Profile file: `baseline-react-profiler.json.json`
- Average commit duration (ms): 683.03 (108 commits)
- Peak commit duration (ms): 859.70
- High-cost components: `NJMap` (dominant render cost), `App` (minor by comparison)

## Interaction Latency Notes
- Click toggle perceived latency: 2-3 seconds
- Search select perceived latency: ~3 seconds
- Tooltip hover smoothness: Very smooth

## Issues / Anomalies
- React profile export filename is `baseline-react-profiler.json.json` (double extension from export flow).

## Baseline Conclusion
- Primary bottleneck hypothesis: expensive rerenders in `NJMap` (large SVG path tree) causing heavy main-thread work.
- Recommended Option A focus order:
  1. A1 precompute geometry path strings once
  2. A2 separate static and dynamic map layers to reduce rerenders
  3. A3/A4 stabilize callbacks and throttle hover update cadence
