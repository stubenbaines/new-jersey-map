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

## Current Feature Scope (MVP through Milestone 7)
- Municipality + county map rendering
- Pan/zoom controls and gestures
- Click to toggle visited municipalities
- localStorage persistence
- Search with keyboard navigation
- Hover tooltip
- Municipality label gating + override toggle
- PNG export of current map viewport
- Recovery UI for data load failures and storage parse/save failures

## Known Limitations
- Municipality label placement is simple centroid-based rendering; no collision avoidance yet.
- SVG-to-PNG export behavior is browser-dependent and should be validated across target browsers.
- Desktop-first UX; mobile optimization is not yet a goal.
