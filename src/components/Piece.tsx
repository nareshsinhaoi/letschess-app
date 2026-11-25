import type { ReactElement } from "react";
import type { Color } from "../lib/types";

/** Let's Chess's own geometric piece set, drawn on a 100×100 grid. */
const SHAPES: Record<string, ReactElement> = {
  p: (
    <>
      <path d="M36 78c0-14 5-23 9-29h10c4 6 9 15 9 29z" />
      <ellipse cx="50" cy="47" rx="12" ry="4" />
      <circle cx="50" cy="31" r="11" />
    </>
  ),
  r: (
    <>
      <path d="M33 76l3-32h28l3 32z" />
      <path d="M28 20h10v8h7v-8h10v8h7v-8h10v18l-6 6H34l-6-6z" />
      <path d="M38 52h24" className="pc-line" />
    </>
  ),
  n: (
    <>
      <path d="M68 76H33c0-13 5-19 14-25-6 0-12 3-17 2-5-1-7-7-4-11l15-16c2-6 6-10 13-12l2 6c10 4 16 16 16 30 0 10-2 18-4 26z" />
      <circle cx="46" cy="31" r="2.6" className="pc-eye" />
      <path d="M58 22c5 6 7 14 7 24" className="pc-line" />
    </>
  ),
  b: (
    <>
      <path d="M36 76c0-12 4-19 8-23h12c4 4 8 11 8 23z" />
      <ellipse cx="50" cy="52" rx="13" ry="4" />
      <path d="M50 17c-12 11-15 21-10 31h20c5-10 2-20-10-31z" />
      <path d="M55 27l-9 11" className="pc-line" />
      <circle cx="50" cy="13" r="4" />
    </>
  ),
  q: (
    <>
      <path d="M30 72l-6-38 9 20 4-28 7 24 6-28 6 28 7-24 4 28 9-20-6 38z" />
      <circle cx="24" cy="32" r="4" />
      <circle cx="37" cy="24" r="4" />
      <circle cx="50" cy="19" r="4.5" />
      <circle cx="63" cy="24" r="4" />
      <circle cx="76" cy="32" r="4" />
      <rect x="28" y="70" width="44" height="8" rx="2" />
    </>
  ),
  k: (
    <>
      <path d="M46 8h8v8h7v7h-7v15h-8V23h-7v-7h7z" />
      <path d="M31 72c-5-15-3-28 7-32 6-2 10 1 12 6 2-5 6-8 12-6 10 4 12 17 7 32z" />
      <rect x="28" y="70" width="44" height="8" rx="2" />
    </>
  ),
};

export function PieceSvg({ type, color, className }: { type: string; color: Color; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`piece-svg pc-${color} ${className ?? ""}`} aria-hidden="true">
      <g>
        {SHAPES[type]}
        <rect x="22" y="78" width="56" height="10" rx="3" />
      </g>
    </svg>
  );
}

export const PIECE_NAME: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};
