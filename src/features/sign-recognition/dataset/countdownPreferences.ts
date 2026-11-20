import type { DatasetSign } from './datasetTypes';

export const COUNTDOWN_OPTIONS = [0, 1, 2, 3, 5] as const;
export type CountdownSeconds = typeof COUNTDOWN_OPTIONS[number];
type ExpectedHands = DatasetSign['expectedHands'];
type CountdownPreferences = Record<ExpectedHands, CountdownSeconds>;

const defaults = { 0: 0, 1: 0, 2: 3 } as const;
const preferencesKey = (hands: ExpectedHands) => `senaverse-dataset-countdown-${hands}`;

export function loadCountdownPreferences(): CountdownPreferences {
  const preferences: CountdownPreferences = { ...defaults };
  try {
    for (const hands of [0, 1, 2] as const) {
      const saved = window.localStorage.getItem(preferencesKey(hands));
      preferences[hands] = COUNTDOWN_OPTIONS.find(seconds => String(seconds) === saved) ?? defaults[hands];
    }
  } catch { /* Use the defaults when browser storage is unavailable. */ }
  return preferences;
}

export function saveCountdownPreference(hands: ExpectedHands, seconds: CountdownSeconds) {
  try { window.localStorage.setItem(preferencesKey(hands), String(seconds)); }
  catch { /* Keep the selected value for this session. */ }
}
