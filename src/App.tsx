import { useEffect, useMemo, useState } from 'react';
import NJMap from './components/NJMap';
import { COLORS } from './constants';
import { ZOOM_BUTTON_FACTOR, zoomAtViewportCenter } from './lib/mapTransform';
import { loadPersistedState, savePersistedState } from './lib/storage';
import type { NJGeometryData } from './types/data';
import { DEFAULT_MAP_TRANSFORM } from './types/state';
import type { MapTransform } from './types/state';

function App() {
  const [data, setData] = useState<NJGeometryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const persisted = useMemo(() => loadPersistedState(), []);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set(persisted.visitedIds));
  const [showMunicipalityLabelsOverride, setShowMunicipalityLabelsOverride] = useState<boolean>(
    persisted.prefs.showMunicipalityLabelsOverride,
  );
  const [transform, setTransform] = useState<MapTransform>(persisted.lastTransform);

  useEffect(() => {
    let isMounted = true;

    fetch('/data/nj-geometry.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load geometry data (${response.status})`);
        }
        return response.json() as Promise<NJGeometryData>;
      })
      .then((payload) => {
        if (!isMounted) {
          return;
        }
        setData(payload);
      })
      .catch((fetchError) => {
        if (!isMounted) {
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : 'Unknown data load error');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    savePersistedState({
      visitedIds: [...visitedIds],
      prefs: {
        showMunicipalityLabelsOverride,
      },
      lastTransform: transform,
    });
  }, [showMunicipalityLabelsOverride, transform, visitedIds]);

  const municipalityCount = data?.meta.municipalityCount ?? 0;
  const countyCount = data?.meta.countyCount ?? 0;
  const canUseMapControls = Boolean(data) && !error;

  return (
    <div className="app-shell" style={{ backgroundColor: COLORS.pageBackground }}>
      <header className="app-header">
        <h1>NJ Visits Tracker</h1>
      </header>

      <main className="app-main">
        <aside className="sidebar" style={{ backgroundColor: COLORS.panelBackground }}>
          <section className="sidebar-section">
            <h2>Search</h2>
            <input disabled placeholder="Municipality, County" type="text" />
            <p className="muted">Milestone 4 placeholder</p>
          </section>

          <section className="sidebar-section">
            <h2>Map Controls</h2>
            <div className="button-stack">
              <button
                disabled={!canUseMapControls}
                onClick={() => setTransform((previous) => zoomAtViewportCenter(previous, ZOOM_BUTTON_FACTOR))}
                type="button"
              >
                Zoom In
              </button>
              <button
                disabled={!canUseMapControls}
                onClick={() => setTransform((previous) => zoomAtViewportCenter(previous, 1 / ZOOM_BUTTON_FACTOR))}
                type="button"
              >
                Zoom Out
              </button>
              <button disabled={!canUseMapControls} onClick={() => setTransform(DEFAULT_MAP_TRANSFORM)} type="button">
                Reset View
              </button>
            </div>
          </section>

          <section className="sidebar-section">
            <h2>State Snapshot</h2>
            <ul>
              <li>Municipalities: {municipalityCount}</li>
              <li>Counties: {countyCount}</li>
              <li>Visited IDs: {visitedIds.size}</li>
              <li>Selected ID: {selectedId ?? 'none'}</li>
              <li>Transform: {`x=${transform.x.toFixed(1)}, y=${transform.y.toFixed(1)}, k=${transform.k.toFixed(2)}`}</li>
              <li>Labels Override: {showMunicipalityLabelsOverride ? 'on' : 'off'}</li>
            </ul>
          </section>

          <section className="sidebar-section">
            <h2>Quick Testing</h2>
            <div className="button-stack">
              <button
                onClick={() => {
                  if (!data || data.municipalities.length === 0) {
                    return;
                  }
                  const randomMunicipality = data.municipalities[Math.floor(Math.random() * data.municipalities.length)];
                  setSelectedId(randomMunicipality.id);
                  setVisitedIds((previous) => {
                    const next = new Set(previous);
                    if (next.has(randomMunicipality.id)) {
                      next.delete(randomMunicipality.id);
                    } else {
                      next.add(randomMunicipality.id);
                    }
                    return next;
                  });
                }}
                type="button"
              >
                Toggle Random Municipality
              </button>
              <button
                onClick={() => setShowMunicipalityLabelsOverride((previous) => !previous)}
                type="button"
              >
                Toggle Label Override Flag
              </button>
            </div>
          </section>
        </aside>

        <section className="map-panel" style={{ backgroundColor: COLORS.panelBackground }}>
          {error ? <p className="error">Failed to load map data: {error}</p> : null}
          {!data && !error ? <p className="muted">Loading geometry data...</p> : null}
          {data ? (
            <NJMap
              counties={data.counties}
              municipalities={data.municipalities}
              onTransformChange={setTransform}
              selectedId={selectedId}
              transform={transform}
              visitedIds={visitedIds}
            />
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default App;
