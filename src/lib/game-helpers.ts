import { useEffect, useState } from "react";
import { DIFFICULTY_LABEL, TIME_CONTROLS, type Color, type Difficulty, type FinishedGame, type GameConfig, type GameEnd, type Mode } from "./types";

export function makeConfig(opts: Partial<GameConfig> & { mode: Mode }): GameConfig {
  return {
    difficulty: "medium",
    humanColor: "w",
    time: TIME_CONTROLS[0],
    whiteName: "White",
    blackName: "Black",
    ...opts,
  };
}

export const aiName = (d: Difficulty) => `AI · ${DIFFICULTY_LABEL[d]}`;

export function playerNames(config: GameConfig, you: string): Record<Color, string> {
  if (config.mode === "local") return { w: config.whiteName || "White", b: config.blackName || "Black" };
  const ai = aiName(config.difficulty);
  return config.humanColor === "w" ? { w: you, b: ai } : { w: ai, b: you };
}

export function gameTitle(config: GameConfig) {
  return config.mode === "ai" ? `vs Computer · ${DIFFICULTY_LABEL[config.difficulty]}` : "Pass & play";
}

export type Outcome = "win" | "loss" | "draw";

/** Outcome from the human's perspective — only meaningful for AI games. */
export function outcomeOf(g: { config: GameConfig; end: GameEnd }): Outcome | null {
  if (g.config.mode !== "ai") return null;
  if (g.end.result === "1/2-1/2") return "draw";
  const winner: Color = g.end.result === "1-0" ? "w" : "b";
  return winner === g.config.humanColor ? "win" : "loss";
}

export function endHeadline(end: GameEnd, config: GameConfig, names: Record<Color, string>) {
  const o = outcomeOf({ config, end });
  if (o === "win") return "You won";
  if (o === "loss") return "You lost";
  if (end.result === "1/2-1/2") return "Draw";
  return `${end.result === "1-0" ? names.w : names.b} wins`;
}

export function endReason(end: GameEnd) {
  switch (end.reason) {
    case "checkmate": return "by checkmate";
    case "resignation": return "by resignation";
    case "timeout": return end.result === "1/2-1/2" ? "timeout vs insufficient material" : "on time";
    case "agreement": return "by agreement";
    default: return `by ${end.reason}`;
  }
}

export interface Stats {
  total: number;
  ai: { win: number; loss: number; draw: number; total: number };
  byDifficulty: Record<Difficulty, { win: number; loss: number; draw: number }>;
  local: { white: number; black: number; draw: number; total: number };
  currentStreak: number;
  bestStreak: number;
  favoriteTime: string | null;
  totalMoves: number;
}

export function computeStats(games: FinishedGame[]): Stats {
  const s: Stats = {
    total: games.length,
    ai: { win: 0, loss: 0, draw: 0, total: 0 },
    byDifficulty: { easy: { win: 0, loss: 0, draw: 0 }, medium: { win: 0, loss: 0, draw: 0 }, hard: { win: 0, loss: 0, draw: 0 } },
    local: { white: 0, black: 0, draw: 0, total: 0 },
    currentStreak: 0,
    bestStreak: 0,
    favoriteTime: null,
    totalMoves: 0,
  };
  const tcCount = new Map<string, number>();
  // oldest → newest for streaks
  const chrono = [...games].sort((a, b) => a.endedAt - b.endedAt);
  let run = 0;
  for (const g of chrono) {
    s.totalMoves += Math.ceil(g.moves.length / 2);
    tcCount.set(g.config.time.label, (tcCount.get(g.config.time.label) ?? 0) + 1);
    const o = outcomeOf(g);
    if (o) {
      s.ai[o]++;
      s.ai.total++;
      s.byDifficulty[g.config.difficulty][o]++;
      run = o === "win" ? run + 1 : 0;
      s.bestStreak = Math.max(s.bestStreak, run);
    } else {
      s.local.total++;
      if (g.end.result === "1-0") s.local.white++;
      else if (g.end.result === "0-1") s.local.black++;
      else s.local.draw++;
    }
  }
  s.currentStreak = run;
  let best = 0;
  for (const [k, v] of tcCount) if (v > best) { best = v; s.favoriteTime = k; }
  return s;
}

export function relTime(ts: number) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)} min ago`;
  if (d < 86400) return `${Math.floor(d / 3600)} h ago`;
  if (d < 86400 * 7) return `${Math.floor(d / 86400)} d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Re-render when another part of the app writes to storage. */
export function useStorageVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const on = () => setV((x) => x + 1);
    window.addEventListener("gambit:storage", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("gambit:storage", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return v;
}
