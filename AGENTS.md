# AGENTS.md — Let's Chess

**Continue from [PLAN.md](./PLAN.md).** Milestone 1 (the full client-side product) is done. Milestone 2 starts with a decision only the user can make: MySQL (as requested, connection string in a secret env var) or Netlify Database. Ask before you build it.

## Architecture

The project is a Vite + React 19 + TypeScript SPA with no server yet. `netlify.toml` builds into `dist` and rewrites every path to `index.html`. When adding the backend, use a **Netlify Server** (`netlify/server/index.ts`) for `/api/*` rather than functions, and make sure the SPA rewrite doesn't catch `/api/*`.

```
src/
  main.tsx, App.tsx        Router, providers, top nav (desktop) / tab bar (mobile)
  pages/                   Home, NewGame, Play, Games (saved + history), Review, Profile, Settings
  components/              Board (pointer drag/tap, stable piece ids for animation), Piece (own SVG set),
                           PlayerBar (clock, captures), MoveList, Dialog, Toast, Icon, QuickToggles
  lib/
    useGame.ts             Game controller: chess.js instance, clocks + increment, undo, AI turn,
                           end detection, autosave/finish → storage
    engine.ts              Alpha-beta search + quiescence; uses chess.js internal 0x88 API (_moves/_makeMove/_undoMove)
    ai.worker.ts, ai.ts    Web Worker wrapper; cancelAi() drops stale replies on undo/restart
    storage.ts             The ONLY persistence layer (localStorage). Replace with API calls for sync.
    settings.tsx           Settings context; sets data-theme / data-board / data-motion on <html>
    sound.ts               Web Audio synthesised sounds (no assets)
    game-helpers.ts        Names, titles, outcomes, stats aggregation, relative time
    types.ts               Shared types + TIME_CONTROLS
  data/fixtures.ts         Showcase-only data (hero game, online lobby preview, feature copy)
  styles/global.css        All styling; theme tokens at the top
```

## Conventions & non-obvious decisions

- **Rules come only from chess.js.** Never hand-roll move legality in the UI. The engine uses chess.js's private internals for speed. If you upgrade chess.js, re-check `_moves`, `_makeMove`, `_undoMove`, `_board`, `_turn` and `_isKingAttacked`.
- **Piece animation:** `Board` diffs successive positions to keep a stable id per piece, so transforms transition, including on undo and in review mode. Pieces are absolutely positioned with `translate(col*100%, row*100%)`.
- **Clocks** don't start until the first move. Undo restores the clock snapshot from before the undone ply. A timeout against a side with no mating material is a draw.
- **AI undo** takes back two plies so it's the human's turn again.
- **Restart/rematch** calls `game.restart()` (which discards the unfinished save) and then navigates to `/play/<newId>`. `Play` is keyed by id.
- **Stats** are derived from finished games (`computeStats`) rather than stored as counters. The backend should still recompute them server-side.
- The stats chart colours (`--win/--draw/--loss`) were validated for colour-vision deficiency in both themes. Keep labels and numbers next to them.
- Theme is applied before React mounts by an inline script in `index.html`, which avoids a flash of the wrong theme.
- Keep changes minimal and match the existing plain-CSS approach (no Tailwind).
