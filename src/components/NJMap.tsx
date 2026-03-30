import type { Geometry } from 'geojson';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, MouseEvent as ReactMouseEvent, MutableRefObject, SetStateAction, WheelEvent as ReactWheelEvent } from 'react';
import { COLORS, MAP_VIEWBOX } from '../constants';
import {
  buildProjector,
  computeGeometryBounds,
  geometryToPath,
} from '../lib/mapGeometry';
import { normalizeTransform, zoomAtPoint } from '../lib/mapTransform';
import type { CountyRecord, MunicipalityRecord } from '../types/data';
import type { MapTransform } from '../types/state';
import type { MunicipalityHoverTooltip } from '../types/ui';

interface NJMapProps {
  municipalities: MunicipalityRecord[];
  counties: CountyRecord[];
  visitedIds: Set<string>;
  selectedId: string | null;
  transform: MapTransform;
  svgElementRef?: MutableRefObject<SVGSVGElement | null>;
  onTransformChange: Dispatch<SetStateAction<MapTransform>>;
  onMunicipalityClick: (municipalityId: string) => void;
  onMunicipalityHover: (tooltip: MunicipalityHoverTooltip | null) => void;
}

interface ProjectedMunicipality {
  id: string;
  name: string;
  county: string;
  path: string;
}

interface ProjectedCounty {
  id: string;
  name: string;
  path: string;
  labelX: number;
  labelY: number;
}

const StaticMapLayers = memo(function StaticMapLayers({
  municipalities,
}: {
  municipalities: ProjectedMunicipality[];
}) {
  return (
    <g aria-label="Municipality base layer" className="municipality-base-layer">
      {municipalities.map((municipality) => (
        <path
          key={`base-${municipality.id}`}
          className="municipality-path"
          d={municipality.path}
          fill={COLORS.municipalFill}
          stroke={COLORS.municipalStroke}
          strokeWidth={0.9}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
});

const CountyBoundariesLayer = memo(function CountyBoundariesLayer({
  counties,
}: {
  counties: ProjectedCounty[];
}) {
  return (
    <g aria-label="County boundaries" className="county-layer">
      {counties.map((county) => (
        <path
          key={county.id}
          d={county.path}
          fill="none"
          pointerEvents="none"
          stroke={COLORS.countyStroke}
          strokeWidth={1.8}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
});

const CountyLabelsLayer = memo(function CountyLabelsLayer({
  counties,
}: {
  counties: ProjectedCounty[];
}) {
  return (
    <g aria-label="County labels" className="county-label-layer">
      {counties.map((county) => (
        <text
          key={`label-${county.id}`}
          className="county-label"
          fill={COLORS.countyLabel}
          x={county.labelX}
          y={county.labelY}
        >
          {county.name}
        </text>
      ))}
    </g>
  );
});

const DynamicMapLayers = memo(function DynamicMapLayers({
  municipalitiesById,
  visitedIds,
  selectedId,
}: {
  municipalitiesById: Map<string, ProjectedMunicipality>;
  visitedIds: Set<string>;
  selectedId: string | null;
}) {
  return (
    <>
      <g aria-label="Visited fill layer" className="visited-layer">
        {[...visitedIds].map((visitedId) => {
          const municipality = municipalitiesById.get(visitedId);
          if (!municipality) {
            return null;
          }
          return (
            <path
              key={`visited-${visitedId}`}
              d={municipality.path}
              fill={COLORS.visitedFill}
              pointerEvents="none"
            />
          );
        })}
      </g>

      {selectedId ? (
        <g aria-label="Selection layer" className="selection-layer">
          {municipalitiesById.has(selectedId) ? (
            <path
              d={municipalitiesById.get(selectedId)?.path ?? ''}
              fill="none"
              stroke={COLORS.selectedStroke}
              strokeWidth={2.4}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </g>
      ) : null}
    </>
  );
});

const MunicipalityInteractionLayer = memo(function MunicipalityInteractionLayer({
  municipalities,
  onMunicipalityClick,
  onMunicipalityHover,
  dragMovedRef,
}: {
  municipalities: ProjectedMunicipality[];
  onMunicipalityClick: (municipalityId: string) => void;
  onMunicipalityHover: (event: ReactMouseEvent<SVGPathElement> | null, municipality: ProjectedMunicipality) => void;
  dragMovedRef: MutableRefObject<boolean>;
}) {
  return (
    <g aria-label="Municipality interaction layer" className="municipality-hit-layer">
      {municipalities.map((municipality) => (
        <path
          key={`hit-${municipality.id}`}
          className="municipality-hit-path"
          d={municipality.path}
          fill="transparent"
          pointerEvents="all"
          onClick={() => {
            if (dragMovedRef.current) {
              return;
            }
            onMunicipalityClick(municipality.id);
          }}
          onMouseEnter={(event) => onMunicipalityHover(event, municipality)}
          onMouseMove={(event) => onMunicipalityHover(event, municipality)}
          onMouseOut={() => onMunicipalityHover(null, municipality)}
        />
      ))}
    </g>
  );
});

export default function NJMap({
  municipalities,
  counties,
  visitedIds,
  selectedId,
  transform,
  svgElementRef,
  onTransformChange,
  onMunicipalityClick,
  onMunicipalityHover,
}: NJMapProps) {
  const bounds = useMemo(
    () => computeGeometryBounds(counties.map((county) => county.geometry as Geometry)),
    [counties],
  );
  const project = useMemo(() => buildProjector(bounds), [bounds]);
  const projectedMunicipalities = useMemo<ProjectedMunicipality[]>(
    () =>
      municipalities.map((municipality) => ({
        id: municipality.id,
        name: municipality.name,
        county: municipality.county,
        path: geometryToPath(municipality.geometry as Geometry, project),
      })),
    [municipalities, project],
  );
  const projectedMunicipalitiesById = useMemo(() => {
    const nextMap = new Map<string, ProjectedMunicipality>();
    projectedMunicipalities.forEach((municipality) => {
      nextMap.set(municipality.id, municipality);
    });
    return nextMap;
  }, [projectedMunicipalities]);
  const projectedCounties = useMemo<ProjectedCounty[]>(
    () =>
      counties.map((county) => {
        const projectedLabelPoint = project(county.labelPoint);
        return {
          id: county.id,
          name: county.name,
          path: geometryToPath(county.geometry as Geometry, project),
          labelX: projectedLabelPoint[0],
          labelY: projectedLabelPoint[1],
        };
      }),
    [counties, project],
  );
  const svgRef = useRef<SVGSVGElement | null>(null);
  const onMunicipalityClickRef = useRef(onMunicipalityClick);
  const onMunicipalityHoverRef = useRef(onMunicipalityHover);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const lastDragPointRef = useRef<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    onMunicipalityClickRef.current = onMunicipalityClick;
  }, [onMunicipalityClick]);

  useEffect(() => {
    onMunicipalityHoverRef.current = onMunicipalityHover;
  }, [onMunicipalityHover]);

  useEffect(() => {
    function onWindowMouseMove(event: MouseEvent): void {
      if (!isDraggingRef.current || !svgRef.current || !lastDragPointRef.current) {
        return;
      }

      const rect = svgRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const dxPixels = event.clientX - lastDragPointRef.current.x;
      const dyPixels = event.clientY - lastDragPointRef.current.y;
      lastDragPointRef.current = { x: event.clientX, y: event.clientY };

      const dx = (dxPixels * MAP_VIEWBOX.width) / rect.width;
      const dy = (dyPixels * MAP_VIEWBOX.height) / rect.height;

      if (Math.abs(dxPixels) > 2 || Math.abs(dyPixels) > 2) {
        dragMovedRef.current = true;
      }

      onTransformChange((previous) => normalizeTransform({ ...previous, x: previous.x + dx, y: previous.y + dy }));
    }

    function stopDragging(): void {
      isDraggingRef.current = false;
      lastDragPointRef.current = null;
      setIsDragging(false);
    }

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('mouseleave', stopDragging);

    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('mouseleave', stopDragging);
    };
  }, [onTransformChange]);

  function toViewBoxPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!svgRef.current) {
      return null;
    }
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    const x = ((clientX - rect.left) / rect.width) * MAP_VIEWBOX.width;
    const y = ((clientY - rect.top) / rect.height) * MAP_VIEWBOX.height;
    return { x, y };
  }

  function emitHover(
    event: ReactMouseEvent<SVGPathElement>,
    municipalityName: string,
    countyName: string,
  ): void {
    if (!svgRef.current || isDraggingRef.current) {
      return;
    }

    const rect = svgRef.current.getBoundingClientRect();
    onMunicipalityHoverRef.current({
      x: event.clientX - rect.left + 12,
      y: event.clientY - rect.top + 14,
      text: `${municipalityName}, ${countyName}`,
    });
  }

  const handleInteractionHover = useCallback(
    (event: ReactMouseEvent<SVGPathElement> | null, municipality: ProjectedMunicipality) => {
      if (!event) {
        onMunicipalityHoverRef.current(null);
        return;
      }
      emitHover(event, municipality.name, municipality.county);
    },
    [],
  );

  const handleInteractionClick = useCallback((municipalityId: string) => {
    onMunicipalityClickRef.current(municipalityId);
  }, []);

  function handleWheel(event: ReactWheelEvent<SVGSVGElement>): void {
    event.preventDefault();
    const point = toViewBoxPoint(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    const factor = Math.exp(-event.deltaY * 0.0015);
    onTransformChange((previous) => zoomAtPoint(previous, factor, point));
  }

  function handleMouseDown(event: ReactMouseEvent<SVGSVGElement>): void {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    isDraggingRef.current = true;
    dragMovedRef.current = false;
    lastDragPointRef.current = { x: event.clientX, y: event.clientY };
    setIsDragging(true);
  }

  return (
    <svg
      aria-label="New Jersey municipality map"
      className={`map-svg ${isDragging ? 'is-dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseLeave={() => onMunicipalityHover(null)}
      onWheel={handleWheel}
      ref={(element) => {
        svgRef.current = element;
        if (svgElementRef) {
          svgElementRef.current = element;
        }
      }}
      viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
      role="img"
    >
      <rect fill={COLORS.mapBackground} height={MAP_VIEWBOX.height} width={MAP_VIEWBOX.width} x={0} y={0} />
      <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
        <StaticMapLayers municipalities={projectedMunicipalities} />
        <DynamicMapLayers
          municipalitiesById={projectedMunicipalitiesById}
          selectedId={selectedId}
          visitedIds={visitedIds}
        />
        <CountyBoundariesLayer counties={projectedCounties} />
        <MunicipalityInteractionLayer
          dragMovedRef={dragMovedRef}
          municipalities={projectedMunicipalities}
          onMunicipalityClick={handleInteractionClick}
          onMunicipalityHover={handleInteractionHover}
        />
        <CountyLabelsLayer counties={projectedCounties} />
      </g>
    </svg>
  );
}
