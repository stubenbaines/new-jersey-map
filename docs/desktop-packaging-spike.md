# Desktop Packaging Spike (Milestone 10)

Date: 2026-03-03
Project: NJ Visits Tracker

## Scope
- Evaluate feasibility of packaging this app as a standalone Windows desktop installer.
- Compare Electron vs Tauri for this specific codebase (Vite + React, local-only state, no backend).
- Produce a recommendation and next-step implementation plan.

## Decision Criteria
1. End-user install simplicity on Windows.
2. Runtime footprint (bundle size + memory expectations).
3. Security baseline and hardening effort.
4. Build/distribution complexity for a small personal app.
5. Long-term maintenance burden.

## Current Local Environment Check (this spike run)
- Node: `v24.14.0`
- npm: `11.9.0`
- Rust/Cargo: not installed
- NSIS/Wine/Mono tools: not installed

Implication:
- Electron POC can be started with only Node/npm.
- Tauri requires Rust toolchain locally, and Windows packaging has additional host/tooling constraints.

## What Official Docs Say (primary sources)
- Electron embeds Chromium + Node.js in each app:
  - https://www.electronjs.org/
- Electron Forge is the standard packaging pipeline for installers:
  - https://www.electronforge.io/
- Electron Windows installer targets:
  - Squirrel (Windows/Linux+mono+wine): https://www.electronforge.io/config/makers/squirrel.windows
  - WiX MSI (Windows + WiX Toolset): https://www.electronforge.io/config/makers/wix-msi
  - MSIX (Windows 10/11 + SDK; marked experimental): https://www.electronforge.io/config/makers/msix
- Tauri uses system WebView and states smaller app size potential (minimal app can be <600KB):
  - https://tauri.app/start/
- Tauri CLI supports initializing inside an existing frontend project (`tauri init`):
  - https://v2.tauri.app/reference/cli/
  - https://v2.tauri.app/start/create-project/
- Tauri Windows prerequisites include MSVC build tools + WebView2:
  - https://v2.tauri.app/start/prerequisites/
- Tauri Windows installers (`msi`/`nsis`) and cross-compilation caveats:
  - https://v2.tauri.app/distribute/windows-installer/

## Option Comparison

### Electron
Pros:
- Fastest path for JS-only team.
- Mature packaging ecosystem with Forge makers.
- Stable render target because Chromium ships with app.

Cons:
- Larger installer/runtime footprint because Chromium is bundled.
- Security hardening checklist is broader and must be enforced carefully:
  - https://www.electronjs.org/docs/latest/tutorial/security

Fit for NJ Visits Tracker:
- Very feasible and straightforward.
- Likely fastest to first Windows installer.

### Tauri
Pros:
- Smaller binaries expected for this app profile (WebView-based runtime).
- Strong security-oriented architecture and Rust core.
- Good fit for simple local-first desktop utilities.

Cons:
- Requires Rust toolchain and some native setup.
- Cross-building Windows installers from macOS is possible but has caveats; Windows-native build/CI is safer.

Fit for NJ Visits Tracker:
- Strong long-term fit if we accept initial setup overhead.
- Best choice if lightweight install footprint matters.

## Recommendation
Recommend **Tauri** as the primary path for production packaging.

Why:
1. This app is local-first and does not need Node-heavy desktop APIs.
2. Installer/runtime footprint matters for non-technical end users.
3. Security and maintenance profile is favorable once bootstrap is done.

Fallback:
- If Tauri setup friction is higher than desired, ship Electron first, then migrate later.

## Proposed Execution Plan

### Phase 1: Tauri POC (0.5-1 day)
1. Install Rust toolchain locally.
2. Add Tauri CLI.
3. Initialize Tauri in this existing repo.
4. Run `tauri dev` to confirm app functionality parity.

### Phase 2: Windows Artifact Path (0.5-1 day)
1. Use a Windows machine or GitHub Actions Windows runner for installer builds.
2. Produce NSIS installer first (`.exe`), optionally MSI.
3. Validate app launch, persistence, import/export, PNG export.

### Phase 3: Hardening and Docs (0.5 day)
1. Add release script(s) and CI workflow.
2. Document install/update process.
3. Optional code-signing setup.

## Commands (when implementing)

### Tauri path (from current project)
```bash
npm install -D @tauri-apps/cli@latest
npx tauri init
npx tauri dev
npx tauri build
```

### Electron path (if chosen)
```bash
npm install --save-dev @electron-forge/cli
npm exec --package=@electron-forge/cli -c "electron-forge import"
npm run make
```

## Deliverable Outcome
- Decision: **Tauri first** for production packaging.
- Caveat: Build final Windows installers on Windows host/CI for fewer cross-compilation issues.

## Implementation Follow-up (Scaffold Added)
The repository now includes:
- `src-tauri/` base Tauri app shell and config
- `npm` scripts: `tauri:dev`, `tauri:build`
- Windows installer CI workflow:
  - `.github/workflows/tauri-windows.yml`

Note:
- During this session, package installation from npm registry was blocked in the sandbox environment.
- The scaffold is ready, but first local run still requires installing Tauri CLI on your machine:
  - `cargo install tauri-cli --locked`
