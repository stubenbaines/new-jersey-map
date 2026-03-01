import type { Geometry, Position } from 'geojson';
import { useMemo } from 'react';
import { COLORS, MAP_VIEWBOX } from '../constants';
import type { CountyRecord, MunicipalityRecord } from '../types/data';

interface NJMapProps {
  municipalities: MunicipalityRecord[];
  counties: CountyRecord[];
  visitedIds: Set<string>;
  selectedId: string | null;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function updateBounds(bounds: Bounds, position: Position): void {
  const x = Number(position[0]);
  const y = Number(position[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return;
  }

  bounds.minX = Math.min(bounds.minX, x);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxY = Math.max(bounds.maxY, y);
}

function geometryToRings(geometry: Geometry): Position[][] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates;
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flat();
  }
  return [];
}

function computeGeometryBounds(geometries: Geometry[]): Bounds {
  const bounds: Bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  geometries.forEach((geometry) => {
    geometryToRings(geometry).forEach((ring) => {
      ring.forEach((position) => updateBounds(bounds, position));
    });
  });

  if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minY)) {
    return { minX: -75.6, minY: 38.9, maxX: -73.9, maxY: 41.4 };
  }

  return bounds;
}

function buildProjector(bounds: Bounds) {
  const drawableWidth = MAP_VIEWBOX.width - MAP_VIEWBOX.padding * 2;
  const drawableHeight = MAP_VIEWBOX.height - MAP_VIEWBOX.padding * 2;
  const dataWidth = Math.max(bounds.maxX - bounds.minX, 1e-9);
  const dataHeight = Math.max(bounds.maxY - bounds.minY, 1e-9);
  const scale = Math.min(drawableWidth / dataWidth, drawableHeight / dataHeight);

  const projectedWidth = dataWidth * scale;
  const projectedHeight = dataHeight * scale;
  const offsetX = MAP_VIEWBOX.padding + (drawableWidth - projectedWidth) / 2;
  const offsetY = MAP_VIEWBOX.padding + (drawableHeight - projectedHeight) / 2;

  return (position: Position): [number, number] => {
    const x = offsetX + (Number(position[0]) - bounds.minX) * scale;
    const y = offsetY + (bounds.maxY - Number(position[1])) * scale;
    return [x, y];
  };
}

function ringToPath(ring: Position[], project: (position: Position) => [number, number]): string {
  if (ring.length === 0) {
    return '';
  }

  const [startX, startY] = project(ring[0]);
  let output = `M${startX.toFixed(2)},${startY.toFixed(2)}`;

  for (let index = 1; index < ring.length; index += 1) {
    const [x, y] = project(ring[index]);
    output += `L${x.toFixed(2)},${y.toFixed(2)}`;
  }

  output += 'Z';
  return output;
}

function geometryToPath(geometry: Geometry, project: (position: Position) => [number, number]): string {
  const rings = geometryToRings(geometry);
  return rings.map((ring) => ringToPath(ring, project)).join('');
}

export default function NJMap({ municipalities, counties, visitedIds, selectedId }: NJMapProps) {
  const bounds = useMemo(
    () => computeGeometryBounds(counties.map((county) => county.geometry)),
    [counties],
  );
  const project = useMemo(() => buildProjector(bounds), [bounds]);

  return (
    <svg
      aria-label="New Jersey municipality map"
      className="map-svg"
      viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
      role="img"
    >
      <rect fill={COLORS.mapBackground} height={MAP_VIEWBOX.height} width={MAP_VIEWBOX.width} x={0} y={0} />

      <g aria-label="Municipalities" className="municipality-layer">
        {municipalities.map((municipality) => {
          const id = municipality.id;
          const name = municipality.name;
          const county = municipality.county;

          return (
            <path
              key={id}
              d={geometryToPath(municipality.geometry, project)}
              fill={visitedIds.has(id) ? COLORS.visitedFill : COLORS.municipalFill}
              stroke={COLORS.municipalStroke}
              strokeWidth={0.9}
              vectorEffect="non-scaling-stroke"
            >
              <title>{`${name}, ${county}`}</title>
            </path>
          );
        })}
      </g>

      <g aria-label="County boundaries" className="county-layer">
        {counties.map((county) => {
          const id = county.id;
          return (
            <path
              key={id}
              d={geometryToPath(county.geometry, project)}
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
                d={geometryToPath(municipality.geometry, project)}
                fill="none"
                stroke={COLORS.selectedStroke}
                strokeWidth={2.4}
                vectorEffect="non-scaling-stroke"
              />
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
    </svg>
  );
}
