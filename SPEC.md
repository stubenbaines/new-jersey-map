# NJ Visits Tracker (Desktop)

## 1) Product goal
Build a desktop-first web app that lets a user track visited New Jersey municipalities on an interactive line map and save progress locally.

## 2) MVP scope
The MVP includes:
- Interactive NJ municipality + county map (vector only, no raster tiles).
- Pan/zoom navigation with controls.
- Click and search-based visited toggling.
- Tooltip + label system suitable for dense geometry.
- Local persistence in `localStorage`.
- PNG export of current view.

## 3) Primary user stories
- As a user, I can click municipalities to mark visited/unvisited quickly.
- As a user, I can search by municipality/county when a map region is too dense to click.
- As a user, I can reopen the app and keep my prior progress.
- As a user, I can export a snapshot of my current map state.

## 4) Functional requirements

### FR-1 Map rendering
- Render NJ municipalities as filled polygons with thin boundaries.
- Render county boundaries as thicker overlay lines.
- County labels are visible at all zoom levels.
- Municipal polygons are pointer-interactive.

### FR-2 Navigation
- Support wheel/trackpad zoom and click-drag pan.
- Provide controls: `Zoom In`, `Zoom Out`, `Reset View`.
- `Reset View` fits the full NJ extent into viewport with padding.
- Use non-scaling strokes (or equivalent) so boundaries remain readable at high zoom.

### FR-3 Visited + selection behavior
- Clicking a municipality toggles `visited`.
- Most recently clicked/searched municipality becomes `selected`.
- Selected municipality has a visible outline above fill/boundaries.
- Visited and unvisited states have clearly distinct fill colors.

### FR-4 Search
- Input supports case-insensitive partial matching.
- Preferred display format is `Municipality, County`.
- Selecting a result toggles visited and sets selected.
- On result selection, map pans/zooms to keep selected municipality visible.

### FR-5 Labels and tooltip
- County labels: always visible.
- Municipality labels: hidden by default at low zoom.
- Municipality labels auto-enable above threshold `k >= 2.5` (configurable constant).
- UI toggle `Show municipality labels` forces municipality labels on.
- Hover tooltip always available and shows `Municipality + County` (plus type if data has it).

### FR-6 Persistence
- Persist visited IDs in `localStorage`.
- Persist UI preferences in `localStorage`:
  - label toggle override
  - last map transform (`x`, `y`, `k`) as part of MVP
- Data key is versioned to allow future schema upgrades.

### FR-7 Export PNG
- `Export PNG` captures current viewport state, including:
  - current pan/zoom transform
  - visited fills
  - currently visible labels
  - selected outline (if present)
- Download file name format: `nj-visits-YYYY-MM-DD.png`.

## 5) Data requirements
- Source authoritative NJ municipality and county boundaries from New Jersey state-provided downloads.
- Preferred intake format: GeoJSON.
- Preprocess to TopoJSON under `src/data/`.
- Include reproducible script(s) under `scripts/` to regenerate data.
- TopoJSON feature properties must include:
  - stable municipality ID (source-derived)
  - municipality name
  - county name
  - optional municipality type

Expected raw data drop location:
- `data/raw/nj_municipalities.geojson`
- `data/raw/nj_counties.geojson`

## 6) Local data model (app state)
- `visitedIds: Set<string>`
- `selectedId: string | null`
- `showMunicipalityLabelsOverride: boolean`
- `zoomK: number`
- `transform: { x: number, y: number, k: number }`

`localStorage` proposal:
- key: `nj-visits:v1`
- value:
```json
{
  "visitedIds": ["..."],
  "prefs": {
    "showMunicipalityLabelsOverride": false
  },
  "lastTransform": {
    "x": 0,
    "y": 0,
    "k": 1
  }
}
```

## 7) UX constraints and visual direction
- Desktop-first layout with left control panel + map canvas.
- Clean print-like linework aesthetic.
- Keep UI controls simple and legible over style complexity.

Color guidance:
- Map style: black/white linework.
- Municipality boundaries: light gray.
- County boundaries: dark gray/black and thicker than municipality lines.
- Visited fill: red.
- Selected outline should be high-contrast and visible for color-blind users.

## 8) Performance and quality targets
- Initial map render under 2 seconds on typical desktop hardware.
- Hover/click interactions feel immediate (<100ms perceived delay).
- Pan/zoom remains smooth under normal use.
- No visible stroke inflation at high zoom.

## 9) Accessibility baseline
- All controls are keyboard focusable.
- Search results are keyboard navigable (`ArrowUp/Down`, `Enter`, `Esc`).
- Tooltip/search text uses sufficient contrast.
- Non-color cue for selected municipality (outline thickness/pattern).

## 10) Non-goals (MVP)
- No accounts, backend, or cloud sync.
- No mobile-first design.
- No full label collision-avoidance engine.
- No historical timeline or trip journaling features.

## 11) Resolved pre-implementation decisions
- Data source will be New Jersey state-provided municipal/county boundary downloads.
- Intake format will be GeoJSON.
- Last map transform persistence is included in MVP.
- Base palette is black/white map with red visited fill, aligned with reference images in `samples/`.
