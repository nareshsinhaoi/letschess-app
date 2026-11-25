import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Chess } from "chess.js";
import { Board } from "../components/Board";
import { Icon } from "../components/Icon";
import { MoveList } from "../components/MoveList";
import { useToast } from "../components/Toast";
import { endHeadline, endReason, gameTitle, playerNames } from "../lib/game-helpers";
import { useSettings } from "../lib/settings";
import { listFinished } from "../lib/storage";

export function Review() {
  const { id } = useParams();
  const game = useMemo(() => listFinished().find((g) => g.id === id) ?? null, [id]);
  const { settings } = useSettings();
  const toast = useToast();
  const replay = useMemo(() => {
    const c = new Chess();
    if (game) for (const san of game.moves) { try { c.move(san); } catch { break; } }
    return c;
  }, [game]);
  const history = useMemo(() => replay.history({ verbose: true }), [replay]);
  const [ply, setPly] = useState(history.length);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setPly((p) => Math.max(0, p - 1));
      if (e.key === "ArrowRight") setPly((p) => Math.min(history.length, p + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history.length]);

  if (!game) return <Navigate to="/games?tab=history" replace />;
  const names = playerNames(game.config, settings.playerName);
  const fen = ply === 0 ? new Chess().fen() : history[ply - 1].after;
  const base = game.config.mode === "ai" ? game.config.humanColor : "w";
  const orientation = flip ? (base === "w" ? "b" : "w") : base;

  const copyPgn = async () => {
    replay.setHeader("Event", gameTitle(game.config));
    replay.setHeader("White", names.w);
    replay.setHeader("Black", names.b);
    replay.setHeader("Result", game.end.result);
    replay.setHeader("Date", new Date(game.endedAt).toISOString().slice(0, 10).replace(/-/g, "."));
    try {
      await navigator.clipboard.writeText(replay.pgn());
      toast("PGN copied to clipboard");
    } catch {
      toast("Couldn't access the clipboard");
    }
  };

  return (
    <div className="play">
      <header className="play-head">
        <Link className="icon-btn" to="/games?tab=history" aria-label="Back to history"><Icon name="back" /></Link>
        <div className="play-title">
          <h1>{names.w} vs {names.b}</h1>
          <p>{endHeadline(game.end, game.config, names)} {endReason(game.end)}</p>
        </div>
        <button className="icon-btn" onClick={() => setFlip((f) => !f)} aria-label="Flip board"><Icon name="flip" /></button>
      </header>
      <div className="play-grid">
        <section className="board-col">
          <div className="board-wrap">
            <Board fen={fen} orientation={orientation} movable={[]} lastMove={ply > 0 ? history[ply - 1] : null} showCoords={settings.showCoords} />
          </div>
          <div className="scrubber">
            <button className="icon-btn" onClick={() => setPly(0)} aria-label="Start"><Icon name="first" /></button>
            <button className="icon-btn" onClick={() => setPly((p) => Math.max(0, p - 1))} aria-label="Previous"><Icon name="prev" /></button>
            <input type="range" min={0} max={history.length} value={ply} onChange={(e) => setPly(Number(e.target.value))} aria-label="Move" />
            <button className="icon-btn" onClick={() => setPly((p) => Math.min(history.length, p + 1))} aria-label="Next"><Icon name="next" /></button>
            <button className="icon-btn" onClick={() => setPly(history.length)} aria-label="End"><Icon name="last" /></button>
          </div>
        </section>
        <aside className="side-col">
          <div className="status is-end">{game.end.result.replace(/1\/2/g, "½")} · {gameTitle(game.config)} · {game.config.time.label}</div>
          <div className="moves-card">
            <div className="moves-head"><h2>Moves</h2><button className="btn btn-ghost btn-sm" onClick={copyPgn}>Copy PGN</button></div>
            <MoveList history={history} current={ply} onSelect={setPly} />
          </div>
        </aside>
      </div>
    </div>
  );
}
