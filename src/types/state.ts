export interface MapTransform {
  x: number;
  y: number;
  k: number;
}

export const DEFAULT_MAP_TRANSFORM: MapTransform = {
  x: 0,
  y: 0,
  k: 1,
};

export interface PersistedState {
  visitedIds: string[];
  lastTransform: MapTransform;
}
