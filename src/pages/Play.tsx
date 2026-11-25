import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import type { Square } from "chess.js";
import { Board } from "../components/Board";
import { Dialog } from "../components/Dialog";
import { Icon } from "../components/Icon";
import { MoveList } from "../components/MoveList";
import { PieceSvg } from "../components/Piece";
import { PlayerBar, material } from "../components/PlayerBar";
import { useToast } from "../components/Toast";
import { QuickToggles } from "../components/QuickToggles";
import { materialBalance } from "../lib/engine";
import { endHeadline, endReason, gameTitle, outcomeOf, playerNames } from "../lib/game-helpers";
import { useSettings } from "../lib/settings";
import { play } from "../lib/sound";
import { getSaved } from "../lib/storage";
import type { Color, GameConfig } from "../lib/types";
import { useGame, type GameInit } from "../lib/useGame";

export function Play() {
  const { id = "" } = useParams();
  const { state } = useLocation() as { state: { config?: GameConfig } | null };
  const init = useMemo<GameInit | null>(() => {
    const saved = getSaved(id);
    if (saved) return { id, config: saved.config, saved };
    if (state?.config) return { id, config: state.config };
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  if (!init) return <Navigate to="/new" replace />;
  return <PlayScreen key={id} init={init} />;
}

type Confirm = null | "resign" | "restart" | "draw-local" | "leave";

function PlayScreen({ init }: { init: GameInit }) {
  const game = useGame(init);
  const { settings } = useSettings();
  const toast = useToast();
  const nav = useNavigate();
  const { config, end, turn, history, ply, viewPly } = game;
  const names = playerNames(config, settings.playerName);
  const baseOrientation: Color = config.mode === "ai" ? config.humanColor : "w";
  const [flipped, setFlipped] = useState(false);
  const orientation: Color = flipped ? (baseOrientation === "w" ? "b" : "w") : baseOrientation;
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [showEnd, setShowEnd] = useState(false);

  useEffect(() => {
    if (end) {
      const t = setTimeout(() => setShowEnd(true), 450);
      return () => clearTimeout(t);
    }
    setShowEnd(false);
  }, [end]);

  // Keyboard review: ← → to step through moves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const cur = viewPly ?? ply;
      if (e.key === "ArrowLeft") game.setViewPly(Math.max(0, cur - 1));
      if (e.key === "ArrowRight") game.setViewPly(cur + 1 >= ply ? null : cur + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewPly, ply, game]);

  const reviewing = viewPly !== null && viewPly !== ply;
  const movable: Color[] =
    end || reviewing ? [] : config.mode === "ai" ? (game.thinking ? [] : [config.humanColor]) : ["w", "b"];

  const onMove = (from: Square, to: Square) => {
    if (game.isPromotion(from, to)) {
      if (settings.autoQueen) game.applyMove(from, to, "q");
      else setPromo({ from, to });
      return;
    }
    game.applyMove(from, to);
  };

  const mat = material(game.shownFen);
  const top: Color = orientation === "w" ? "b" : "w";
  const bottom: Color = orientation;
  const bar = (c: Color) => (
    <PlayerBar
      name={names[c]}
      color={c}
      subtitle={c === "w" ? "White" : "Black"}
      active={!end && turn === c}
      thinking={config.mode === "ai" && c !== config.humanColor && game.thinking}
      clockMs={game.remaining(c)}
      timed={game.timed}
      captured={c === "w" ? mat.lostB : mat.lostW}
      advantage={c === "w" ? mat.diff : -mat.diff}
    />
  );

  const status = end
    ? `${endHeadline(end, config, names)} ${endReason(end)}`
    : reviewing
      ? `Reviewing move ${Math.ceil((viewPly ?? 0) / 2) || "start"}`
      : game.thinking
        ? "Computer is thinking…"
        : `${config.mode === "ai" ? (turn === config.humanColor ? "Your move" : "Computer to move") : `${names[turn]} to move`}${game.inCheck ? " · Check!" : ""}`;

  const offerDraw = () => {
    if (config.mode === "local") return setConfirm("draw-local");
    const aiColor: Color = config.humanColor === "w" ? "b" : "w";
    const balance = materialBalance(game.chess.fen(), aiColor);
    if (ply >= 16 && balance <= 0) {
      toast("The computer accepts the draw.");
      game.agreeDraw();
    } else {
      toast(ply < 16 ? "The computer declines — it's too early." : "The computer declines the draw.");
    }
  };

  const doRestart = (swap = false) => {
    const next: GameConfig = swap && config.mode === "ai"
      ? { ...config, humanColor: config.humanColor === "w" ? "b" : "w" }
      : swap ? { ...config, whiteName: config.blackName, blackName: config.whiteName } : config;
    const newId = game.restart(next);
    setConfirm(null);
    setShowEnd(false);
    setFlipped(false);
    nav(`/play/${newId}`, { replace: true, state: { config: next } });
  };

  const resignColor: Color = config.mode === "ai" ? config.humanColor : turn;
  const canUndo = !end && ply > 0 && !(config.mode === "ai" && ply === 1 && config.humanColor === "b");
  const outcome = end ? outcomeOf({ config, end }) : null;

  return (
    <div className="play">
      <header className="play-head">
        <button className="icon-btn" onClick={() => (ply > 0 && !end ? setConfirm("leave") : nav("/"))} aria-label="Back">
          <Icon name="back" />
        </button>
        <div className="play-title">
          <h1>{gameTitle(config)}</h1>
          <p>{config.time.label}{config.time.initial > 0 ? " clock" : ""}</p>
        </div>
        <QuickToggles />
      </header>

      <div className="play-grid">
        <section className="board-col">
          {bar(top)}
          <div className={`board-wrap ${end ? "is-over" : ""}`}>
            <Board
              fen={game.shownFen}
              orientation={orientation}
              movable={movable}
              lastMove={game.shownLast}
              showLegal={settings.showLegal}
              showCoords={settings.showCoords}
              onMove={onMove}
              onSelect={() => play("select")}
            />
          </div>
          {bar(bottom)}
        </section>

        <aside className="side-col">
          <div className={`status ${game.inCheck && !end && !reviewing ? "is-check" : ""} ${end ? "is-end" : ""}`} aria-live="polite">
            <span className={`status-dot dot-${turn}`} />
            {status}
          </div>

          <div className="moves-card">
            <div className="moves-head">
              <h2>Moves</h2>
              <div className="review-nav">
                <button className="icon-btn sm" onClick={() => game.setViewPly(0)} disabled={ply === 0} aria-label="First move"><Icon name="first" size={18} /></button>
                <button className="icon-btn sm" onClick={() => game.setViewPly(Math.max(0, (viewPly ?? ply) - 1))} disabled={ply === 0 || viewPly === 0} aria-label="Previous move"><Icon name="prev" size={18} /></button>
                <button className="icon-btn sm" onClick={() => { const n = (viewPly ?? ply) + 1; game.setViewPly(n >= ply ? null : n); }} disabled={!reviewing} aria-label="Next move"><Icon name="next" size={18} /></button>
                <button className="icon-btn sm" onClick={() => game.setViewPly(null)} disabled={!reviewing} aria-label="Latest move"><Icon name="last" size={18} /></button>
              </div>
            </div>
            <MoveList history={history} current={viewPly ?? ply} onSelect={(p) => game.setViewPly(p === ply ? null : p)} />
          </div>

          <div className="controls">
            <button className="ctrl" onClick={game.undo} disabled={!canUndo}>
              <Icon name="undo" /> <span>Undo</span>
            </button>
            <button className="ctrl" onClick={() => setFlipped((f) => !f)}>
              <Icon name="flip" /> <span>Flip</span>
            </button>
            <button className="ctrl" onClick={offerDraw} disabled={!!end || ply < 2}>
              <Icon name="draw" /> <span>Draw</span>
            </button>
            <button className="ctrl" onClick={() => setConfirm("resign")} disabled={!!end || ply === 0}>
              <Icon name="flag" /> <span>Resign</span>
            </button>
            <button className="ctrl" onClick={() => (ply > 0 && !end ? setConfirm("restart") : doRestart())}>
              <Icon name="restart" /> <span>Restart</span>
            </button>
          </div>
          {!end && ply > 0 && <p className="autosave"><Icon name="check" size={14} /> Saved automatically — resume any time from Games.</p>}
        </aside>
      </div>

      <Dialog open={!!promo} onClose={() => setPromo(null)} title="Promote pawn" className="promo-dialog">
        <div className="promo-grid">
          {["q", "r", "b", "n"].map((t) => (
            <button
              key={t}
              className="promo-btn"
              onClick={() => {
                if (promo) game.applyMove(promo.from, promo.to, t);
                setPromo(null);
              }}
              aria-label={{ q: "Queen", r: "Rook", b: "Bishop", n: "Knight" }[t]}
            >
              <PieceSvg type={t} color={turn} />
            </button>
          ))}
        </div>
      </Dialog>

      <Dialog open={confirm === "resign"} onClose={() => setConfirm(null)} title={config.mode === "local" ? `${names[resignColor]} resigns?` : "Resign this game?"}>
        <p className="muted">It will count as a {config.mode === "ai" ? "loss in your record" : `win for ${names[resignColor === "w" ? "b" : "w"]}`}.</p>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Keep playing</button>
          <button className="btn btn-danger" onClick={() => { game.resign(resignColor); setConfirm(null); }}>Resign</button>
        </div>
      </Dialog>

      <Dialog open={confirm === "restart"} onClose={() => setConfirm(null)} title="Start over?">
        <p className="muted">The current game will be discarded and won't count toward your stats.</p>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => doRestart()}>Restart</button>
        </div>
      </Dialog>

      <Dialog open={confirm === "leave"} onClose={() => setConfirm(null)} title="Leave the game?">
        <p className="muted">Your game is saved. Pick it up any time from Games.</p>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Stay</button>
          <button className="btn btn-primary" onClick={() => nav("/games")}>Save &amp; exit</button>
        </div>
      </Dialog>

      <Dialog open={confirm === "draw-local"} onClose={() => setConfirm(null)} title="Draw offered">
        <p className="muted">{names[turn]} offers a draw. {names[turn === "w" ? "b" : "w"]}, do you accept?</p>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={() => { setConfirm(null); toast("Draw declined."); }}>Decline</button>
          <button className="btn btn-primary" onClick={() => { game.agreeDraw(); setConfirm(null); }}>Accept draw</button>
        </div>
      </Dialog>

      <Dialog open={showEnd && !!end} onClose={() => setShowEnd(false)} className={`end-dialog end-${outcome ?? "neutral"}`}>
        {end && (
          <>
            <div className="end-crest" aria-hidden="true">
              <PieceSvg type="k" color={end.result === "0-1" ? "b" : "w"} />
              {end.result === "1/2-1/2" && <PieceSvg type="k" color="b" />}
            </div>
            <h2 className="end-title">{endHeadline(end, config, names)}</h2>
            <p className="end-sub">{endReason(end)} · {end.result.replace("1/2", "½").replace("1/2", "½")} · {Math.ceil(ply / 2)} moves</p>
            <div className="end-actions">
              <button className="btn btn-primary btn-block" onClick={() => doRestart(true)}>
                Rematch{config.mode === "ai" ? " · switch sides" : ""}
              </button>
              <div className="end-row">
                <button className="btn btn-ghost" onClick={() => setShowEnd(false)}><Icon name="eye" size={18} /> Review</button>
                <Link className="btn btn-ghost" to="/new"><Icon name="restart" size={18} /> New setup</Link>
              </div>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
