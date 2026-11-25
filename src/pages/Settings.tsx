import { useState } from "react";
import { Dialog } from "../components/Dialog";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { useSettings } from "../lib/settings";
import { play } from "../lib/sound";
import { clearHistory, listSaved, removeSaved } from "../lib/storage";
import type { BoardTheme, Settings, ThemePref } from "../lib/types";

const BOARDS: { id: BoardTheme; label: string }[] = [
  { id: "walnut", label: "Walnut" },
  { id: "slate", label: "Slate" },
  { id: "sage", label: "Sage" },
  { id: "rosewood", label: "Rosewood" },
];

function Toggle({ label, hint, k }: { label: string; hint?: string; k: keyof Settings }) {
  const { settings, update } = useSettings();
  const on = settings[k] as boolean;
  return (
    <label className="row">
      <span className="row-text">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
      <button role="switch" aria-checked={on} className={`switch ${on ? "on" : ""}`} onClick={() => update({ [k]: !on } as Partial<Settings>)}>
        <i />
      </button>
    </label>
  );
}

export function SettingsPage() {
  const { settings, update } = useSettings();
  const toast = useToast();
  const [confirm, setConfirm] = useState<null | "history" | "saved">(null);

  return (
    <div className="page narrow">
      <header className="page-head">
        <p className="eyebrow">Preferences</p>
        <h1 className="page-title">Settings</h1>
      </header>

      <section className="card">
        <h2 className="card-title">Appearance</h2>
        <div className="row">
          <span className="row-text"><span>Theme</span></span>
          <div className="seg seg-sm">
            {(["system", "light", "dark"] as ThemePref[]).map((t) => (
              <button key={t} className={settings.theme === t ? "on" : ""} onClick={() => update({ theme: t })}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="board-themes">
          {BOARDS.map((b) => (
            <button key={b.id} className={`board-theme ${settings.boardTheme === b.id ? "on" : ""}`} data-board-preview={b.id} onClick={() => update({ boardTheme: b.id })} aria-pressed={settings.boardTheme === b.id}>
              <span className="bt-swatch"><i /><i /><i /><i /></span>
              <span>{b.label}</span>
            </button>
          ))}
        </div>
        <Toggle label="Animations" hint="Slide pieces and animate menus" k="animations" />
      </section>

      <section className="card">
        <h2 className="card-title">Gameplay</h2>
        <Toggle label="Show legal moves" hint="Dots on the squares a piece can reach" k="showLegal" />
        <Toggle label="Board coordinates" k="showCoords" />
        <Toggle label="Auto-promote to queen" hint="Skip the promotion picker" k="autoQueen" />
      </section>

      <section className="card">
        <h2 className="card-title">Sound</h2>
        <Toggle label="Move sounds" k="sound" />
        <div className="row">
          <span className="row-text"><span>Preview</span></span>
          <div className="sound-preview">
            {(["move", "capture", "check", "end"] as const).map((k) => (
              <button key={k} className="chip" onClick={() => play(k)} disabled={!settings.sound}>{k}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Data on this device</h2>
        <div className="row">
          <span className="row-text"><span>Saved games</span><small>Unfinished games waiting to be resumed</small></span>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirm("saved")}>Clear</button>
        </div>
        <div className="row">
          <span className="row-text"><span>Game history &amp; stats</span><small>Resets wins, losses, draws and streaks</small></span>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirm("history")}>Reset</button>
        </div>
      </section>

      <section className="card soon">
        <h2 className="card-title"><Icon name="globe" size={18} /> Account &amp; online play</h2>
        <p className="muted">Sign-in, cloud sync of your games and stats, and online matches are coming next. Your local games will carry over.</p>
      </section>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title={confirm === "history" ? "Reset history and stats?" : "Delete all saved games?"}>
        <p className="muted">This can't be undone.</p>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (confirm === "history") clearHistory();
              else listSaved().forEach((g) => removeSaved(g.id));
              toast(confirm === "history" ? "History cleared" : "Saved games deleted");
              setConfirm(null);
            }}
          >
            Confirm
          </button>
        </div>
      </Dialog>
    </div>
  );
}
