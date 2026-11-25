/**
 * Device-local persistence for settings, saved games and finished games.
 *
 * Every read/write in the app goes through this module, so syncing to the
 * account backend (see PLAN.md) means replacing these functions with API calls
 * without touching the screens.
 */
import type { FinishedGame, SavedGame, Settings } from "./types";

const KEYS = {
  settings: "gambit:settings",
  saved: "gambit:saved",
  finished: "gambit:finished",
};

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  boardTheme: "walnut",
  sound: true,
  showLegal: true,
  showCoords: true,
  autoQueen: false,
  animations: true,
  playerName: "You",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — non-fatal */
  }
  window.dispatchEvent(new CustomEvent("gambit:storage", { detail: key }));
}

export const loadSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) });
export const saveSettings = (s: Settings) => write(KEYS.settings, s);

export const listSaved = (): SavedGame[] =>
  read<SavedGame[]>(KEYS.saved, []).sort((a, b) => b.updatedAt - a.updatedAt);
export const getSaved = (id: string) => listSaved().find((g) => g.id === id) ?? null;
export function upsertSaved(game: SavedGame) {
  const all = read<SavedGame[]>(KEYS.saved, []).filter((g) => g.id !== game.id);
  write(KEYS.saved, [game, ...all].slice(0, 30));
}
export function removeSaved(id: string) {
  write(KEYS.saved, read<SavedGame[]>(KEYS.saved, []).filter((g) => g.id !== id));
}

export const listFinished = (): FinishedGame[] =>
  read<FinishedGame[]>(KEYS.finished, []).sort((a, b) => b.endedAt - a.endedAt);
export function addFinished(game: FinishedGame) {
  const all = read<FinishedGame[]>(KEYS.finished, []).filter((g) => g.id !== game.id);
  write(KEYS.finished, [game, ...all].slice(0, 500));
}
export function clearHistory() {
  write(KEYS.finished, []);
}

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
