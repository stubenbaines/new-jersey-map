import type { Geometry } from 'geojson';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, MouseEvent as ReactMouseEvent, MutableRefObject, SetStateAction, WheelEvent as ReactWheelEvent } from 'react';
import { COLORS, MAP_VIEWBOX } from '../constants';
import {
  buildProjector,
  computeGeometryBounds,
  computeGeometryCenter,
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
  showMunicipalityLabels: boolean;
  svgElementRef?: MutableRefObject<SVGSVGElement | null>;
  onTransformChange: Dispatch<SetStateAction<MapTransform>>;
  onMunicipalityClick: (municipalityId: string) => void;
  onMunicipalityHover: (tooltip: MunicipalityHoverTooltip | null) => void;
}

export default function NJMap({
  municipalities,
  counties,
  visitedIds,
  selectedId,
  transform,
  showMunicipalityLabels,
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
  const municipalityLabelPoints = useMemo(
    () =>
      municipalities.map((municipality) => {
        const projected = project(computeGeometryCenter(municipality.geometry as Geometry));
        return {
          id: municipality.id,
          name: municipality.name,
          x: projected[0],
          y: projected[1],
        };
      }),
    [municipalities, project],
  );
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const lastDragPointRef = useRef<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    onMunicipalityHover({
      x: event.clientX - rect.left + 12,
      y: event.clientY - rect.top + 14,
      text: `${municipalityName}, ${countyName}`,
    });
  }

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
        <g aria-label="Municipalities" className="municipality-layer">
          {municipalities.map((municipality) => {
            const id = municipality.id;
            const name = municipality.name;
            const county = municipality.county;

            return (
              <path
                key={id}
                className="municipality-path"
                d={geometryToPath(municipality.geometry as Geometry, project)}
                fill={visitedIds.has(id) ? COLORS.visitedFill : COLORS.municipalFill}
                onClick={() => {
                  if (dragMovedRef.current) {
                    return;
                  }
                  onMunicipalityClick(id);
                }}
                onMouseEnter={(event) => emitHover(event, name, county)}
                onMouseMove={(event) => emitHover(event, name, county)}
                onMouseOut={() => onMunicipalityHover(null)}
                stroke={COLORS.municipalStroke}
                strokeWidth={0.9}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </g>

        <g aria-label="County boundaries" className="county-layer">
          {counties.map((county) => {
            const id = county.id;
            return (
              <path
                key={id}
                d={geometryToPath(county.geometry as Geometry, project)}
                fill="none"
                stroke={COLORS.countyStroke}
                strokeWidth={1.8}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </g>

        {selectedId ? (
          <g aria-label="Selection layer" className="selection-layer">
            {municipalities
              .filter((municipality) => municipality.id === selectedId)
              .map((municipality) => (
                <path
                  key={`selected-${selectedId}`}
                  d={geometryToPath(municipality.geometry as Geometry, project)}
                  fill="none"
                  stroke={COLORS.selectedStroke}
                  strokeWidth={2.4}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
          </g>
        ) : null}

        {showMunicipalityLabels ? (
          <g aria-label="Municipality labels" className="municipality-label-layer">
            {municipalityLabelPoints.map((labelPoint) => (
              <text
                key={`muni-label-${labelPoint.id}`}
                className="municipality-label"
                fill={COLORS.municipalityLabel}
                x={labelPoint.x}
                y={labelPoint.y}
              >
                {labelPoint.name}
              </text>
            ))}
          </g>
        ) : null}

        <g aria-label="County labels" className="county-label-layer">
          {counties.map((county) => {
            const projected = project(county.labelPoint);

            return (
              <text
                key={`label-${county.id}`}
                className="county-label"
                fill={COLORS.countyLabel}
                x={projected[0]}
                y={projected[1]}
              >
                {county.name}
              </text>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
