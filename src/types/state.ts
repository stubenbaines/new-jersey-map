export interface MapTransform {
  x: number;
  y: number;
  k: number;
}

export interface AppPrefs {
  showMunicipalityLabelsOverride: boolean;
}

export interface PersistedState {
  visitedIds: string[];
  prefs: AppPrefs;
  lastTransform: MapTransform;
}
