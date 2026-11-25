/**
 * Static showcase content. Everything here is presentation data only;
 * real player data lives in src/lib/storage.ts (and later, the API).
 */

/** Paul Morphy vs. Duke Karl / Count Isouard, Paris 1858 — the "Opera Game". */
export const HERO_GAME = {
  title: "The Opera Game",
  caption: "Morphy vs. Duke Karl & Count Isouard · Paris, 1858",
  moves: "e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#".split(" "),
};

export const DIFFICULTY_INFO = {
  easy: { blurb: "Relaxed and forgiving. Makes human mistakes.", rating: "~800" },
  medium: { blurb: "Solid tactics, punishes loose pieces.", rating: "~1300" },
  hard: { blurb: "Deep search. Calculates every capture.", rating: "~1700" },
} as const;

/** Preview of the planned online lobby (not live yet — see PLAN.md). */
export const ONLINE_PREVIEW = [
  { name: "Mira K.", rating: 1842, tc: "5 + 0", flag: "🇩🇪" },
  { name: "Tomás R.", rating: 1610, tc: "10 + 0", flag: "🇦🇷" },
  { name: "Aiko S.", rating: 2015, tc: "3 + 2", flag: "🇯🇵" },
  { name: "Dev P.", rating: 1477, tc: "15 + 10", flag: "🇮🇳" },
];

export const FEATURES = [
  { icon: "cpu", title: "Three-level AI", text: "An engine that thinks in a background thread, from gentle to relentless." },
  { icon: "users", title: "Pass & play", text: "Two players, one device. Flip the board and hand it over." },
  { icon: "clock", title: "Real clocks", text: "Bullet to classical, with increments and low-time warnings." },
  { icon: "games", title: "Save & resume", text: "Every unfinished game is kept automatically, clock and all." },
  { icon: "user", title: "Your record", text: "Wins, losses, draws and streaks for every difficulty." },
  { icon: "moon", title: "Light & dark", text: "Four board finishes, synthesised sounds, smooth motion." },
];
