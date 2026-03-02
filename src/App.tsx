import type { Geometry } from 'geojson';
import { useEffect, useMemo, useRef, useState } from 'react';
import NJMap from './components/NJMap';
import { COLORS, MAP_VIEWBOX, MUNICIPALITY_LABEL_ZOOM_THRESHOLD, STORAGE_KEY } from './constants';
import {
  buildProjector,
  computeGeometryBounds,
  computeGeometryCenter,
} from './lib/mapGeometry';
import { exportSvgAsPng } from './lib/exportPng';
import { ZOOM_BUTTON_FACTOR, zoomAtViewportCenter } from './lib/mapTransform';
import { loadPersistedState, savePersistedState } from './lib/storage';
import type { NJGeometryData } from './types/data';
import { DEFAULT_MAP_TRANSFORM } from './types/state';
import type { MapTransform } from './types/state';
import type { MunicipalityHoverTooltip } from './types/ui';

interface SearchResultItem {
  id: string;
  label: string;
  searchText: string;
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function App() {
  const [data, setData] = useState<NJGeometryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataLoadAttempt, setDataLoadAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeResultIndex, setActiveResultIndex] = useState<number>(-1);
  const [hoverTooltip, setHoverTooltip] = useState<MunicipalityHoverTooltip | null>(null);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [storageSaveError, setStorageSaveError] = useState<string | null>(null);

  const persisted = useMemo(() => loadPersistedState(), []);
  const [storageLoadWarning, setStorageLoadWarning] = useState<string | null>(persisted.warning);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set(persisted.state.visitedIds));
  const [showMunicipalityLabelsOverride, setShowMunicipalityLabelsOverride] = useState<boolean>(
    persisted.state.prefs.showMunicipalityLabelsOverride,
  );
  const [transform, setTransform] = useState<MapTransform>(persisted.state.lastTransform);
  const mapSvgElementRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    setError(null);

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
  }, [dataLoadAttempt]);

  useEffect(() => {
    const saveError = savePersistedState({
      visitedIds: [...visitedIds],
      prefs: {
        showMunicipalityLabelsOverride,
      },
      lastTransform: transform,
    });
    setStorageSaveError(saveError);
  }, [showMunicipalityLabelsOverride, transform, visitedIds]);

  const municipalityCount = data?.meta.municipalityCount ?? 0;
  const countyCount = data?.meta.countyCount ?? 0;
  const canUseMapControls = Boolean(data) && !error;
  const isMunicipalityLabelsAutoVisible = transform.k >= MUNICIPALITY_LABEL_ZOOM_THRESHOLD;
  const showMunicipalityLabels = showMunicipalityLabelsOverride || isMunicipalityLabelsAutoVisible;

  const searchIndex = useMemo<SearchResultItem[]>(() => {
    if (!data) {
      return [];
    }

    return data.municipalities.map((municipality) => {
      const label = `${municipality.name}, ${municipality.county}`;
      return {
        id: municipality.id,
        label,
        searchText: normalizeSearchText(`${municipality.name} ${municipality.county}`),
      };
    });
  }, [data]);

  const searchQueryNormalized = normalizeSearchText(searchQuery);
  const searchResults = useMemo(() => {
    if (!searchQueryNormalized) {
      return [];
    }

    return searchIndex.filter((item) => item.searchText.includes(searchQueryNormalized)).slice(0, 15);
  }, [searchIndex, searchQueryNormalized]);

  useEffect(() => {
    setActiveResultIndex(searchResults.length > 0 ? 0 : -1);
  }, [searchQuery, searchResults.length]);

  const municipalitiesById = useMemo(() => {
    const nextMap = new Map<string, NJGeometryData['municipalities'][number]>();
    data?.municipalities.forEach((municipality) => {
      nextMap.set(municipality.id, municipality);
    });
    return nextMap;
  }, [data]);

  const projectForCentering = useMemo(() => {
    if (!data) {
      return null;
    }
    const bounds = computeGeometryBounds(data.counties.map((county) => county.geometry as Geometry));
    return buildProjector(bounds);
  }, [data]);

  function toggleMunicipalityVisited(municipalityId: string): void {
    setSelectedId(municipalityId);
    setVisitedIds((previous) => {
      const next = new Set(previous);
      if (next.has(municipalityId)) {
        next.delete(municipalityId);
      } else {
        next.add(municipalityId);
      }
      return next;
    });
  }

  function handleMunicipalityClick(municipalityId: string): void {
    toggleMunicipalityVisited(municipalityId);
  }

  function handleSearchSelect(municipalityId: string): void {
    toggleMunicipalityVisited(municipalityId);
    setSearchQuery('');
    setActiveResultIndex(-1);

    const municipality = municipalitiesById.get(municipalityId);
    if (!municipality || !projectForCentering) {
      return;
    }

    const centerCoordinate = computeGeometryCenter(municipality.geometry as Geometry);
    const projectedCenter = projectForCentering(centerCoordinate);

    setTransform((previous) => {
      const k = previous.k < 2 ? 2 : previous.k;
      return {
        x: MAP_VIEWBOX.width / 2 - projectedCenter[0] * k,
        y: MAP_VIEWBOX.height / 2 - projectedCenter[1] * k,
        k,
      };
    });
  }

  async function handleExportPng(): Promise<void> {
    if (!mapSvgElementRef.current) {
      setExportError('Map is not ready for export yet.');
      return;
    }

    setExportError(null);
    setIsExportingPng(true);
    try {
      await exportSvgAsPng(mapSvgElementRef.current);
    } catch (exportFailure) {
      setExportError(exportFailure instanceof Error ? exportFailure.message : 'PNG export failed.');
    } finally {
      setIsExportingPng(false);
    }
  }

  function clearSavedProgress(): void {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Keep UI state reset even if storage deletion fails.
    }
    setVisitedIds(new Set());
    setShowMunicipalityLabelsOverride(false);
    setTransform(DEFAULT_MAP_TRANSFORM);
    setStorageLoadWarning(null);
    setStorageSaveError(null);
  }

  return (
    <div className="app-shell" style={{ backgroundColor: COLORS.pageBackground }}>
      <header className="app-header">
        <h1>NJ Visits Tracker</h1>
      </header>

      <main className="app-main">
        <aside className="sidebar" style={{ backgroundColor: COLORS.panelBackground }}>
          <section className="sidebar-section">
            <h2>Search</h2>
            <input
              aria-activedescendant={activeResultIndex >= 0 ? `search-option-${activeResultIndex}` : undefined}
              aria-autocomplete="list"
              aria-controls="search-results-list"
              aria-expanded={searchResults.length > 0}
              aria-label="Search municipalities by municipality and county"
              disabled={!data || Boolean(error)}
              role="combobox"
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  if (searchResults.length > 0) {
                    setActiveResultIndex((previous) => (previous + 1) % searchResults.length);
                  }
                }

                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  if (searchResults.length > 0) {
                    setActiveResultIndex((previous) =>
                      previous <= 0 ? searchResults.length - 1 : previous - 1,
                    );
                  }
                }

                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (searchResults.length > 0) {
                    const result = searchResults[activeResultIndex >= 0 ? activeResultIndex : 0];
                    handleSearchSelect(result.id);
                  }
                }

                if (event.key === 'Escape') {
                  setSearchQuery('');
                  setActiveResultIndex(-1);
                }
              }}
              placeholder="Municipality, County"
              type="text"
              value={searchQuery}
            />
            {searchResults.length > 0 ? (
              <ul
                aria-label="Search results"
                className="search-results-list"
                id="search-results-list"
                role="listbox"
              >
                {searchResults.map((result, index) => (
                  <li aria-selected={index === activeResultIndex} id={`search-option-${index}`} key={result.id} role="option">
                    <button
                      className={`search-result-button ${index === activeResultIndex ? 'is-active' : ''}`}
                      onClick={() => handleSearchSelect(result.id)}
                      tabIndex={-1}
                      type="button"
                    >
                      {result.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
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
            <label className="toggle-control">
              <input
                checked={showMunicipalityLabelsOverride}
                onChange={(event) => setShowMunicipalityLabelsOverride(event.target.checked)}
                type="checkbox"
              />
              <span>Show municipality labels</span>
            </label>
            <p className="muted">
              Auto on at zoom k &gt;= {MUNICIPALITY_LABEL_ZOOM_THRESHOLD.toFixed(1)}. Current k={transform.k.toFixed(2)}.
            </p>
            <div className="button-stack">
              <button disabled={!canUseMapControls || isExportingPng} onClick={() => void handleExportPng()} type="button">
                {isExportingPng ? 'Exporting PNG...' : 'Export PNG'}
              </button>
            </div>
            {exportError ? <p className="error">{exportError}</p> : null}
            {storageLoadWarning ? (
              <div className="warning-box" role="alert">
                <p>{storageLoadWarning}</p>
                <button onClick={() => setStorageLoadWarning(null)} type="button">
                  Dismiss
                </button>
              </div>
            ) : null}
            {storageSaveError ? (
              <div className="warning-box" role="alert">
                <p>{storageSaveError}</p>
                <button onClick={clearSavedProgress} type="button">
                  Reset Saved Data
                </button>
              </div>
            ) : null}
          </section>

          <section className="sidebar-section">
            <h2>State Snapshot</h2>
            <ul>
              <li>Municipalities: {municipalityCount}</li>
              <li>Counties: {countyCount}</li>
              <li>Visited IDs: {visitedIds.size}</li>
              <li>Selected ID: {selectedId ?? 'none'}</li>
              <li>Transform: {`x=${transform.x.toFixed(1)}, y=${transform.y.toFixed(1)}, k=${transform.k.toFixed(2)}`}</li>
              <li>Label Override: {showMunicipalityLabelsOverride ? 'on' : 'off'}</li>
              <li>Municipality Labels Visible: {showMunicipalityLabels ? 'yes' : 'no'}</li>
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
                  toggleMunicipalityVisited(randomMunicipality.id);
                }}
                type="button"
              >
                Toggle Random Municipality
              </button>
            </div>
          </section>
        </aside>

        <section className="map-panel" style={{ backgroundColor: COLORS.panelBackground }}>
          {error ? (
            <div className="warning-box" role="alert">
              <p>Failed to load map data: {error}</p>
              <div className="warning-actions">
                <button onClick={() => setDataLoadAttempt((previous) => previous + 1)} type="button">
                  Retry
                </button>
              </div>
            </div>
          ) : null}
          {!data && !error ? <p className="muted">Loading geometry data...</p> : null}
          {data ? (
            <>
              <NJMap
                counties={data.counties}
                municipalities={data.municipalities}
                onMunicipalityClick={handleMunicipalityClick}
                onMunicipalityHover={setHoverTooltip}
                onTransformChange={setTransform}
                selectedId={selectedId}
                showMunicipalityLabels={showMunicipalityLabels}
                svgElementRef={mapSvgElementRef}
                transform={transform}
                visitedIds={visitedIds}
              />
              {hoverTooltip ? (
                <div
                  aria-live="polite"
                  className="map-tooltip"
                  style={{ left: `${hoverTooltip.x}px`, top: `${hoverTooltip.y}px` }}
                >
                  {hoverTooltip.text}
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default App;
