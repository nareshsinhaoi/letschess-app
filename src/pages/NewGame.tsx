import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { PieceSvg } from "../components/Piece";
import { DIFFICULTY_INFO } from "../data/fixtures";
import { makeConfig } from "../lib/game-helpers";
import { useSettings } from "../lib/settings";
import { newId } from "../lib/storage";
import { DIFFICULTY_LABEL, TIME_CONTROLS, type Color, type Difficulty, type Mode } from "../lib/types";

type Side = Color | "random";

export function NewGame() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { settings } = useSettings();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "local" ? "local" : "ai");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [side, setSide] = useState<Side>("w");
  const [timeId, setTimeId] = useState("none");
  const [whiteName, setWhiteName] = useState(settings.playerName === "You" ? "Player 1" : settings.playerName);
  const [blackName, setBlackName] = useState("Player 2");

  const start = () => {
    const humanColor: Color = side === "random" ? (Math.random() < 0.5 ? "w" : "b") : side;
    const config = makeConfig({
      mode,
      difficulty,
      humanColor,
      time: TIME_CONTROLS.find((t) => t.id === timeId)!,
      whiteName: whiteName.trim().slice(0, 24) || "White",
      blackName: blackName.trim().slice(0, 24) || "Black",
    });
    nav(`/play/${newId()}`, { state: { config } });
  };

  return (
    <div className="page narrow">
      <header className="page-head">
        <p className="eyebrow">New game</p>
        <h1 className="page-title">Set up the board</h1>
      </header>

      <div className="seg seg-lg" role="tablist" aria-label="Game mode">
        <button role="tab" aria-selected={mode === "ai"} className={mode === "ai" ? "on" : ""} onClick={() => setMode("ai")}>
          <Icon name="cpu" /> vs Computer
        </button>
        <button role="tab" aria-selected={mode === "local"} className={mode === "local" ? "on" : ""} onClick={() => setMode("local")}>
          <Icon name="users" /> Pass &amp; play
        </button>
      </div>

      {mode === "ai" ? (
        <>
          <section className="field">
            <h2 className="field-label">Difficulty</h2>
            <div className="diff-grid">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d, i) => (
                <button key={d} className={`diff ${difficulty === d ? "on" : ""}`} onClick={() => setDifficulty(d)} aria-pressed={difficulty === d}>
                  <span className="diff-pips" aria-hidden="true">
                    {[0, 1, 2].map((k) => <i key={k} className={k <= i ? "lit" : ""} />)}
                  </span>
                  <span className="diff-name">{DIFFICULTY_LABEL[d]}</span>
                  <span className="diff-rating">{DIFFICULTY_INFO[d].rating}</span>
                  <span className="diff-blurb">{DIFFICULTY_INFO[d].blurb}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="field">
            <h2 className="field-label">Play as</h2>
            <div className="side-grid">
              {(["w", "random", "b"] as Side[]).map((s) => (
                <button key={s} className={`side ${side === s ? "on" : ""}`} onClick={() => setSide(s)} aria-pressed={side === s}>
                  {s === "random" ? (
                    <span className="side-random"><PieceSvg type="k" color="w" /><PieceSvg type="k" color="b" /></span>
                  ) : (
                    <PieceSvg type="k" color={s} />
                  )}
                  <span>{s === "w" ? "White" : s === "b" ? "Black" : "Random"}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="field">
          <h2 className="field-label">Players</h2>
          <div className="names">
            <label className="input-wrap">
              <span className="input-piece"><PieceSvg type="k" color="w" /></span>
              <input value={whiteName} onChange={(e) => setWhiteName(e.target.value)} maxLength={24} aria-label="White player name" />
            </label>
            <label className="input-wrap">
              <span className="input-piece"><PieceSvg type="k" color="b" /></span>
              <input value={blackName} onChange={(e) => setBlackName(e.target.value)} maxLength={24} aria-label="Black player name" />
            </label>
          </div>
        </section>
      )}

      <section className="field">
        <h2 className="field-label">Time control <small>minutes + increment</small></h2>
        <div className="chips">
          {TIME_CONTROLS.map((t) => (
            <button key={t.id} className={`chip ${timeId === t.id ? "on" : ""}`} onClick={() => setTimeId(t.id)} aria-pressed={timeId === t.id}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <button className="btn btn-primary btn-lg btn-block start-btn" onClick={start}>
        Start game <Icon name="chevron" />
      </button>
    </div>
  );
}
