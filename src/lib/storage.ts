import { STORAGE_KEY } from '../constants';
import { normalizeTransform } from './mapTransform';
import { DEFAULT_MAP_TRANSFORM } from '../types/state';
import type { PersistedState } from '../types/state';

const DEFAULT_STATE: PersistedState = {
  visitedIds: [],
  prefs: {
    showMunicipalityLabelsOverride: false,
  },
  lastTransform: DEFAULT_MAP_TRANSFORM,
};

export function loadPersistedState(): PersistedState {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_STATE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      visitedIds: Array.isArray(parsed.visitedIds)
        ? parsed.visitedIds.filter((value): value is string => typeof value === 'string')
        : [],
      prefs: {
        showMunicipalityLabelsOverride: Boolean(parsed.prefs?.showMunicipalityLabelsOverride),
      },
      lastTransform: normalizeTransform(parsed.lastTransform),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function savePersistedState(state: PersistedState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
