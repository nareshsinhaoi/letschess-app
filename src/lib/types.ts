export type Color = "w" | "b";
export type Mode = "ai" | "local";
export type Difficulty = "easy" | "medium" | "hard";
export type ThemePref = "system" | "dark" | "light";
export type BoardTheme = "walnut" | "slate" | "sage" | "rosewood";

export interface TimeControl {
  id: string;
  label: string;
  /** seconds per side; 0 means untimed */
  initial: number;
  /** seconds added after each move */
  increment: number;
}

export interface GameConfig {
  mode: Mode;
  difficulty: Difficulty;
  /** the human's colour in AI mode */
  humanColor: Color;
  time: TimeControl;
  whiteName: string;
  blackName: string;
}

export type Result = "1-0" | "0-1" | "1/2-1/2";

export interface GameEnd {
  result: Result;
  reason:
    | "checkmate"
    | "stalemate"
    | "threefold repetition"
    | "fifty-move rule"
    | "insufficient material"
    | "timeout"
    | "resignation"
    | "agreement";
}

/** An unfinished game that can be resumed. */
export interface SavedGame {
  id: string;
  config: GameConfig;
  moves: string[];
  fen: string;
  clocks: { w: number; b: number };
  createdAt: number;
  updatedAt: number;
}

/** A completed game, used for history and statistics. */
export interface FinishedGame {
  id: string;
  config: GameConfig;
  moves: string[];
  end: GameEnd;
  endedAt: number;
}

export interface Settings {
  theme: ThemePref;
  boardTheme: BoardTheme;
  sound: boolean;
  showLegal: boolean;
  showCoords: boolean;
  autoQueen: boolean;
  animations: boolean;
  playerName: string;
}

export const TIME_CONTROLS: TimeControl[] = [
  { id: "none", label: "No clock", initial: 0, increment: 0 },
  { id: "bullet", label: "1 + 0", initial: 60, increment: 0 },
  { id: "blitz3", label: "3 + 2", initial: 180, increment: 2 },
  { id: "blitz5", label: "5 + 0", initial: 300, increment: 0 },
  { id: "rapid10", label: "10 + 0", initial: 600, increment: 0 },
  { id: "rapid15", label: "15 + 10", initial: 900, increment: 10 },
  { id: "classical", label: "30 + 0", initial: 1800, increment: 0 },
];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};
