import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Move, type Square } from "chess.js";
import { requestAiMove, cancelAi } from "./ai";
import { play } from "./sound";
import { addFinished, newId, removeSaved, upsertSaved } from "./storage";
import type { Color, GameConfig, GameEnd, SavedGame } from "./types";

const START_FEN = new Chess().fen();

function hasMatingMaterial(chess: Chess, color: Color) {
  let minors = 0;
  for (const row of chess.board())
    for (const p of row) {
      if (!p || p.color !== color || p.type === "k") continue;
      if (p.type === "p" || p.type === "r" || p.type === "q") return true;
      minors++;
    }
  return minors >= 2;
}

function detectEnd(chess: Chess): GameEnd | null {
  if (chess.isCheckmate()) return { result: chess.turn() === "w" ? "0-1" : "1-0", reason: "checkmate" };
  if (chess.isStalemate()) return { result: "1/2-1/2", reason: "stalemate" };
  if (chess.isInsufficientMaterial()) return { result: "1/2-1/2", reason: "insufficient material" };
  if (chess.isThreefoldRepetition()) return { result: "1/2-1/2", reason: "threefold repetition" };
  if (chess.isDrawByFiftyMoves()) return { result: "1/2-1/2", reason: "fifty-move rule" };
  return null;
}

export interface GameInit {
  id: string;
  config: GameConfig;
  saved?: SavedGame | null;
}

export function useGame(init: GameInit) {
  const chessRef = useRef<Chess | null>(null);
  const clocksRef = useRef({ w: init.config.time.initial * 1000, b: init.config.time.initial * 1000 });
  const clockHist = useRef<{ w: number; b: number }[]>([]);
  const turnStart = useRef<number | null>(null);
  const createdAt = useRef(init.saved?.createdAt ?? Date.now());

  if (!chessRef.current) {
    const c = new Chess();
    if (init.saved) {
      for (const san of init.saved.moves) {
        clockHist.current.push({ ...init.saved.clocks });
        try { c.move(san); } catch { break; }
      }
      clocksRef.current = { ...init.saved.clocks };
      if (c.history().length > 0) turnStart.current = Date.now();
    }
    chessRef.current = c;
  }

  const [version, setVersion] = useState(0);
  const [config, setConfig] = useState(init.config);
  const [gameId, setGameId] = useState(init.id);
  const [end, setEnd] = useState<GameEnd | null>(null);
  const [thinking, setThinking] = useState(false);
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const live = useRef({ config, gameId, end });
  live.current = { config, gameId, end };
  const bump = () => setVersion((v) => v + 1);
  const timed = config.time.initial > 0;

  const remaining = useCallback((color: Color) => {
    const base = clocksRef.current[color];
    const c = chessRef.current!;
    if (!live.current.end && turnStart.current !== null && c.turn() === color) return base - (Date.now() - turnStart.current);
    return base;
  }, []);

  const persist = useCallback(() => {
    const c = chessRef.current!;
    const { config: cfg, gameId: id, end: e } = live.current;
    if (e) return;
    if (c.history().length === 0) { removeSaved(id); return; }
    upsertSaved({
      id,
      config: cfg,
      moves: c.history(),
      fen: c.fen(),
      clocks: { w: Math.max(0, remaining("w")), b: Math.max(0, remaining("b")) },
      createdAt: createdAt.current,
      updatedAt: Date.now(),
    });
  }, [remaining]);

  const finish = useCallback((e: GameEnd) => {
    const c = chessRef.current!;
    const turn = c.turn();
    if (turnStart.current !== null) {
      clocksRef.current[turn] = Math.max(0, clocksRef.current[turn] - (Date.now() - turnStart.current));
      turnStart.current = null;
    }
    const { config: cfg, gameId: id } = live.current;
    live.current.end = e;
    setEnd(e);
    removeSaved(id);
    addFinished({ id, config: cfg, moves: c.history(), end: e, endedAt: Date.now() });
    setTimeout(() => play("end"), 220);
  }, []);

  const applyMove = useCallback(
    (from: string, to: string, promotion?: string): Move | null => {
      const c = chessRef.current!;
      if (live.current.end) return null;
      let mv: Move;
      try {
        mv = c.move({ from, to, promotion });
      } catch {
        return null;
      }
      clockHist.current.push({ ...clocksRef.current });
      const t = Date.now();
      if (live.current.config.time.initial > 0) {
        if (turnStart.current !== null) {
          clocksRef.current[mv.color] -= t - turnStart.current;
          clocksRef.current[mv.color] += live.current.config.time.increment * 1000;
        }
        turnStart.current = t;
      }
      if (c.inCheck()) play("check");
      else if (mv.isKingsideCastle() || mv.isQueensideCastle()) play("castle");
      else if (mv.captured) play("capture");
      else play("move");

      const e = detectEnd(c);
      if (e) finish(e);
      else persist();
      setViewPly(null);
      bump();
      return mv;
    },
    [finish, persist],
  );

  // Clock ticker + flag detection.
  useEffect(() => {
    if (!timed || end) return;
    const iv = setInterval(() => {
      setTick((n) => n + 1);
      const c = chessRef.current!;
      if (turnStart.current === null) return;
      const side = c.turn();
      if (remaining(side) <= 0) {
        clocksRef.current[side] = 0;
        turnStart.current = null;
        const other: Color = side === "w" ? "b" : "w";
        finish(
          hasMatingMaterial(c, other)
            ? { result: other === "w" ? "1-0" : "0-1", reason: "timeout" }
            : { result: "1/2-1/2", reason: "timeout" },
        );
      }
    }, 100);
    return () => clearInterval(iv);
  }, [timed, end, version, remaining, finish]);

  // Save clock state when the tab is hidden or the screen unmounts.
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && persist();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", persist);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", persist);
      persist();
    };
  }, [persist]);

  // AI turn.
  useEffect(() => {
    if (config.mode !== "ai" || end) return;
    const c = chessRef.current!;
    if (c.turn() === config.humanColor || c.isGameOver()) return;
    let cancelled = false;
    setThinking(true);
    requestAiMove(c.fen(), config.difficulty).then((r) => {
      if (cancelled) return;
      setThinking(false);
      if (r) applyMove(r.from, r.to, r.promotion);
    });
    return () => {
      cancelled = true;
      cancelAi();
      setThinking(false);
    };
  }, [version, config, end, applyMove]);

  const undo = useCallback(() => {
    const c = chessRef.current!;
    if (live.current.end || c.history().length === 0) return;
    const popOne = () => {
      if (!c.undo()) return false;
      clocksRef.current = clockHist.current.pop() ?? clocksRef.current;
      return true;
    };
    popOne();
    const cfg = live.current.config;
    if (cfg.mode === "ai" && c.turn() !== cfg.humanColor && c.history().length > 0) popOne();
    turnStart.current = timed && c.history().length > 0 ? Date.now() : null;
    play("move");
    persist();
    setViewPly(null);
    bump();
  }, [persist, timed]);

  const restart = useCallback(
    (next?: GameConfig) => {
      cancelAi();
      const c = chessRef.current!;
      if (!live.current.end && c.history().length > 0) removeSaved(live.current.gameId);
      const cfg = next ?? live.current.config;
      chessRef.current = new Chess();
      clocksRef.current = { w: cfg.time.initial * 1000, b: cfg.time.initial * 1000 };
      clockHist.current = [];
      turnStart.current = null;
      createdAt.current = Date.now();
      const id = newId();
      live.current = { config: cfg, gameId: id, end: null };
      setConfig(cfg);
      setGameId(id);
      setEnd(null);
      setViewPly(null);
      bump();
      return id;
    },
    [],
  );

  const resign = useCallback((color: Color) => finish({ result: color === "w" ? "0-1" : "1-0", reason: "resignation" }), [finish]);
  const agreeDraw = useCallback(() => finish({ result: "1/2-1/2", reason: "agreement" }), [finish]);

  const chess = chessRef.current!;
  const history = useMemo(() => chess.history({ verbose: true }), [chess, version]);
  const ply = history.length;
  const shownPly = viewPly ?? ply;
  const shownFen = shownPly === ply ? chess.fen() : shownPly === 0 ? START_FEN : history[shownPly - 1].after;
  const shownLast = shownPly > 0 ? history[shownPly - 1] : null;

  const isPromotion = (from: Square, to: Square) =>
    chess.moves({ square: from, verbose: true }).some((m) => m.to === to && !!m.promotion);

  return {
    chess,
    config,
    gameId,
    end,
    thinking,
    history,
    ply,
    viewPly,
    setViewPly,
    shownFen,
    shownLast,
    turn: chess.turn() as Color,
    inCheck: chess.inCheck(),
    timed,
    remaining,
    applyMove,
    isPromotion,
    undo,
    restart,
    resign,
    agreeDraw,
  };
}

export type GameApi = ReturnType<typeof useGame>;
