import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Chess, type Square } from "chess.js";
import { PieceSvg, PIECE_NAME } from "./Piece";
import type { Color } from "../lib/types";

interface BoardPiece {
  id: string;
  sq: Square;
  type: string;
  color: Color;
}

interface Props {
  fen: string;
  orientation: Color;
  /** colours the user may move right now (empty = view only) */
  movable: Color[];
  lastMove?: { from: string; to: string } | null;
  showLegal?: boolean;
  showCoords?: boolean;
  onMove?: (from: Square, to: Square) => void;
  onSelect?: () => void;
  size?: "full" | "mini";
}

const FILES = "abcdefgh";
let pieceSeq = 0;

function coords(sq: string, orientation: Color) {
  const f = FILES.indexOf(sq[0]);
  const r = Number(sq[1]);
  return orientation === "w" ? { col: f, row: 8 - r } : { col: 7 - f, row: r - 1 };
}
function squareAt(col: number, row: number, orientation: Color): Square {
  return (orientation === "w" ? FILES[col] + (8 - row) : FILES[7 - col] + (row + 1)) as Square;
}
const dist = (a: string, b: string) =>
  Math.abs(a.charCodeAt(0) - b.charCodeAt(0)) + Math.abs(Number(a[1]) - Number(b[1]));

/** Keep a stable id per physical piece across positions so moves animate (incl. undo). */
function diffPieces(prev: BoardPiece[], chess: Chess): BoardPiece[] {
  const cur: Omit<BoardPiece, "id">[] = [];
  for (const row of chess.board()) for (const p of row) if (p) cur.push({ sq: p.square, type: p.type, color: p.color });
  const pool = new Set(prev);
  const out: BoardPiece[] = [];
  const pending: Omit<BoardPiece, "id">[] = [];
  for (const c of cur) {
    const hit = [...pool].find((p) => p.sq === c.sq && p.type === c.type && p.color === c.color);
    if (hit) { pool.delete(hit); out.push({ ...c, id: hit.id }); } else pending.push(c);
  }
  const claim = (c: Omit<BoardPiece, "id">, pred: (p: BoardPiece) => boolean) => {
    let best: BoardPiece | null = null;
    for (const p of pool) if (pred(p) && (!best || dist(p.sq, c.sq) < dist(best.sq, c.sq))) best = p;
    if (best) pool.delete(best);
    return best;
  };
  for (const c of pending) {
    const hit =
      claim(c, (p) => p.type === c.type && p.color === c.color) ??
      claim(c, (p) => p.type === "p" && p.color === c.color);
    out.push({ ...c, id: hit ? hit.id : `pc${++pieceSeq}` });
  }
  return out;
}

export function Board({
  fen,
  orientation,
  movable,
  lastMove,
  showLegal = true,
  showCoords = true,
  onMove,
  onSelect,
  size = "full",
}: Props) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const prevPieces = useRef<BoardPiece[]>([]);
  const pieces = useMemo(() => {
    const next = diffPieces(prevPieces.current, chess);
    return next;
  }, [chess]);
  useLayoutEffect(() => {
    prevPieces.current = pieces;
  }, [pieces]);

  const [selected, setSelected] = useState<Square | null>(null);
  const [drag, setDrag] = useState<{ from: Square; x: number; y: number; moved: boolean; wasSelected: boolean } | null>(null);
  const [hover, setHover] = useState<Square | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const startRef = useRef({ x: 0, y: 0 });

  // Clear selection whenever the position changes.
  useLayoutEffect(() => {
    setSelected(null);
    setDrag(null);
  }, [fen]);

  const targets = useMemo(() => {
    if (!selected) return new Map<string, boolean>();
    const m = new Map<string, boolean>();
    for (const mv of chess.moves({ square: selected, verbose: true })) m.set(mv.to, !!mv.captured);
    return m;
  }, [chess, selected]);

  const turn = chess.turn();
  const canMoveColor = movable.includes(turn);
  const checkSq = chess.inCheck()
    ? chess.findPiece({ type: "k", color: turn })[0]
    : null;

  const pointToSquare = (clientX: number, clientY: number): Square | null => {
    const el = boardRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const col = Math.floor(((clientX - r.left) / r.width) * 8);
    const row = Math.floor(((clientY - r.top) / r.height) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return squareAt(col, row, orientation);
  };

  const relPos = (clientX: number, clientY: number) => {
    const r = boardRef.current!.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const tryMove = (from: Square, to: Square) => {
    if (targets.has(to) || chess.moves({ square: from, verbose: true }).some((m) => m.to === to)) {
      onMove?.(from, to);
      setSelected(null);
      return true;
    }
    return false;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !onMove) return;
    const sq = pointToSquare(e.clientX, e.clientY);
    if (!sq) return;
    const piece = chess.get(sq);
    if (selected && sq !== selected && targets.has(sq)) {
      tryMove(selected, sq);
      return;
    }
    if (piece && piece.color === turn && canMoveColor) {
      e.currentTarget.setPointerCapture(e.pointerId);
      startRef.current = { x: e.clientX, y: e.clientY };
      const p = relPos(e.clientX, e.clientY);
      setDrag({ from: sq, x: p.x, y: p.y, moved: false, wasSelected: selected === sq });
      if (selected !== sq) onSelect?.();
      setSelected(sq);
      return;
    }
    setSelected(null);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const moved = drag.moved || Math.hypot(e.clientX - startRef.current.x, e.clientY - startRef.current.y) > 5;
    const p = relPos(e.clientX, e.clientY);
    setDrag({ ...drag, x: p.x, y: p.y, moved });
    setHover(moved ? pointToSquare(e.clientX, e.clientY) : null);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const sq = pointToSquare(e.clientX, e.clientY);
    if (drag.moved) {
      if (sq && sq !== drag.from) tryMove(drag.from, sq);
    } else if (drag.wasSelected) {
      setSelected(null);
    }
    setDrag(null);
    setHover(null);
  };

  const squares = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = squareAt(col, row, orientation);
      const dark = (col + row) % 2 === 1;
      const cls = ["sq", dark ? "sq-dark" : "sq-light"];
      if (lastMove && (lastMove.from === sq || lastMove.to === sq)) cls.push("sq-last");
      if (selected === sq) cls.push("sq-sel");
      if (checkSq === sq) cls.push("sq-check");
      if (hover === sq && targets.has(sq)) cls.push("sq-hover");
      squares.push(
        <div key={sq} className={cls.join(" ")} data-square={sq}>
          {showCoords && size === "full" && col === 0 && <span className="coord coord-rank">{sq[1]}</span>}
          {showCoords && size === "full" && row === 7 && <span className="coord coord-file">{sq[0]}</span>}
          {showLegal && targets.has(sq) && <span className={targets.get(sq) ? "hint hint-capture" : "hint hint-dot"} />}
        </div>,
      );
    }
  }

  return (
    <div
      ref={boardRef}
      className={`board board-${size} ${onMove ? "is-interactive" : ""} ${drag?.moved ? "is-dragging" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { setDrag(null); setHover(null); }}
      role="grid"
      aria-label="Chessboard"
    >
      <div className="board-squares">{squares}</div>
      <div className="board-pieces">
        {pieces.map((p) => {
          const { col, row } = coords(p.sq, orientation);
          const dragging = drag?.moved && drag.from === p.sq;
          const style = dragging
            ? { transform: `translate(calc(${drag!.x}px - 50%), calc(${drag!.y}px - 50%)) scale(1.12)`, zIndex: 20, transition: "none" }
            : { transform: `translate(${col * 100}%, ${row * 100}%)` };
          return (
            <div
              key={p.id}
              className={`pc ${dragging ? "pc-dragging" : ""} ${selected === p.sq ? "pc-lift" : ""}`}
              style={style}
              aria-label={`${p.color === "w" ? "White" : "Black"} ${PIECE_NAME[p.type]} on ${p.sq}`}
            >
              <PieceSvg type={p.type} color={p.color} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
