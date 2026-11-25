import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import { Board } from "../components/Board";
import { Icon } from "../components/Icon";
import { FEATURES, HERO_GAME, ONLINE_PREVIEW, DIFFICULTY_INFO } from "../data/fixtures";
import { listFinished, listSaved, newId } from "../lib/storage";
import { computeStats, gameTitle, makeConfig, relTime, useStorageVersion } from "../lib/game-helpers";
import { DIFFICULTY_LABEL, type Difficulty } from "../lib/types";
import { useSettings } from "../lib/settings";

function useHeroPlayback() {
  const positions = useMemo(() => {
    const c = new Chess();
    const out = [{ fen: c.fen(), last: null as { from: string; to: string } | null }];
    for (const san of HERO_GAME.moves) {
      const m = c.move(san);
      out.push({ fen: c.fen(), last: { from: m.from, to: m.to } });
    }
    return out;
  }, []);
  const [i, setI] = useState(0);
  useEffect(() => {
    const atEnd = i >= positions.length - 1;
    const t = setTimeout(() => setI(atEnd ? 0 : i + 1), atEnd ? 3800 : i === 0 ? 1400 : 1100);
    return () => clearTimeout(t);
  }, [i, positions.length]);
  return { ...positions[i], ply: i, total: positions.length - 1 };
}

export function Home() {
  const hero = useHeroPlayback();
  const nav = useNavigate();
  const { settings } = useSettings();
  useStorageVersion();
  const saved = listSaved();
  const stats = computeStats(listFinished());
  const resume = saved[0];

  const quickStart = (difficulty: Difficulty) => {
    const config = makeConfig({ mode: "ai", difficulty, humanColor: "w" });
    nav(`/play/${newId()}`, { state: { config } });
  };

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow reveal" style={{ animationDelay: "0ms" }}>Chess for the pocket and the desk</p>
          <h1 className="display reveal" style={{ animationDelay: "80ms" }}>
            Every move,<br /><em>beautifully</em> played.
          </h1>
          <p className="lede reveal" style={{ animationDelay: "160ms" }}>
            Let's Chess is a calm, premium chessboard. Play the AI on three levels or face a friend on the same screen. Real clocks, full rules, and games that wait for you.
          </p>
          <div className="hero-ctas reveal" style={{ animationDelay: "240ms" }}>
            <Link to="/new?mode=ai" className="btn btn-primary btn-lg">
              <Icon name="cpu" /> Play the computer
            </Link>
            <Link to="/new?mode=local" className="btn btn-ghost btn-lg">
              <Icon name="users" /> Pass &amp; play
            </Link>
          </div>
          <div className="quick reveal" style={{ animationDelay: "320ms" }}>
            <span className="quick-label">Quick start as White</span>
            {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
              <button key={d} className={`chip chip-${d}`} onClick={() => quickStart(d)}>
                {DIFFICULTY_LABEL[d]} <small>{DIFFICULTY_INFO[d].rating}</small>
              </button>
            ))}
          </div>
        </div>

        <figure className="hero-board reveal" style={{ animationDelay: "120ms" }}>
          <div className="hero-board-frame">
            <Board fen={hero.fen} orientation="w" movable={[]} lastMove={hero.last} showCoords={settings.showCoords} />
          </div>
          <figcaption>
            <span className="hero-cap-title">{HERO_GAME.title}</span>
            <span className="hero-cap-sub">{HERO_GAME.caption}</span>
            <span className="hero-progress" aria-hidden="true">
              <i style={{ transform: `scaleX(${hero.ply / hero.total})` }} />
            </span>
          </figcaption>
        </figure>
      </section>

      {resume && (
        <section className="resume-card">
          <div>
            <p className="eyebrow">Continue where you left off</p>
            <h3>{gameTitle(resume.config)}</h3>
            <p className="muted">
              Move {Math.ceil(resume.moves.length / 2)} · {resume.config.time.label} · {relTime(resume.updatedAt)}
              {saved.length > 1 && ` · ${saved.length - 1} more saved`}
            </p>
          </div>
          <div className="resume-actions">
            <Link className="btn btn-ghost" to="/games">All games</Link>
            <Link className="btn btn-primary" to={`/play/${resume.id}`}>Resume <Icon name="chevron" size={18} /></Link>
          </div>
        </section>
      )}

      {stats.total > 0 && (
        <section className="stat-strip">
          <div><b>{stats.total}</b><span>games</span></div>
          <div><b>{stats.ai.win}</b><span>wins vs AI</span></div>
          <div><b>{stats.bestStreak}</b><span>best streak</span></div>
          <Link to="/profile" className="stat-strip-link">Your stats <Icon name="chevron" size={16} /></Link>
        </section>
      )}

      <section className="features">
        <h2 className="section-title">Everything a real game needs.</h2>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <article key={f.title} className="feature reveal" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="feature-icon"><Icon name={f.icon} size={22} /></span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
        <p className="rules-note">
          Full rules: castling, en passant, promotion, check, checkmate, stalemate, threefold repetition, the fifty-move rule and insufficient material.
          Moves are shown in standard algebraic notation (SAN).
        </p>
      </section>

      <section className="online">
        <div className="online-copy">
          <p className="eyebrow"><Icon name="globe" size={14} /> Coming soon</p>
          <h2 className="section-title">Online play is on the way.</h2>
          <p className="muted">
            Accounts, rated matchmaking and games synced across devices are next on the roadmap. For now, everything stays on this device.
          </p>
        </div>
        <ul className="lobby" aria-label="Preview of the online lobby">
          {ONLINE_PREVIEW.map((p) => (
            <li key={p.name}>
              <span className="lobby-flag">{p.flag}</span>
              <span className="lobby-name">{p.name}</span>
              <span className="lobby-rating">{p.rating}</span>
              <span className="lobby-tc">{p.tc}</span>
              <span className="lobby-join">Join</span>
            </li>
          ))}
        </ul>
      </section>
     <footer className="footer">
    Let's Chess ·{" "}
    <small className="copyright">
        Designed with{" "}
        <span style={{ color: "#fb866a" }}>❤️</span>{" "}
        by{" "}
        <a
            className="app-link"
            href="https://modulelabs.in/"
            target="_blank"
            rel="noopener noreferrer"
        >
            ModuleLabs.
        </a>
    </small>
</footer>
    </div>
  );
}
