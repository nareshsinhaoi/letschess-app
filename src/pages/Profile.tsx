import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Empty } from "./Games";
import { computeStats, endHeadline, endReason, gameTitle, outcomeOf, playerNames, relTime, useStorageVersion, type Outcome } from "../lib/game-helpers";
import { useSettings } from "../lib/settings";
import { listFinished, listSaved } from "../lib/storage";
import { DIFFICULTY_LABEL, type Difficulty } from "../lib/types";

const SEG: { key: Outcome; label: string }[] = [
  { key: "win", label: "Wins" },
  { key: "draw", label: "Draws" },
  { key: "loss", label: "Losses" },
];

function ResultBar({ label, counts }: { label: string; counts: Record<Outcome, number> }) {
  const total = counts.win + counts.draw + counts.loss;
  const [tip, setTip] = useState<Outcome | null>(null);
  return (
    <div className="rbar">
      <div className="rbar-head">
        <span className="rbar-label">{label}</span>
        <span className="rbar-nums">
          {total === 0 ? "No games" : `${counts.win} W · ${counts.draw} D · ${counts.loss} L`}
        </span>
      </div>
      <div className="rbar-track" role="img" aria-label={`${label}: ${counts.win} wins, ${counts.draw} draws, ${counts.loss} losses`}>
        {total > 0 &&
          SEG.filter((s) => counts[s.key] > 0).map((s) => (
            <span
              key={s.key}
              className={`rbar-seg seg-${s.key}`}
              style={{ flexGrow: counts[s.key] }}
              tabIndex={0}
              onMouseEnter={() => setTip(s.key)}
              onMouseLeave={() => setTip(null)}
              onFocus={() => setTip(s.key)}
              onBlur={() => setTip(null)}
            >
              {tip === s.key && (
                <span className="tooltip">
                  {s.label}: {counts[s.key]} ({Math.round((counts[s.key] / total) * 100)}%)
                </span>
              )}
            </span>
          ))}
      </div>
    </div>
  );
}

export function Profile() {
  useStorageVersion();
  const { settings, update } = useSettings();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(settings.playerName);
  const finished = listFinished();
  const saved = listSaved();
  const s = computeStats(finished);
  const winRate = s.ai.total ? Math.round((s.ai.win / s.ai.total) * 100) : null;

  const saveName = () => {
    update({ playerName: name.trim().slice(0, 24) || "You" });
    setEditing(false);
  };

  return (
    <div className="page">
      <header className="profile-head">
        <div className="profile-avatar" aria-hidden="true">{(settings.playerName[0] ?? "Y").toUpperCase()}</div>
        <div className="profile-id">
          {editing ? (
            <form onSubmit={(e) => { e.preventDefault(); saveName(); }} className="name-form">
              <input autoFocus value={name} maxLength={24} onChange={(e) => setName(e.target.value)} aria-label="Display name" />
              <button className="btn btn-primary btn-sm" type="submit">Save</button>
            </form>
          ) : (
            <h1 className="page-title">
              {settings.playerName}
              <button className="icon-btn sm" onClick={() => { setName(settings.playerName); setEditing(true); }} aria-label="Edit name"><Icon name="edit" size={16} /></button>
            </h1>
          )}
          <p className="muted">Local profile · stats are kept on this device</p>
        </div>
      </header>

      {s.total === 0 ? (
        <Empty title="Your record starts here" text="Finish a game against the computer or a friend and your wins, losses, draws and streaks appear here." />
      ) : (
        <>
          <section className="tiles">
            <div className="tile"><span className="tile-label">Games played</span><b className="tile-value">{s.total}</b><span className="tile-foot">{saved.length} in progress</span></div>
            <div className="tile tile-accent"><span className="tile-label">Win rate vs AI</span><b className="tile-value">{winRate === null ? "—" : `${winRate}%`}</b><span className="tile-foot">{s.ai.total} AI games</span></div>
            <div className="tile"><span className="tile-label">Current streak</span><b className="tile-value">{s.currentStreak}</b><span className="tile-foot">best {s.bestStreak}</span></div>
            <div className="tile"><span className="tile-label">Moves played</span><b className="tile-value">{s.totalMoves}</b><span className="tile-foot">favourite: {s.favoriteTime ?? "—"}</span></div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Results vs the computer</h2>
              <ul className="legend" aria-label="Legend">
                {SEG.map((x) => <li key={x.key}><i className={`sw seg-${x.key}`} />{x.label}</li>)}
              </ul>
            </div>
            <ResultBar label="All levels" counts={s.ai} />
            {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
              <ResultBar key={d} label={DIFFICULTY_LABEL[d]} counts={s.byDifficulty[d]} />
            ))}
          </section>

          <section className="card">
            <div className="card-head"><h2>Pass &amp; play</h2><span className="muted">{s.local.total} games</span></div>
            <div className="local-split">
              <div><b>{s.local.white}</b><span>White wins</span></div>
              <div><b>{s.local.draw}</b><span>Draws</span></div>
              <div><b>{s.local.black}</b><span>Black wins</span></div>
            </div>
          </section>

          <section className="card">
            <div className="card-head"><h2>Recent games</h2><Link to="/games?tab=history" className="link">See all</Link></div>
            <ul className="history compact">
              {finished.slice(0, 5).map((g) => {
                const o = outcomeOf(g);
                const names = playerNames(g.config, settings.playerName);
                return (
                  <li key={g.id}>
                    <Link to={`/review/${g.id}`} className="history-row">
                      <span className={`result-badge rb-${o ?? "local"}`}>{o ? o[0].toUpperCase() : g.end.result.replace(/1\/2/g, "½")}</span>
                      <span className="history-main">
                        <b>{gameTitle(g.config)}</b>
                        <span className="muted">{endHeadline(g.end, g.config, names)} {endReason(g.end)}</span>
                      </span>
                      <span className="history-date">{relTime(g.endedAt)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
