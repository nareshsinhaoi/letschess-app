import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Board } from "../components/Board";
import { Dialog } from "../components/Dialog";
import { Icon } from "../components/Icon";
import { formatClock } from "../components/PlayerBar";
import { endHeadline, endReason, gameTitle, outcomeOf, playerNames, relTime, useStorageVersion } from "../lib/game-helpers";
import { useSettings } from "../lib/settings";
import { listFinished, listSaved, removeSaved } from "../lib/storage";
import type { SavedGame } from "../lib/types";

export function Games() {
  useStorageVersion();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "history" ? "history" : "saved";
  const { settings } = useSettings();
  const saved = listSaved();
  const finished = listFinished();
  const [toDelete, setToDelete] = useState<SavedGame | null>(null);

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Your games</p>
        <h1 className="page-title">Games</h1>
      </header>
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={tab === "saved"} className={tab === "saved" ? "on" : ""} onClick={() => setParams({})}>
          In progress <span className="count">{saved.length}</span>
        </button>
        <button role="tab" aria-selected={tab === "history"} className={tab === "history" ? "on" : ""} onClick={() => setParams({ tab: "history" })}>
          History <span className="count">{finished.length}</span>
        </button>
      </div>

      {tab === "saved" &&
        (saved.length === 0 ? (
          <Empty title="No games in progress" text="Unfinished games are saved automatically after the first move." />
        ) : (
          <div className="saved-grid">
            {saved.map((g) => {
              const names = playerNames(g.config, settings.playerName);
              const turn = g.fen.split(" ")[1] as "w" | "b";
              return (
                <article key={g.id} className="saved-card">
                  <Link to={`/play/${g.id}`} className="saved-board" aria-label="Resume game">
                    <Board fen={g.fen} orientation={g.config.mode === "ai" ? g.config.humanColor : "w"} movable={[]} size="mini" showLegal={false} />
                  </Link>
                  <div className="saved-body">
                    <h3>{gameTitle(g.config)}</h3>
                    <p className="muted">{names.w} vs {names.b}</p>
                    <p className="saved-meta">
                      <span>Move {Math.ceil(g.moves.length / 2)}</span>
                      <span>{turn === "w" ? "White" : "Black"} to play</span>
                      {g.config.time.initial > 0 && <span className="mono">{formatClock(g.clocks.w)} · {formatClock(g.clocks.b)}</span>}
                      <span>{relTime(g.updatedAt)}</span>
                    </p>
                    <div className="saved-actions">
                      <Link to={`/play/${g.id}`} className="btn btn-primary btn-sm">Resume</Link>
                      <button className="icon-btn sm" onClick={() => setToDelete(g)} aria-label="Delete saved game"><Icon name="trash" size={18} /></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ))}

      {tab === "history" &&
        (finished.length === 0 ? (
          <Empty title="No finished games yet" text="Completed games show up here with their result, so you can replay them move by move." />
        ) : (
          <ul className="history">
            {finished.map((g) => {
              const names = playerNames(g.config, settings.playerName);
              const o = outcomeOf(g);
              return (
                <li key={g.id}>
                  <Link to={`/review/${g.id}`} className="history-row">
                    <span className={`result-badge rb-${o ?? "local"}`}>{o ? o[0].toUpperCase() : g.end.result.replace(/1\/2/g, "½")}</span>
                    <span className="history-main">
                      <b>{g.config.mode === "ai" ? gameTitle(g.config) : `${names.w} vs ${names.b}`}</b>
                      <span className="muted">{endHeadline(g.end, g.config, names)} {endReason(g.end)} · {Math.ceil(g.moves.length / 2)} moves · {g.config.time.label}</span>
                    </span>
                    <span className="history-date">{relTime(g.endedAt)}</span>
                    <Icon name="chevron" size={18} />
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)} title="Delete this saved game?">
        <p className="muted">This can't be undone.</p>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={() => setToDelete(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={() => { if (toDelete) removeSaved(toDelete.id); setToDelete(null); }}>Delete</button>
        </div>
      </Dialog>
    </div>
  );
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <div className="empty-art" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => <i key={i} className={(Math.floor(i / 4) + i) % 2 ? "d" : ""} />)}
      </div>
      <h3>{title}</h3>
      <p className="muted">{text}</p>
      <Link to="/new" className="btn btn-primary">Start a game</Link>
    </div>
  );
}
