# Let's Chess — Product Roadmap

Let's Chess is a mobile-first chess app with full rules, a three-level AI, pass-and-play, clocks, saved games and personal stats. The roadmap ships the complete playing experience first, then adds accounts, a database and online play on top, without changing the screens players already use.

## Milestone 1 — Playable product (✅ done)

- Landing page with a live replay of a famous game, quick-start buttons, a "continue" card and a preview of online play.
- New-game setup: vs Computer (Easy / Medium / Hard, play as White, Black or Random) or Pass & play (named players), plus 7 time controls with increments.
- Play screen: drag or tap to move, legal-move hints, last-move and check highlights, animated pieces, promotion picker, en passant and castling, undo, flip, draw offers, resign, restart, a SAN move list with move-by-move review, live clocks with low-time warnings and a game-over sheet with rematch.
- End detection: checkmate, stalemate, threefold repetition, fifty-move rule, insufficient material, timeout (draw when the winner can't mate).
- AI runs an alpha-beta search in a Web Worker, so the UI never freezes.
- Games: unfinished games are saved automatically, clocks included, and can be resumed. Finished games can be replayed and exported as PGN.
- Profile: editable name, win rate, streaks and win/draw/loss bars per difficulty.
- Settings: system/light/dark theme, 4 board finishes, sound, animations, coordinates, legal-move hints, auto-queen, data reset.
- Everything is stored on the device (`src/lib/storage.ts`).

## ⚠️ Decision before Milestone 2: which database

The original request asks for **MySQL** with a user-supplied connection string. Netlify's built-in option is **Netlify Database** (managed Postgres). It provisions automatically, has no credentials to copy around, and runs migrations on deploy. Both work with the schema below, which uses Drizzle ORM and the `chess_` table prefix either way.

- **MySQL (as requested):** the connection string is stored as a secret Netlify environment variable (`MYSQL_URL`) and read only by the server. Uses `mysql2` + `drizzle-orm/mysql-core`.
- **Netlify Database:** uses `@netlify/database` + Drizzle. No connection string to manage.

## Milestone 2 — Backend foundation & schema

- Add a Netlify Server (`netlify/server/index.ts`, Hono) that serves `/api/*`. The static SPA keeps serving everything else.
- Tables (all prefixed `chess_`):
  - `chess_users`: id, email (unique), display_name, password_hash or identity id, created_at
  - `chess_sessions`: id, user_id, token_hash, expires_at (only if auth isn't delegated)
  - `chess_settings`: user_id (PK), theme, board_theme, sound, show_legal, show_coords, auto_queen, animations
  - `chess_games`: id, user_id, mode, difficulty, human_color, time_initial, time_increment, white_name, black_name, status (active/finished), result, end_reason, pgn, final_fen, created_at, ended_at
  - `chess_moves`: game_id, ply, san, uci, fen_after, white_ms, black_ms, created_at (PK game_id + ply)
  - `chess_saved_games`: game_id (PK), user_id, fen, clocks_w_ms, clocks_b_ms, updated_at
  - `chess_statistics`: user_id + scope (all / easy / medium / hard / local), wins, losses, draws, current_streak, best_streak, updated_at
- Input validation with Zod on every route, consistent JSON error shape, rate limiting on auth routes.

## Milestone 3 — Accounts & authentication

- Sign up, log in, log out and password reset. Netlify Identity is the lowest-effort option. The alternative is self-managed email + password (argon2 hashes, HTTP-only secure session cookies in `chess_sessions`).
- Profile screen becomes account-backed. Guests can keep playing locally.

## Milestone 4 — Cloud sync

- Swap the functions in `src/lib/storage.ts` for API calls (`GET/PUT /api/settings`, `POST /api/games`, `POST /api/games/:id/moves`, `GET /api/saved`, `GET /api/stats`).
- The server replays every move with chess.js to validate it before storing it, and computes statistics itself instead of trusting the client.
- On first sign-in, offer to import the games and stats already saved on the device.

## Milestone 5 — Online multiplayer

- WebSocket rooms on the Netlify Server: invite links, then rated matchmaking.
- Server-authoritative clocks and move validation; new `chess_matches` and `chess_ratings` tables.
- Wire up the lobby preview on the landing page (currently fixture data in `src/data/fixtures.ts`).

## Milestone 6 — Polish

- Installable PWA with offline play, haptics on mobile, premove, opening names in the move list, and post-game hints from the engine.
