import { STORAGE_KEY } from '../constants';
import type { PersistedState } from '../types/state';

const DEFAULT_STATE: PersistedState = {
  visitedIds: [],
  prefs: {
    showMunicipalityLabelsOverride: false,
  },
  lastTransform: {
    x: 0,
    y: 0,
    k: 1,
  },
};

export function loadPersistedState(): PersistedState {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_STATE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      visitedIds: Array.isArray(parsed.visitedIds) ? parsed.visitedIds.filter((value): value is string => typeof value === 'string') : [],
      prefs: {
        showMunicipalityLabelsOverride: Boolean(parsed.prefs?.showMunicipalityLabelsOverride),
      },
      lastTransform: {
        x: Number(parsed.lastTransform?.x ?? 0),
        y: Number(parsed.lastTransform?.y ?? 0),
        k: Number(parsed.lastTransform?.k ?? 1),
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function savePersistedState(state: PersistedState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
