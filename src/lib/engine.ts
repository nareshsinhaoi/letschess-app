/**
 * Let's Chess AI — a compact alpha-beta searcher built on chess.js.
 *
 * chess.js's public `moves()` builds SAN + FEN for every move, which is far too
 * slow for tree search. Its internal 0x88 move generator (`_moves`, `_makeMove`,
 * `_undoMove`) is available at runtime, so the search uses that directly. The
 * public API is still used for everything the UI touches.
 */
import { Chess } from "chess.js";
import type { Difficulty } from "./types";

type Color = "w" | "b";
interface IMove {
  color: Color;
  from: number;
  to: number;
  piece: string;
  captured?: string;
  promotion?: string;
  flags: number;
}
interface Internal {
  _moves(o: { legal: boolean }): IMove[];
  _makeMove(m: IMove): void;
  _undoMove(): unknown;
  _board: ({ type: string; color: Color } | undefined)[];
  _turn: Color;
  _isKingAttacked(c: Color): boolean;
}

const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 100000;

// Piece-square tables from White's point of view, index 0 = a8.
const PST: Record<string, number[]> = {
  p: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20],
  ke: [-50,-40,-30,-20,-20,-30,-40,-50,-30,-20,-10,0,0,-10,-20,-30,-30,-10,20,30,30,20,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,20,30,30,20,-10,-30,-30,-30,0,0,0,0,-30,-30,-50,-30,-30,-30,-30,-30,-30,-50],
};

class Abort extends Error {}

export interface SearchResult {
  from: string;
  to: string;
  promotion?: string;
  score: number;
  depth: number;
  nodes: number;
}

const sq = (i: number) => "abcdefgh"[i & 7] + String(8 - (i >> 4));

function evaluate(g: Internal): number {
  let score = 0;
  let phase = 0;
  const board = g._board;
  for (let i = 0; i < 128; i++) {
    if (i & 0x88) { i += 7; continue; }
    const p = board[i];
    if (p && p.type !== "p" && p.type !== "k") phase += VALUE[p.type];
  }
  const endgame = phase <= 2600;
  let wBishops = 0, bBishops = 0;
  for (let i = 0; i < 128; i++) {
    if (i & 0x88) { i += 7; continue; }
    const p = board[i];
    if (!p) continue;
    const row = i >> 4, col = i & 7;
    const idx = p.color === "w" ? row * 8 + col : (7 - row) * 8 + col;
    const table = p.type === "k" && endgame ? PST.ke : PST[p.type];
    const v = VALUE[p.type] + table[idx];
    if (p.color === "w") { score += v; if (p.type === "b") wBishops++; }
    else { score -= v; if (p.type === "b") bBishops++; }
  }
  if (wBishops >= 2) score += 30;
  if (bBishops >= 2) score -= 30;
  return g._turn === "w" ? score : -score;
}

function orderScore(m: IMove, pvFrom = -1, pvTo = -1): number {
  if (m.from === pvFrom && m.to === pvTo) return 1e6;
  let s = 0;
  if (m.captured) s += 10 * VALUE[m.captured] - VALUE[m.piece];
  if (m.promotion) s += VALUE[m.promotion];
  return s;
}

function sortMoves(moves: IMove[], pvFrom = -1, pvTo = -1) {
  const scored = moves.map((m) => ({ m, s: orderScore(m, pvFrom, pvTo) }));
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.m);
}

export function findBestMove(fen: string, difficulty: Difficulty): SearchResult | null {
  const chess = new Chess(fen);
  const g = chess as unknown as Internal;
  const rootMoves = g._moves({ legal: true });
  if (rootMoves.length === 0) return null;

  const settings = {
    easy: { maxDepth: 1, timeMs: 400, qDepth: 1, window: 220, blunder: 0.3 },
    medium: { maxDepth: 2, timeMs: 900, qDepth: 3, window: 35, blunder: 0.05 },
    hard: { maxDepth: 5, timeMs: 1800, qDepth: 6, window: 0, blunder: 0 },
  }[difficulty];

  const deadline = performance.now() + settings.timeMs;
  let nodes = 0;
  const tick = () => {
    if ((++nodes & 1023) === 0 && performance.now() > deadline) throw new Abort();
  };

  const quiesce = (alpha: number, beta: number, qd: number): number => {
    tick();
    const stand = evaluate(g);
    if (stand >= beta) return beta;
    if (alpha < stand) alpha = stand;
    if (qd <= 0) return alpha;
    const moves = g._moves({ legal: true });
    if (moves.length === 0) return g._isKingAttacked(g._turn) ? -MATE : 0;
    const noisy = sortMoves(moves.filter((m) => m.captured || m.promotion));
    for (const m of noisy) {
      g._makeMove(m);
      const s = -quiesce(-beta, -alpha, qd - 1);
      g._undoMove();
      if (s >= beta) return beta;
      if (s > alpha) alpha = s;
    }
    return alpha;
  };

  const search = (depth: number, alpha: number, beta: number, ply: number): number => {
    tick();
    const moves = g._moves({ legal: true });
    if (moves.length === 0) return g._isKingAttacked(g._turn) ? -MATE + ply : 0;
    if (depth <= 0) return quiesce(alpha, beta, settings.qDepth);
    for (const m of sortMoves(moves)) {
      g._makeMove(m);
      const s = -search(depth - 1, -beta, -alpha, ply + 1);
      g._undoMove();
      if (s >= beta) return beta;
      if (s > alpha) alpha = s;
    }
    return alpha;
  };

  // Easy/medium need an exact score for every root move to pick a "human" move,
  // so they search the root with a full window. Hard uses normal alpha-beta.
  const exactRoot = settings.window > 0;
  let completed: { move: IMove; score: number }[] = [];
  let completedDepth = 0;
  let pv: IMove | null = null;

  for (let depth = 1; depth <= settings.maxDepth; depth++) {
    const results: { move: IMove; score: number }[] = [];
    let alpha = -Infinity;
    try {
      for (const m of sortMoves(rootMoves, pv?.from, pv?.to)) {
        g._makeMove(m);
        let s: number;
        try {
          s = exactRoot
            ? -search(depth - 1, -Infinity, Infinity, 1)
            : -search(depth - 1, -Infinity, -alpha, 1);
        } finally {
          g._undoMove();
        }
        results.push({ move: m, score: s });
        if (s > alpha) alpha = s;
      }
    } catch (e) {
      if (!(e instanceof Abort)) throw e;
      // Keep a partial iteration only if it already found something better.
      if (completed.length === 0 && results.length > 0) completed = results;
      break;
    }
    completed = results;
    completedDepth = depth;
    completed.sort((a, b) => b.score - a.score);
    pv = completed[0].move;
    if (Math.abs(completed[0].score) > MATE - 100) break; // forced mate found
  }

  if (completed.length === 0) completed = rootMoves.map((m) => ({ move: m, score: 0 }));
  completed.sort((a, b) => b.score - a.score);

  let choice = completed[0];
  if (settings.blunder > 0 && Math.random() < settings.blunder) {
    choice = completed[Math.floor(Math.random() * completed.length)];
  } else if (settings.window > 0) {
    const best = completed[0].score;
    const pool = completed.filter((r) => r.score >= best - settings.window);
    choice = pool[Math.floor(Math.random() * pool.length)];
  }

  return {
    from: sq(choice.move.from),
    to: sq(choice.move.to),
    promotion: choice.move.promotion,
    score: choice.score,
    depth: completedDepth,
    nodes,
  };
}

/** Static material balance in centipawns from `color`'s side — used for draw offers. */
export function materialBalance(fen: string, color: Color): number {
  const chess = new Chess(fen);
  let s = 0;
  for (const row of chess.board())
    for (const p of row) if (p) s += (p.color === color ? 1 : -1) * VALUE[p.type];
  return s;
}
