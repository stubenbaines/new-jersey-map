import { MAP_VIEWBOX } from '../constants';
import type { MapTransform } from '../types/state';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 12;
export const ZOOM_BUTTON_FACTOR = 1.25;

export function clampZoom(k: number): number {
  if (!Number.isFinite(k)) {
    return MIN_ZOOM;
  }
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));
}

export function normalizeTransform(transform: Partial<MapTransform> | null | undefined): MapTransform {
  return {
    x: Number.isFinite(transform?.x) ? Number(transform?.x) : 0,
    y: Number.isFinite(transform?.y) ? Number(transform?.y) : 0,
    k: clampZoom(Number(transform?.k ?? 1)),
  };
}

export function zoomAtPoint(transform: MapTransform, factor: number, point: { x: number; y: number }): MapTransform {
  const nextK = clampZoom(transform.k * factor);
  if (nextK === transform.k) {
    return transform;
  }

  const nextX = point.x - ((point.x - transform.x) * nextK) / transform.k;
  const nextY = point.y - ((point.y - transform.y) * nextK) / transform.k;

  return {
    x: nextX,
    y: nextY,
    k: nextK,
  };
}

export function zoomAtViewportCenter(transform: MapTransform, factor: number): MapTransform {
  return zoomAtPoint(transform, factor, {
    x: MAP_VIEWBOX.width / 2,
    y: MAP_VIEWBOX.height / 2,
  });
}
