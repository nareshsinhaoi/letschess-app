import { Chess } from "chess.js";
import { PieceSvg } from "./Piece";
import type { Color } from "../lib/types";

const START: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

/** Pieces of `color` that have been captured, plus total material per side. */
export function material(fen: string) {
  const counts = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 } as Record<string, number>, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } as Record<string, number> };
  for (const row of new Chess(fen).board()) for (const p of row) if (p && p.type !== "k") counts[p.color][p.type]++;
  const lost = (c: Color) => {
    const out: string[] = [];
    for (const t of ["q", "r", "b", "n", "p"]) for (let i = counts[c][t]; i < START[t]; i++) out.push(t);
    return out;
  };
  const score = (c: Color) => Object.entries(counts[c]).reduce((s, [t, n]) => s + VAL[t] * n, 0);
  return { lostW: lost("w"), lostB: lost("b"), diff: score("w") - score("b") };
}

export function formatClock(ms: number) {
  const t = Math.max(0, ms);
  if (t < 10_000) return `${Math.floor(t / 1000)}.${Math.floor((t % 1000) / 100)}`;
  const s = Math.ceil(t / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m % 60).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function PlayerBar({
  name,
  color,
  subtitle,
  active,
  thinking,
  clockMs,
  timed,
  captured,
  advantage,
}: {
  name: string;
  color: Color;
  subtitle?: string;
  active: boolean;
  thinking?: boolean;
  clockMs: number;
  timed: boolean;
  captured: string[];
  advantage: number;
}) {
  const low = timed && clockMs < 20_000;
  return (
    <div className={`player ${active ? "is-active" : ""}`}>
      <div className={`avatar avatar-${color}`}>
        <PieceSvg type="k" color={color} />
      </div>
      <div className="player-info">
        <div className="player-name">
          {name}
          {thinking && (
            <span className="thinking" aria-label="Thinking">
              <i /><i /><i />
            </span>
          )}
        </div>
        <div className="player-captured">
          {captured.length === 0 && <span className="player-sub">{subtitle}</span>}
          {captured.map((t, i) => (
            <PieceSvg key={i} type={t} color={color === "w" ? "b" : "w"} className="cap" />
          ))}
          {advantage > 0 && <span className="adv">+{advantage}</span>}
        </div>
      </div>
      {timed && (
        <div className={`clock ${active ? "is-running" : ""} ${low ? "is-low" : ""}`} role="timer">
          {formatClock(clockMs)}
        </div>
      )}
    </div>
  );
}
