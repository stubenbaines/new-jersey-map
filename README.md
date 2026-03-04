# NJ Visits Tracker

Desktop-first web app for tracking visited New Jersey municipalities.

## Requirements
- Node.js 20+
- npm 10+
- Python 3.9+

## Run Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build normalized map data from raw GeoJSON:
   ```bash
   npm run prepare:data
   ```
3. Start development server:
   ```bash
   npm run dev
   ```
4. Open the local URL printed by Vite.

## Data Regeneration
Raw source files are expected at:
- `data/raw/nj_municipalities.geojson`
- `data/raw/nj_counties.geojson`

To regenerate app data after replacing raw files:
```bash
npm run prepare:data
```

This writes:
- `public/data/nj-geometry.json`

## Build
```bash
npm run build
```

## Tauri Desktop (Optional)
Prerequisites:
- Rust toolchain (`rustc`, `cargo`)
- Tauri CLI:
  ```bash
  cargo install tauri-cli --locked
  ```

Run desktop app in dev mode:
```bash
npm run tauri:dev
```

Build Windows installer (NSIS) on a machine with Windows toolchain:
```bash
npm run tauri:build
```

## Current Feature Scope (MVP through Milestone 9)
- Municipality + county map rendering
- Pan/zoom controls and gestures
- Click to toggle visited municipalities
- localStorage persistence
- Search with keyboard navigation
- Hover tooltip
- County labels (municipality on-map labels removed)
- PNG export of current map viewport
- Text-area import of visited municipalities (`Municipality, County`, comma or tab-delimited)
- CSV export of visited municipalities (county-grouped, alphabetical)
- Reset progress action (clears local state + resets view)
- Recovery UI for data load failures and storage parse/save failures

## Known Limitations
- SVG-to-PNG export behavior is browser-dependent and should be validated across target browsers.
- Desktop-first UX; mobile optimization is not yet a goal.

## Desktop Packaging Spike
- Recommendation and comparison for Electron vs Tauri:
  - `docs/desktop-packaging-spike.md`
- CI workflow for Windows installer builds:
  - `.github/workflows/tauri-windows.yml`
