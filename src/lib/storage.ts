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

export interface LoadedPersistedState {
  state: PersistedState;
  warning: string | null;
}

export function loadPersistedState(): LoadedPersistedState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return {
      state: DEFAULT_STATE,
      warning: 'Saved progress could not be read from browser storage.',
    };
  }

  if (!raw) {
    return {
      state: DEFAULT_STATE,
      warning: null,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      state: {
        visitedIds: Array.isArray(parsed.visitedIds)
          ? parsed.visitedIds.filter((value): value is string => typeof value === 'string')
          : [],
        prefs: {
          showMunicipalityLabelsOverride: Boolean(parsed.prefs?.showMunicipalityLabelsOverride),
        },
        lastTransform: normalizeTransform(parsed.lastTransform),
      },
      warning: null,
    };
  } catch {
    return {
      state: DEFAULT_STATE,
      warning: 'Saved progress was corrupted and was reset to defaults.',
    };
  }
}

export function savePersistedState(state: PersistedState): string | null {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return null;
  } catch {
    return 'Progress could not be saved to browser storage.';
  }
}
