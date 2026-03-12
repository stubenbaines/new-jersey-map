import type { Geometry } from 'geojson';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NJMap from './components/NJMap';
import { MAP_VIEWBOX, STORAGE_KEY } from './constants';
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

interface ParsedImportLine {
  municipality: string;
  county: string;
}

interface ImportIssue {
  lineNumber: number;
  raw: string;
  reason: string;
}

interface ImportReport {
  addedCount: number;
  totalNonEmptyLines: number;
  unmatched: ImportIssue[];
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function createMunicipalityCountyKey(municipality: string, county: string): string {
  return `${normalizeSearchText(municipality)}|${normalizeSearchText(county)}`;
}

function parseImportLine(rawLine: string): ParsedImportLine | null {
  const line = rawLine.trim();
  if (!line) {
    return null;
  }

  if (line.includes('\t')) {
    const parts = line.split('\t').map((value) => value.trim()).filter((value) => value.length > 0);
    if (parts.length < 2) {
      return null;
    }
    return {
      municipality: parts[0],
      county: parts[1],
    };
  }

  const commaIndex = line.indexOf(',');
  if (commaIndex === -1) {
    return null;
  }

  const municipality = line.slice(0, commaIndex).trim();
  const county = line.slice(commaIndex + 1).trim();
  if (!municipality || !county) {
    return null;
  }

  return {
    municipality,
    county,
  };
}

function formatCurrentDateForFileName(): string {
  return new Date().toISOString().slice(0, 10);
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
  const [importInput, setImportInput] = useState('');
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [listExportError, setListExportError] = useState<string | null>(null);
  const [storageSaveError, setStorageSaveError] = useState<string | null>(null);

  const persisted = useMemo(() => loadPersistedState(), []);
  const [storageLoadWarning, setStorageLoadWarning] = useState<string | null>(persisted.warning);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set(persisted.state.visitedIds));
  const [transform, setTransform] = useState<MapTransform>(persisted.state.lastTransform);
  const mapSvgElementRef = useRef<SVGSVGElement | null>(null);
  const hoverTooltipRafRef = useRef<number | null>(null);
  const pendingHoverTooltipRef = useRef<MunicipalityHoverTooltip | null>(null);

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
      lastTransform: transform,
    });
    setStorageSaveError(saveError);
  }, [transform, visitedIds]);

  const municipalityCount = data?.meta.municipalityCount ?? 0;
  const countyCount = data?.meta.countyCount ?? 0;
  const canUseMapControls = Boolean(data) && !error;

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

  const municipalityKeyToId = useMemo(() => {
    const nextMap = new Map<string, string>();
    data?.municipalities.forEach((municipality) => {
      nextMap.set(createMunicipalityCountyKey(municipality.name, municipality.county), municipality.id);
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

  const toggleMunicipalityVisited = useCallback((municipalityId: string): void => {
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
  }, []);

  const handleMunicipalityClick = useCallback((municipalityId: string): void => {
    toggleMunicipalityVisited(municipalityId);
  }, [toggleMunicipalityVisited]);

  const handleMapHover = useCallback((tooltip: MunicipalityHoverTooltip | null): void => {
    if (!tooltip) {
      pendingHoverTooltipRef.current = null;
      if (hoverTooltipRafRef.current !== null) {
        window.cancelAnimationFrame(hoverTooltipRafRef.current);
        hoverTooltipRafRef.current = null;
      }
      setHoverTooltip(null);
      return;
    }

    pendingHoverTooltipRef.current = tooltip;
    if (hoverTooltipRafRef.current !== null) {
      return;
    }

    hoverTooltipRafRef.current = window.requestAnimationFrame(() => {
      hoverTooltipRafRef.current = null;
      setHoverTooltip(pendingHoverTooltipRef.current);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTooltipRafRef.current !== null) {
        window.cancelAnimationFrame(hoverTooltipRafRef.current);
        hoverTooltipRafRef.current = null;
      }
    };
  }, []);

  const handleSearchSelect = useCallback((municipalityId: string): void => {
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
  }, [municipalitiesById, projectForCentering, toggleMunicipalityVisited]);

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

  function resetProgressState(): void {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Keep UI state reset even if storage deletion fails.
    }
    setVisitedIds(new Set());
    setSelectedId(null);
    setTransform(DEFAULT_MAP_TRANSFORM);
    setImportReport(null);
    setStorageLoadWarning(null);
    setStorageSaveError(null);
  }

  function handleResetProgressWithConfirmation(): void {
    const shouldReset = window.confirm(
      'Reset all saved progress? This will clear visited municipalities and reset the map view.',
    );
    if (!shouldReset) {
      return;
    }
    resetProgressState();
  }

  function handleImportApply(): void {
    if (!data) {
      return;
    }

    const lines = importInput.split(/\r?\n/);
    const nextVisitedIds = new Set<string>(visitedIds);
    const unmatched: ImportIssue[] = [];
    let totalNonEmptyLines = 0;
    let addedCount = 0;

    lines.forEach((rawLine, index) => {
      if (!rawLine.trim()) {
        return;
      }
      totalNonEmptyLines += 1;

      const parsedLine = parseImportLine(rawLine);
      if (!parsedLine) {
        unmatched.push({
          lineNumber: index + 1,
          raw: rawLine,
          reason: 'Expected "Municipality, County" or tab-delimited fields.',
        });
        return;
      }

      const matchId = municipalityKeyToId.get(
        createMunicipalityCountyKey(parsedLine.municipality, parsedLine.county),
      );

      if (!matchId) {
        unmatched.push({
          lineNumber: index + 1,
          raw: rawLine,
          reason: 'No NJ municipality match found.',
        });
        return;
      }

      if (!nextVisitedIds.has(matchId)) {
        addedCount += 1;
      }
      nextVisitedIds.add(matchId);
    });

    setVisitedIds(nextVisitedIds);
    setSelectedId(null);
    setImportReport({
      addedCount,
      totalNonEmptyLines,
      unmatched,
    });
    setListExportError(null);
  }

  function handleVisitedListExport(): void {
    if (!data) {
      return;
    }

    const visitedMunicipalities = data.municipalities
      .filter((municipality) => visitedIds.has(municipality.id))
      .sort((a, b) => {
        const countyCompare = a.county.localeCompare(b.county);
        if (countyCompare !== 0) {
          return countyCompare;
        }
        return a.name.localeCompare(b.name);
      });

    const lines: string[] = [];
    let currentCounty: string | null = null;
    visitedMunicipalities.forEach((municipality) => {
      if (currentCounty !== null && municipality.county !== currentCounty) {
        lines.push('');
      }
      currentCounty = municipality.county;
      lines.push(`${municipality.name}, ${municipality.county}`);
    });
    const output = lines.join('\n');

    try {
      const blob = new Blob([output], { type: 'text/csv;charset=utf-8' });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `nj-visits-${formatCurrentDateForFileName()}.csv`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setListExportError(null);
    } catch {
      setListExportError('Visited list export failed.');
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>NJ Visits Tracker</h1>
      </header>

      <main className="app-main">
        <aside className="sidebar">
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
            <div className="button-stack">
              <button disabled={!canUseMapControls || isExportingPng} onClick={() => void handleExportPng()} type="button">
                {isExportingPng ? 'Exporting PNG...' : 'Export PNG'}
              </button>
              <button disabled={!canUseMapControls} onClick={handleVisitedListExport} type="button">
                Export Visited CSV
              </button>
              <button disabled={!canUseMapControls} onClick={handleResetProgressWithConfirmation} type="button">
                Reset Progress
              </button>
            </div>
            {exportError ? <p className="error">{exportError}</p> : null}
            {listExportError ? <p className="error">{listExportError}</p> : null}
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
                <button onClick={resetProgressState} type="button">
                  Reset Saved Data
                </button>
              </div>
            ) : null}
          </section>

          <section className="sidebar-section">
            <h2>Import Visited List</h2>
            <textarea
              aria-label="Import visited municipalities list"
              className="import-textarea"
              disabled={!canUseMapControls}
              onChange={(event) => setImportInput(event.target.value)}
              placeholder={'Saddle River, Bergen\nDunellen, Middlesex\nWest Trenton, Mercer'}
              spellCheck={false}
              value={importInput}
            />
            <div className="button-stack">
              <button disabled={!canUseMapControls} onClick={handleImportApply} type="button">
                Apply Import
              </button>
            </div>
            {importReport ? (
              <div className="import-report" role="status">
                <p>
                  Added {importReport.addedCount} municipalities from {importReport.totalNonEmptyLines} non-empty lines.
                </p>
                {importReport.unmatched.length > 0 ? (
                  <ul className="import-unmatched-list">
                    {importReport.unmatched.map((issue) => (
                      <li key={`${issue.lineNumber}-${issue.raw}`}>
                        Line {issue.lineNumber}: {issue.raw} ({issue.reason})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No unmatched lines.</p>
                )}
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

        <section className="map-panel">
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
                onMunicipalityHover={handleMapHover}
                onTransformChange={setTransform}
                selectedId={selectedId}
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
