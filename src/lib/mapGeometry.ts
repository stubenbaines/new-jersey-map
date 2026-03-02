import type { Geometry, Position } from 'geojson';
import { MAP_VIEWBOX } from '../constants';

export interface Bounds {
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

export function geometryToRings(geometry: Geometry): Position[][] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates;
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flat();
  }
  return [];
}

export function computeGeometryBounds(geometries: Geometry[]): Bounds {
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

export function buildProjector(bounds: Bounds) {
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

export function geometryToPath(geometry: Geometry, project: (position: Position) => [number, number]): string {
  const rings = geometryToRings(geometry);
  return rings.map((ring) => ringToPath(ring, project)).join('');
}

export function computeGeometryCenter(geometry: Geometry): Position {
  const bounds = computeGeometryBounds([geometry]);
  return [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2];
}
